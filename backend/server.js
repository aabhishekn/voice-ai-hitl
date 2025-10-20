import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

// ---------------- In-memory stores (swap to Firestore/Mongo later) ----------------
const knowledge = new Map([
  ["what are your hours", "We’re open 9 AM – 6 PM, Monday through Saturday."],
  ["where are you located", "We’re at 123 Main Street, near Central Plaza."]
]);

const helpRequests = new Map(); // id -> object

function normalize(text = "") {
  return text.toLowerCase().trim();
}

function findAnswer(question) {
  const q = normalize(question);
  for (const [k, v] of knowledge.entries()) {
    if (q.includes(k)) return v;       // keyword match
  }
  if (knowledge.has(q)) return knowledge.get(q); // exact match
  return null;
}

// -------- LiveKit token for browser client (required for joining a room) --------
app.post("/api/livekit-token", async (req, res) => {
  const { identity } = req.body || {};
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: "Missing LiveKit env vars" });
  }
  if (!identity) return res.status(400).json({ error: "identity required" });

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
    at.addGrant({ roomJoin: true, room: "frontdesk-demo" });
    const token = await at.toJwt();
    res.json({ url: LIVEKIT_URL, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "token_error" });
  }
});

// ---------------------- AI Ask endpoint: HITL core logic ----------------------
app.post("/api/ask", (req, res) => {
  const { customerId = "anon", question = "" } = req.body || {};
  const known = findAnswer(question);

  if (known) {
    return res.json({ status: "answered", answer: known });
  }

  // Unknown → escalate
  const id = uuid();
  const item = {
    id,
    customerId,
    question,
    status: "pending",
    createdAt: Date.now()
  };
  helpRequests.set(id, item);

  // Simulated "text to supervisor"
  console.log(`[Notify Supervisor] Hey, I need help answering: "${question}" (id: ${id})`);

  // Required phrase from the PDF
  const escalationLine = "Let me check with my supervisor and get back to you.";

  return res.json({
    status: "escalated",
    requestId: id,
    message: escalationLine
  });
});

// List requests (supervisor dashboard)
app.get("/api/help-requests", (_req, res) => {
  const items = Array.from(helpRequests.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ items });
});

// Supervisor resolves / marks unresolved
app.patch("/api/help-requests/:id", (req, res) => {
  const item = helpRequests.get(req.params.id);
  if (!item) return res.status(404).json({ error: "not_found" });

  const { answer, status } = req.body || {};
  if (answer) {
    item.answer = answer;
    item.status = "resolved";
    item.resolvedAt = Date.now();
    helpRequests.set(item.id, item);

    // Learn
    knowledge.set(normalize(item.question), answer);

    // Immediate follow-up (frontend will do TTS)
    console.log(`[AI Follow-up -> ${item.customerId}] ${answer}`);
  } else if (status === "unresolved") {
    item.status = "unresolved";
    helpRequests.set(item.id, item);
  }

  res.json(item);
});

// Learned answers
app.get("/api/knowledge", (_req, res) => {
  const items = Array.from(knowledge.entries()).map(([q, a]) => ({ question: q, answer: a }));
  res.json({ items });
});

// Timeout worker: mark pending > 10m as unresolved
setInterval(() => {
  const now = Date.now();
  const TEN_MIN = 10 * 60 * 1000;
  for (const item of helpRequests.values()) {
    if (item.status === "pending" && now - item.createdAt > TEN_MIN) {
      item.status = "unresolved";
      helpRequests.set(item.id, item);
      console.log(`[Timeout] Request ${item.id} marked unresolved`);
    }
  }
}, 30 * 1000);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
