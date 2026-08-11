"use client";

/**
 * ConsensusPanel — honesty contract: renders ONLY what the protocol enforces.
 * The equivalence rule pins verdict + completion_bucket + evidence_sufficient;
 * those are shown as "agreed under consensus". confidence/reason are labeled
 * advisory. No validator identities or counts are invented.
 */
import type { EvaluationView } from "@/lib/chain/types";
import { AdvisoryBadge } from "./badges";

export function ConsensusPanel({ evaluation }: { evaluation: EvaluationView }) {
  const j = evaluation.judgment;
  const pinned = [
    { k: "verdict", v: j.verdict },
    { k: "completion_bucket", v: `${j.completion_bucket}%` },
    { k: "evidence_sufficient", v: String(j.evidence_sufficient) },
  ];
  return (
    <div className="g-card">
      <div className="g-eyebrow mb-2">Validator consensus</div>
      <p className="g-caption">
        This judgment survived GenLayer&apos;s consensus round: independent
        validators re-ran the same fetch-and-judge task and were required to
        agree on every field below before it could touch state.
      </p>
      <div className="mt-3 grid gap-1.5">
        {pinned.map((f) => (
          <div
            key={f.k}
            className="flex items-center justify-between rounded px-3 py-2"
            style={{ background: "var(--paper)", border: "1px solid var(--grid-line)" }}
          >
            <span className="g-mono text-[13px]">{f.k}</span>
            <span className="g-mono text-[13px] font-semibold">{f.v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--grid-line)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="g-mono text-[13px]" style={{ color: "var(--annotate)" }}>
            confidence — {j.confidence}
          </span>
          <AdvisoryBadge />
        </div>
        {j.reason ? <p className="g-caption mt-2">“{j.reason}”</p> : null}
        <p className="g-annotate mt-2">
          Validator identities and vote counts are protocol-internal on
          StudioNet; GroundTruth does not fabricate them.
        </p>
      </div>
    </div>
  );
}
