import React, { useRef, useState } from "react";
import { connect, createLocalAudioTrack, RoomEvent } from "livekit-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel(); // stop any previous speech
  window.speechSynthesis.speak(msg);
}

export default function VoiceCall() {
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState(() => `caller-${Math.floor(Math.random() * 10000)}`);
  const [transcript, setTranscript] = useState("");
  const roomRef = useRef(null);
  const recRef = useRef(null);

  async function joinRoom() {
    try {
      const r = await fetch(`${API_BASE}/api/livekit-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity })
      });
      const { url, token, error } = await r.json();
      if (error) throw new Error(error);

      const room = await connect(url, token);
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, (p) => console.log("participant connected:", p.identity));
      room.on(RoomEvent.Disconnected, () => { console.log("disconnected"); setConnected(false); });

      // publish microphone
      const mic = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(mic);

      setConnected(true);
    } catch (e) {
      console.error(e);
      alert("Failed to join LiveKit room. Check backend/.env and restart backend.");
    }
  }

  function leaveRoom() {
    roomRef.current?.disconnect();
    setConnected(false);
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
        }).then(x => x.json());

        if (resp.status === "answered") {
          speak(resp.answer);
        } else if (resp.status === "escalated") {
          // exact phrase required by the PDF is provided by backend
          speak(resp.message);
        } else {
          speak("Sorry, something went wrong.");
        }
      } catch (err) {
        console.error(err);
        speak("Sorry, I could not process your question.");
      }
    };

    rec.onerror = (e) => console.error("STT error", e);
    rec.onend = () => { recRef.current = null; };

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
      <p style={{ marginTop: 8, color: "#555" }}>
        Demo: Join the room → click “Ask by Voice” → say “What are your hours?” (known) or an unknown to trigger escalation, then resolve it in Supervisor and ask again.
      </p>
    </div>
  );
}
