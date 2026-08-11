import "server-only";
import { adminDb } from "./firebaseAdmin";
import {
  createFirestoreNonces,
  createMemoryNonces,
  type NonceStore,
} from "./nonces";
import {
  createFirestoreMirror,
  createMemoryMirror,
  type MirrorStore,
} from "./store";

/**
 * Singleton store selection: Firestore when configured, memory otherwise.
 * Route handlers import from here so the choice lives in one place.
 */

let nonces: NonceStore | undefined;
let mirror: MirrorStore | undefined;

export function nonceStore(): NonceStore {
  if (!nonces) {
    const db = adminDb();
    nonces = db ? createFirestoreNonces(db) : createMemoryNonces();
  }
  return nonces;
}

export function mirrorStore(): MirrorStore {
  if (!mirror) {
    const db = adminDb();
    mirror = db ? createFirestoreMirror(db) : createMemoryMirror();
  }
  return mirror;
}
