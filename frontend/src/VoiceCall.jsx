import React, { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, createLocalAudioTrack } from "livekit-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const PERSIST_KEY = "frontdesk:lastPendingId";

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

export default function VoiceCall() {
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState(() => `caller-${Math.floor(Math.random() * 10000)}`);
  const [transcript, setTranscript] = useState("");
  const roomRef = useRef(null);
  const recRef = useRef(null);

  // Track last escalated request (persist in localStorage)
  const [lastPendingId, setLastPendingId] = useState(() => {
    return localStorage.getItem(PERSIST_KEY) || null;
  });
  const pollRef = useRef(null);

  // Join LiveKit
  async function joinRoom() {
    try {
      const r = await fetch(`${API_BASE}/api/livekit-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity })
      });
      const { url, token, error } = await r.json();
      if (error) throw new Error(error);

      const room = new Room();
      await room.connect(url, token);
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, (p) => console.log("participant connected:", p.identity));
      room.on(RoomEvent.Disconnected, () => {
        console.log("disconnected");
        setConnected(false);
      });

      const mic = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(mic);

      setConnected(true);
    } catch (e) {
      console.error(e);
      alert("Failed to join LiveKit room. Check backend/.env (wss URL, API key/secret) and restart backend.");
    }
  }

  function leaveRoom() {
    try {
      roomRef.current?.disconnect();
    } finally {
      setConnected(false);
      stopPolling();
    }
  }

  // Persist lastPendingId whenever it changes
  useEffect(() => {
    if (lastPendingId) {
      localStorage.setItem(PERSIST_KEY, lastPendingId);
    } else {
      localStorage.removeItem(PERSIST_KEY);
    }
  }, [lastPendingId]);

  // Poll for supervisor follow-up on pending request
  useEffect(() => {
    if (!lastPendingId) return;
    if (pollRef.current) return;

    async function checkFollowup() {
      try {
        const resp = await fetch(`${API_BASE}/api/help-requests`).then((r) => r.json());
        const list = resp.items || [];
        const item = list.find((it) => it.id === lastPendingId);
        if (!item) return; // might have been cleared by server restart

        if (item.status === "resolved" && item.answer) {
          speak(item.answer);               // proactive follow-up
          setLastPendingId(null);
          stopPolling();
        } else if (item.status === "unresolved") {
          setLastPendingId(null);           // give up waiting
          stopPolling();
        }
      } catch (e) {
        console.error("follow-up poll failed", e);
      }
    }

    pollRef.current = setInterval(checkFollowup, 2000);
    // run once immediately to be snappy
    checkFollowup();

    return () => stopPolling();
  }, [lastPendingId]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startSTT() {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Web Speech API not supported in this browser (use Chrome).");
      return;
    }
    const Recognition = window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = async (e) => {
      const said = e.results[0][0].transcript;
      setTranscript(said);

      try {
        const resp = await fetch(`${API_BASE}/api/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: identity, question: said })
        }).then((x) => x.json());

        if (resp.status === "answered") {
          speak(resp.answer);
        } else if (resp.status === "escalated") {
          // required escalation phrase
          speak(resp.message);
          if (resp.requestId) {
            setLastPendingId(resp.requestId); // persists to localStorage via effect
          }
        } else {
          speak("Sorry, something went wrong.");
        }
      } catch (err) {
        console.error(err);
        speak("Sorry, I could not process your question.");
      }
    };

    rec.onerror = (e) => console.error("STT error", e);
    rec.onend = () => {
      recRef.current = null;
    };

    recRef.current = rec;
    rec.start();
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h2>Voice Call (LiveKit)</h2>
      <div style={{ marginBottom: 8 }}>
        <label>
          Your Identity:&nbsp;
          <input value={identity} onChange={(e) => setIdentity(e.target.value)} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {!connected ? (
          <button onClick={joinRoom}>Join LiveKit Room</button>
        ) : (
          <button onClick={leaveRoom}>Leave</button>
        )}
        <button onClick={startSTT} disabled={!connected}>🎙️ Ask by Voice</button>
      </div>
      <div><b>Last transcript:</b> {transcript || <i>(none)</i>}</div>
      {lastPendingId && (
        <div style={{ marginTop: 8, color: "#444" }}>
          Waiting for supervisor response… (request {lastPendingId.slice(0, 8)})
        </div>
      )}
      <p style={{ marginTop: 8, color: "#555" }}>
        Demo: ask an unknown → AI escalates, then resolve it in Supervisor — the AI will speak the follow-up automatically (even if you switched tabs).
      </p>
    </div>
  );
}
