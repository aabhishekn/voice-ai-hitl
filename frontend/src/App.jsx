import React, { useState } from "react";
import Supervisor from "./Supervisor.jsx";

export default function App() {
  const [tab, setTab] = useState("supervisor");
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Frontdesk HITL (Phase 1)</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("supervisor")} style={{ padding: "8px 12px" }}>
          Supervisor Dashboard
        </button>
      </div>
      {tab === "supervisor" && <Supervisor />}
    </div>
  );
}
