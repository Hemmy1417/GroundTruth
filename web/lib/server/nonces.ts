import "server-only";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Single-use SIWE nonces. Firestore-backed in production because Vercel
 * serverless instances share nothing — an in-memory nonce issued on one
 * instance would be unknown to the instance that verifies it. Memory impl
 * covers tests and single-process dev. Consume is atomic (transaction /
 * map delete) so a replayed message dies regardless of signature validity.
 */

const NONCE_TTL_MS = 10 * 60 * 1000;

export interface NonceStore {
  issue(nonce: string, now?: number): Promise<void>;
  consume(nonce: string, now?: number): Promise<boolean>;
}

export function createMemoryNonces(): NonceStore {
  const nonces = new Map<string, number>(); // nonce -> expiresAt
  return {
    async issue(nonce, now = Date.now()) {
      nonces.set(nonce, now + NONCE_TTL_MS);
    },
    async consume(nonce, now = Date.now()) {
      const exp = nonces.get(nonce);
      nonces.delete(nonce); // single-use: gone on first touch, valid or not
      return exp !== undefined && now <= exp;
    },
  };
}

export function createFirestoreNonces(db: Firestore): NonceStore {
  const col = db.collection("siweNonces");
  return {
    async issue(nonce, now = Date.now()) {
      await col.doc(nonce).set({ expiresAt: now + NONCE_TTL_MS });
    },
    async consume(nonce, now = Date.now()) {
      return db.runTransaction(async (tx) => {
        const ref = col.doc(nonce);
        const snap = await tx.get(ref);
        if (!snap.exists) return false;
        const exp = (snap.data() as { expiresAt?: number }).expiresAt ?? 0;
        tx.delete(ref); // consumed either way — single-use
        return now <= exp;
      });
    },
  };
}
