import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

/**
 * Supported ways to provide credentials (first one found wins):
 * 1) FIREBASE_SERVICE_ACCOUNT_JSON   → full JSON string (escaped, single line)
 * 2) FIREBASE_SERVICE_ACCOUNT_B64    → base64-encoded JSON (recommended on Windows)
 * 3) FIREBASE_SERVICE_ACCOUNT_FILE   → path to JSON file on disk
 */

function loadServiceAccount() {
  // 1) JSON string
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
    }
  }

  // 2) Base64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const buf = Buffer.from(b64, "base64");
      return JSON.parse(buf.toString("utf8"));
    } catch (e) {
      console.error("[firebase] Failed to decode FIREBASE_SERVICE_ACCOUNT_B64:", e.message);
    }
  }

  // 3) File path
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  if (file && fs.existsSync(file)) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("[firebase] Failed to read FIREBASE_SERVICE_ACCOUNT_FILE:", e.message);
    }
  }

  return null;
}

const serviceAccount = loadServiceAccount();

if (serviceAccount) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[firebase] initialized");
    }
  } catch (e) {
    console.error("[firebase] initialization error:", e.message);
  }
} else {
  console.warn("[firebase] No service account credentials found. Firestore not initialized.");
}

export const db = admin.apps.length ? admin.firestore() : null;
