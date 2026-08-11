"use client";

/**
 * SettlementCard — the deterministic ending, or the honest preview of it.
 * "Consensus judged the completion. This table did the rest."
 */
import type { AgreementView, EvaluationView } from "@/lib/chain/types";
import { formatGen, formatEpochTime, pct } from "@/lib/format";
import { RulePill } from "./badges";

export function SettlementCard({
  agreement,
  finalEval,
}: {
  agreement: AgreementView;
  finalEval: EvaluationView | null;
}) {
  const s = agreement.settlement;
  if (!s.settled) return null;
  return (
    <div className="g-card" style={{ borderTop: "3px solid var(--verify)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="g-eyebrow">Settlement</div>
        <RulePill rule={s.rule} />
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="g-annotate">payee received</div>
          <div className="g-mono font-semibold text-[17px]">{formatGen(s.payee_atto)} GEN</div>
        </div>
        <div>
          <div className="g-annotate">payer refunded</div>
          <div className="g-mono font-semibold text-[17px]">{formatGen(s.payer_atto)} GEN</div>
        </div>
        <div>
          <div className="g-annotate">keeper bounty</div>
          <div className="g-mono font-semibold text-[17px]">{formatGen(s.keeper_atto)} GEN</div>
        </div>
        <div>
          <div className="g-annotate">settled</div>
          <div className="g-mono text-[15px]">{formatEpochTime(s.settled_at)}</div>
        </div>
      </div>
      <p className="g-annotate mt-3">
        {s.rule === "NEGOTIATED"
          ? "Settled by mutual agreement — no panel needed. The panel's existence is what made honest negotiation rational."
          : finalEval
            ? `Consensus judged ${finalEval.judgment.completion_bucket}% against a ${pct(agreement.threshold_bps)} release threshold${agreement.floor_bps > 0 ? ` and ${pct(agreement.floor_bps)} floor` : ""}. Policy v${s.policy_version} did the rest — no model authored an amount.`
            : `Policy v${s.policy_version} — deterministic split.`}
      </p>
    </div>
  );
}
