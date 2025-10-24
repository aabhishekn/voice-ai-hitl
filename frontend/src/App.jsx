import React, { useState } from "react";
import VoiceCall from "./VoiceCall.jsx";
import Supervisor from "./Supervisor.jsx";

export default function App() {
  const [tab, setTab] = useState("voice");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Frontdesk HITL (LiveKit Voice + Supervisor)</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab("voice")}
          style={{ padding: "8px 12px", fontWeight: tab === "voice" ? 700 : 400 }}
        >
          Voice Call
        </button>
        <button
          onClick={() => setTab("supervisor")}
          style={{ padding: "8px 12px", fontWeight: tab === "supervisor" ? 700 : 400 }}
        >
          Supervisor Dashboard
        </button>
      </div>

      {/* Keep both mounted; just hide the inactive one */}
      <div style={{ display: tab === "voice" ? "block" : "none" }}>
        <VoiceCall />
      </div>
      <div style={{ display: tab === "supervisor" ? "block" : "none" }}>
        <Supervisor />
      </div>
    </div>
  );
}
