import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

// Expect FIREBASE_SERVICE_ACCOUNT_JSON to be a full JSON string
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
if (!raw) {
  console.warn("[firebase] FIREBASE_SERVICE_ACCOUNT_JSON not set. Firestore will not initialize.");
} else {
  try {
    const serviceAccount = JSON.parse(raw);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[firebase] initialized");
    }
  } catch (e) {
    console.error("[firebase] failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
  }
}

// Export db (may be undefined if not initialized)
export const db = admin.apps.length ? admin.firestore() : null;
