import "server-only";
import type { ChainReader } from "./chainReader";
import type { MirrorStore } from "./store";

/**
 * Chain → Firestore reconciler. Idempotent: walks ids from the stored cursor
 * to the chain's current totals, upserting each row; ALSO re-mirrors a
 * caller-hinted agreement (its state machine moves without new ids —
 * disputes, settlement). Safe to call concurrently or repeatedly; the mirror
 * converges on chain truth.
 */

export async function reconcile(
  reader: ChainReader,
  store: MirrorStore,
  opts: { touchAgreementId?: number } = {},
): Promise<{ agreements: number; evaluations: number; evidence: number }> {
  const stats = await reader.stats();
  const cursor = await store.getCursor();
  const synced = { agreements: 0, evaluations: 0, evidence: 0 };

  for (let id = cursor.agreements + 1; id <= stats.agreements; id++) {
    const a = await reader.agreement(id);
    if (a) {
      await store.upsertAgreement(a);
      synced.agreements++;
    }
  }
  for (let id = cursor.evaluations + 1; id <= stats.evaluations; id++) {
    const e = await reader.evaluation(id);
    if (e) {
      await store.upsertEvaluation(e);
      synced.evaluations++;
      // an evaluation always mutates its agreement (state, latest ids)
      const a = await reader.agreement(e.agreement_id);
      if (a) await store.upsertAgreement(a);
    }
  }
  for (let id = cursor.evidence + 1; id <= stats.evidence; id++) {
    const ev = await reader.evidence(id);
    if (ev) {
      await store.upsertEvidence(ev);
      synced.evidence++;
    }
  }

  if (opts.touchAgreementId) {
    const a = await reader.agreement(opts.touchAgreementId);
    if (a) await store.upsertAgreement(a);
  }

  await store.setCursor({
    agreements: Math.max(cursor.agreements, stats.agreements),
    evaluations: Math.max(cursor.evaluations, stats.evaluations),
    evidence: Math.max(cursor.evidence, stats.evidence),
  });
  return synced;
}
