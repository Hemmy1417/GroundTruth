import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import type {
  AgreementView,
  EvaluationView,
  EvidenceView,
} from "../chain/types";

/**
 * Read-model store — a MIRROR of authoritative chain state (docs/ARCHITECTURE
 * §7). Written only by the reconciler; the client reads Firestore directly
 * (realtime) or falls back to chain-direct. Deleting every row loses nothing.
 *
 * Two implementations, one contract: Firestore (production) and memory
 * (tests + credential-less dev).
 */

export interface MirrorStore {
  upsertAgreement(a: AgreementView): Promise<void>;
  upsertEvaluation(e: EvaluationView): Promise<void>;
  upsertEvidence(e: EvidenceView): Promise<void>;
  getAgreement(id: number): Promise<AgreementView | null>;
  listAgreements(): Promise<AgreementView[]>;
  /** Reconcile bookkeeping — highest chain ids already mirrored. */
  getCursor(): Promise<{ agreements: number; evaluations: number; evidence: number }>;
  setCursor(c: { agreements: number; evaluations: number; evidence: number }): Promise<void>;
}

// ── memory ───────────────────────────────────────────────────────────────────

export function createMemoryMirror(): MirrorStore {
  const agreements = new Map<number, AgreementView>();
  const evaluations = new Map<number, EvaluationView>();
  const evidence = new Map<number, EvidenceView>();
  let cursor = { agreements: 0, evaluations: 0, evidence: 0 };
  return {
    async upsertAgreement(a) {
      agreements.set(a.id, { ...a });
    },
    async upsertEvaluation(e) {
      evaluations.set(e.id, { ...e });
    },
    async upsertEvidence(e) {
      evidence.set(e.id, { ...e });
    },
    async getAgreement(id) {
      return agreements.get(id) ?? null;
    },
    async listAgreements() {
      return [...agreements.values()].sort((a, b) => b.id - a.id);
    },
    async getCursor() {
      return { ...cursor };
    },
    async setCursor(c) {
      cursor = { ...c };
    },
  };
}

// ── firestore ────────────────────────────────────────────────────────────────

export function createFirestoreMirror(db: Firestore): MirrorStore {
  return {
    async upsertAgreement(a) {
      await db.collection("agreements").doc(String(a.id)).set(a, { merge: false });
    },
    async upsertEvaluation(e) {
      await db.collection("evaluations").doc(String(e.id)).set(e, { merge: false });
    },
    async upsertEvidence(e) {
      await db.collection("evidence").doc(String(e.id)).set(e, { merge: false });
    },
    async getAgreement(id) {
      const snap = await db.collection("agreements").doc(String(id)).get();
      return snap.exists ? (snap.data() as AgreementView) : null;
    },
    async listAgreements() {
      const snap = await db.collection("agreements").orderBy("id", "desc").limit(100).get();
      return snap.docs.map((d) => d.data() as AgreementView);
    },
    async getCursor() {
      const snap = await db.collection("meta").doc("reconcile").get();
      const d = snap.data() as { agreements?: number; evaluations?: number; evidence?: number } | undefined;
      return {
        agreements: d?.agreements ?? 0,
        evaluations: d?.evaluations ?? 0,
        evidence: d?.evidence ?? 0,
      };
    },
    async setCursor(c) {
      await db.collection("meta").doc("reconcile").set(c);
    },
  };
}
