import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { serverEnv } from "./env";

/**
 * Firebase Admin singleton. Credential-less environments get `null` (memory
 * store takes over) — never a crash. The service account arrives base64-encoded
 * in FIREBASE_SERVICE_ACCOUNT_B64 (single env var, no JSON-in-env quoting
 * hazards); it exists only server-side.
 */

let app: App | null | undefined;

export function adminDb(): Firestore | null {
  if (app === undefined) {
    const { firebaseServiceAccountB64 } = serverEnv();
    if (!firebaseServiceAccountB64) {
      app = null;
    } else {
      try {
        const json = JSON.parse(
          Buffer.from(firebaseServiceAccountB64, "base64").toString("utf8"),
        );
        app =
          getApps()[0] ??
          initializeApp({ credential: cert(json) });
      } catch (err) {
        console.error("[firebaseAdmin] bad service account, running memory-only:", err);
        app = null;
      }
    }
  }
  return app ? getFirestore(app) : null;
}
