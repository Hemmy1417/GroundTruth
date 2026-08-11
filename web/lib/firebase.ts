"use client";

/**
 * Client Firestore — realtime ONLY (the dispute room + agreement file
 * live-refresh). Reads are public per firestore.rules; the client never
 * writes. Unconfigured environments no-op: chain-direct reads are always
 * the fallback and the authority.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";

export const FIREBASE_ENABLED = Boolean(API_KEY && PROJECT_ID && APP_ID);

let app: FirebaseApp | null = null;
function db(): Firestore | null {
  if (!FIREBASE_ENABLED) return null;
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({ apiKey: API_KEY, projectId: PROJECT_ID, appId: APP_ID });
  }
  return getFirestore(app);
}

/**
 * Subscribe to the mirrored agreement doc; fires on every reconcile. Returns
 * an unsubscribe fn — a no-op when Firebase is unconfigured.
 */
export function subscribeAgreement(
  id: number,
  onChange: () => void,
): () => void {
  const d = db();
  if (!d) return () => {};
  return onSnapshot(
    doc(d, "agreements", String(id)),
    () => onChange(),
    () => {}, // permission/network errors are non-fatal — polling covers us
  );
}
