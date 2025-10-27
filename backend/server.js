import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";
import { db } from "./firebase.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!db) {
  console.warn("[server] Firestore not initialized. Check FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env");
}

// ---------------- Helpers ----------------
function normalize(text = "") {
  return text.toLowerCase().trim();
}

const HELP_REQS = db ? db.collection("help_requests") : null;
const KB = db ? db.collection("knowledge") : null;

async function kbFindAnswer(question) {
  if (!db) return null;
  const q = normalize(question);

  // exact match first (KB doc id = normalized question)
  const exact = await KB.doc(q).get();
  if (exact.exists) return exact.data().answer;

  // fallback: simple keyword containment scan (fine for demo size)
  const snap = await KB.limit(500).get();
  for (const doc of snap.docs) {
    const key = doc.id;
    if (q.includes(key)) return doc.data().answer;
  }
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

// ---------------------- AI Ask endpoint: Firestore + de-dupe ----------------------
app.post("/api/ask", async (req, res) => {
  if (!db) return res.status(500).json({ error: "firestore_not_initialized" });

  const { customerId = "anon", question = "" } = req.body || {};

  // 1) Try knowledge base
  const known = await kbFindAnswer(question);
  if (known) {
    return res.json({ status: "answered", answer: known });
  }

  // 2) De-dupe: same customer + same normalized question, pending, created within 60s
  const DEDUPE_MS = 60 * 1000;
  const now = Date.now();
  const qNorm = normalize(question);

  const dupSnap = await HELP_REQS
    .where("customerId", "==", customerId)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  let existing = null;
  dupSnap.forEach(d => {
    const it = d.data();
    if (normalize(it.question) === qNorm && now - it.createdAt <= DEDUPE_MS) {
      existing = { id: d.id, ...it };
    }
  });

  const escalationLine = "Let me check with my supervisor and get back to you.";

  if (existing) {
    return res.json({
      status: "escalated",
      requestId: existing.id,
      message: escalationLine,
      deduped: true
    });
  }

  // 3) Create new pending request
  const docRef = await HELP_REQS.add({
    customerId,
    question,
    status: "pending",
    createdAt: now
  });

  console.log(`[Notify Supervisor] Hey, I need help answering: "${question}" (id: ${docRef.id})`);

  return res.json({
    status: "escalated",
    requestId: docRef.id,
    message: escalationLine,
    deduped: false
  });
});

// ---------------------------- Supervisor dashboard APIs ----------------------------
app.get("/api/help-requests", async (_req, res) => {
  if (!db) return res.json({ items: [] });

  const snap = await HELP_REQS.orderBy("createdAt", "desc").limit(200).get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
});

app.patch("/api/help-requests/:id", async (req, res) => {
  if (!db) return res.status(500).json({ error: "firestore_not_initialized" });

  const ref = HELP_REQS.doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: "not_found" });

  const data = doc.data();
  const { answer, status } = req.body || {};

  if (answer) {
    const resolvedAt = Date.now();
    await ref.update({ answer, status: "resolved", resolvedAt });

    // Learn (upsert into Knowledge by normalized question)
    const key = normalize(data.question);
    await KB.doc(key).set({ answer, updatedAt: resolvedAt }, { merge: true });

    // Immediate follow-up (frontend polls; we log for visibility)
    console.log(`[AI Follow-up -> ${data.customerId}] ${answer}`);

    const updated = (await ref.get()).data();
    return res.json({ id: ref.id, ...updated });
  }

  if (status === "unresolved") {
    await ref.update({ status: "unresolved" });
    const updated = (await ref.get()).data();
    return res.json({ id: ref.id, ...updated });
  }

  // No change: return current
  return res.json({ id: ref.id, ...data });
});

app.get("/api/knowledge", async (_req, res) => {
  if (!db) return res.json({ items: [] });

  const snap = await KB.limit(500).get();
  const items = snap.docs.map(d => ({ question: d.id, answer: d.data().answer }));
  res.json({ items });
});

// ---------------------------- Timeout worker ----------------------------
// Mark pending > 10 minutes as unresolved
setInterval(async () => {
  if (!db) return;
  try {
    const now = Date.now();
    const TEN_MIN = 10 * 60 * 1000;

    const snap = await HELP_REQS.where("status", "==", "pending").get();

    const batch = db.batch();
    let updates = 0;
    snap.forEach(doc => {
      const it = doc.data();
      if (now - it.createdAt > TEN_MIN) {
        batch.update(doc.ref, { status: "unresolved" });
        updates++;
        console.log(`[Timeout] Request ${doc.id} marked unresolved`);
      }
    });

    if (updates > 0) await batch.commit();
  } catch (e) {
    console.error("[timeout worker] error", e);
  }
}, 30 * 1000);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
