import React, { useState } from "react";
import VoiceCall from "./VoiceCall.jsx";
import Supervisor from "./Supervisor.jsx";

export default function App() {
  const [tab, setTab] = useState("voice");
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Frontdesk HITL (LiveKit Voice + Supervisor)</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("voice")} style={{ padding: "8px 12px" }}>Voice Call</button>
        <button onClick={() => setTab("supervisor")} style={{ padding: "8px 12px" }}>Supervisor Dashboard</button>
      </div>
      {tab === "voice" ? <VoiceCall /> : <Supervisor />}
    </div>
  );
}
