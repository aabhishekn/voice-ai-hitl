import React, { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export default function Supervisor() {
  const [items, setItems] = useState([]);
  const [kb, setKb] = useState([]);

  async function load() {
    const r = await fetch(`${API_BASE}/api/help-requests`).then(r => r.json());
    const k = await fetch(`${API_BASE}/api/knowledge`).then(r => r.json());
    setItems(r.items || []);
    setKb(k.items || []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  async function resolve(id) {
    const input = document.getElementById(`ans-${id}`);
    const answer = input.value.trim();
    if (!answer) return alert("Provide an answer");
    await fetch(`${API_BASE}/api/help-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer })
    });
    input.value = "";
    await load();
  }

  async function markUnresolved(id) {
    await fetch(`${API_BASE}/api/help-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "unresolved" })
    });
    await load();
  }

  const pending = items.filter(i => i.status === "pending");
  const resolved = items.filter(i => i.status === "resolved");
  const unresolved = items.filter(i => i.status === "unresolved");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h2>Pending</h2>
        {pending.length === 0 && <div>No pending requests.</div>}
        {pending.map(item => (
          <div key={item.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <div><b>#{item.id.slice(0,8)}</b> • <i>{item.status}</i></div>
            <div>Customer: {item.customerId}</div>
            <div>Question: {item.question}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input id={`ans-${item.id}`} placeholder="Type answer..." style={{ flex: 1 }} />
              <button onClick={() => resolve(item.id)}>Resolve</button>
              <button onClick={() => markUnresolved(item.id)}>Unresolved</button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h2>Resolved</h2>
        {resolved.length === 0 && <div>None.</div>}
        {resolved.map(item => (
          <div key={item.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <div><b>#{item.id.slice(0,8)}</b> • <i>{item.status}</i></div>
            <div>Customer: {item.customerId}</div>
            <div>Question: {item.question}</div>
            <div>Answer: {item.answer}</div>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h2>Unresolved</h2>
        {unresolved.length === 0 && <div>None.</div>}
        {unresolved.map(item => (
          <div key={item.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginBottom: 8 }}>
            <div><b>#{item.id.slice(0,8)}</b> • <i>{item.status}</i></div>
            <div>Customer: {item.customerId}</div>
            <div>Question: {item.question}</div>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <h2>Learned Answers</h2>
        {kb.length === 0 && <div>None yet.</div>}
        <ul>
          {kb.map((it, idx) => (
            <li key={idx}>"{it.question}" → {it.answer}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
