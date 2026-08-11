import { describe, it, expect } from "vitest";
import { reconcile } from "../lib/server/reconcile";
import { createMemoryMirror } from "../lib/server/store";
import type { ChainReader } from "../lib/server/chainReader";
import type { AgreementView, EvaluationView, EvidenceView, StatsView } from "../lib/chain/types";

function agreement(id: number, state: AgreementView["state"] = "FUNDED"): AgreementView {
  return {
    id, payer: "0x" + "1".repeat(40), payee: "0x" + "2".repeat(40),
    title: `Agreement ${id}`, question: "Done?", metric: "completion",
    threshold_bps: 9000, floor_bps: 6000, deadline: 1_800_000_000,
    sources: ["https://a.example"], amount_atto: "3000000000000000000",
    state, created_at: 1_790_000_000, evaluation_ids: [], latest_eval_id: 0,
    dispute: { state: "NONE", challenger: "", statement: "", bond_atto: "0",
      filed_at: 0, reassess_eval_id: 0, window_ends: 0, terminal_at: 0 },
    settlement: { settled: false, payee_atto: "0", payer_atto: "0", rule: "",
      policy_version: 1, settled_at: 0 },
  };
}

function fakeReader(data: {
  stats: StatsView;
  agreements?: Record<number, AgreementView>;
  evaluations?: Record<number, EvaluationView>;
  evidence?: Record<number, EvidenceView>;
}): ChainReader & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    async stats() { reads.push("stats"); return data.stats; },
    async agreement(id) { reads.push(`a${id}`); return data.agreements?.[id] ?? null; },
    async evaluation(id) { reads.push(`e${id}`); return data.evaluations?.[id] ?? null; },
    async evidence(id) { reads.push(`v${id}`); return data.evidence?.[id] ?? null; },
  };
}

const stats = (n: Partial<StatsView>): StatsView => ({
  agreements: 0, evaluations: 0, evidence: 0,
  escrow_held_atto: "0", bonds_held_atto: "0", settled_total_atto: "0", ...n,
});

describe("reconciler", () => {
  it("mirrors new ids from the cursor and advances it", async () => {
    const store = createMemoryMirror();
    const reader = fakeReader({
      stats: stats({ agreements: 2 }),
      agreements: { 1: agreement(1), 2: agreement(2) },
    });
    const synced = await reconcile(reader, store);
    expect(synced.agreements).toBe(2);
    expect((await store.listAgreements()).map((a) => a.id)).toEqual([2, 1]);
    expect(await store.getCursor()).toMatchObject({ agreements: 2 });
  });

  it("is idempotent — a second run re-reads nothing", async () => {
    const store = createMemoryMirror();
    const reader = fakeReader({
      stats: stats({ agreements: 1 }),
      agreements: { 1: agreement(1) },
    });
    await reconcile(reader, store);
    const before = reader.reads.length;
    await reconcile(reader, store);
    // only the stats read happens again
    expect(reader.reads.length).toBe(before + 1);
  });

  it("touchAgreementId re-mirrors a state change without new ids", async () => {
    const store = createMemoryMirror();
    const a1 = agreement(1);
    const reader = fakeReader({ stats: stats({ agreements: 1 }), agreements: { 1: a1 } });
    await reconcile(reader, store);
    // chain state moves (dispute filed) with no new ids:
    reader.agreement = async (id) =>
      id === 1 ? { ...a1, state: "DISPUTED" as const } : null;
    await reconcile(reader, store, { touchAgreementId: 1 });
    expect((await store.getAgreement(1))?.state).toBe("DISPUTED");
  });
});
