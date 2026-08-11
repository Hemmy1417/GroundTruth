/**
 * Chain view types — THE contract between Phase 4 (backend), Phase 5 (the
 * intelligent contract's view JSON), and Phase 7 (frontend). groundtruth.py
 * implements views returning exactly these shapes as JSON strings:
 *
 *   get_config() · get_stats() · list_agreements(offset, limit) ·
 *   get_agreement(id) · get_evaluation(id) · get_evidence(id)
 *
 * Change here = change there; this file is the single source of the shapes.
 */

export type AgreementState =
  | "FUNDED"
  | "ARMED"
  | "DISPUTED"
  | "SETTLED"
  | "EXPIRED";

export type Verdict = "SATISFIED" | "NOT_SATISFIED" | "INCONCLUSIVE";

export interface JudgmentView {
  verdict: Verdict;
  completion_bucket: number; // 0–100, multiple of 5
  evidence_sufficient: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW"; // advisory
  reason: string; // advisory
}

export interface EvaluationView {
  id: number;
  agreement_id: number;
  kind: "INITIAL" | "REASSESSMENT";
  judged_at: number; // epoch secs
  provisional: boolean; // early NOT_SATISFIED (recorded, non-binding)
  judgment: JudgmentView;
  evidence_ids: number[];
  tx_recorded: boolean;
}

export interface EvidenceView {
  id: number;
  agreement_id: number;
  evaluation_id: number;
  url: string;
  sha256: string; // "" when unreachable
  excerpt: string;
  size: number;
  fetched_at: number;
  status: "OK" | "UNREACHABLE";
  kind: "REGISTERED" | "CHALLENGE";
}

export interface DisputeView {
  state: "NONE" | "OPEN" | "FILED" | "RESOLVED" | "TERMINAL";
  challenger: string;
  statement: string;
  bond_atto: string;
  filed_at: number;
  reassess_eval_id: number; // 0 = none
  window_ends: number; // challenge window end (epoch; 0 = not armed)
  terminal_at: number; // stale-dispute escape becomes callable (0 = n/a)
}

export interface SettlementView {
  settled: boolean;
  payee_atto: string;
  payer_atto: string;
  rule: string; // which table row fired, e.g. "FULL_RELEASE" | "PRO_RATA" | "REFUND"
  policy_version: number;
  settled_at: number;
}

export interface AgreementView {
  id: number;
  payer: string;
  payee: string;
  title: string;
  question: string;
  metric: string;
  threshold_bps: number;
  floor_bps: number;
  deadline: number; // epoch secs
  sources: string[];
  amount_atto: string;
  state: AgreementState;
  created_at: number;
  evaluation_ids: number[];
  latest_eval_id: number; // 0 = none
  dispute: DisputeView;
  settlement: SettlementView;
}

export interface ConfigView {
  owner: string;
  policy_version: number;
  challenge_window_seconds: number;
  dispute_terminal_seconds: number;
  eval_cooldown_seconds: number;
  challenge_bond_atto: string;
  max_sources: number;
}

export interface StatsView {
  agreements: number;
  evaluations: number;
  evidence: number;
  escrow_held_atto: string;
  bonds_held_atto: string;
  settled_total_atto: string;
}

/** Deterministic settlement preview — the same math the contract runs. */
export function settlementPreview(
  amountAtto: bigint,
  bucket: number,
  thresholdBps: number,
  floorBps: number,
): { payee: bigint; payer: bigint; rule: "FULL_RELEASE" | "PRO_RATA" | "REFUND" } {
  const bucketBps = bucket * 100;
  if (bucketBps >= thresholdBps) {
    return { payee: amountAtto, payer: 0n, rule: "FULL_RELEASE" };
  }
  if (floorBps > 0 && bucketBps >= floorBps) {
    const payee = (amountAtto * BigInt(bucketBps)) / 10000n;
    return { payee, payer: amountAtto - payee, rule: "PRO_RATA" };
  }
  return { payee: 0n, payer: amountAtto, rule: "REFUND" };
}
