"use client";

/**
 * EvidenceRegistry — the traceable ledger: per-round source rows with hash
 * stamps and expandable recorded excerpts (exactly what the panel judged).
 * Never displays content it cannot hash-bind.
 */
import { useState } from "react";
import type { EvaluationView, EvidenceView } from "@/lib/chain/types";
import { formatEpochTime } from "@/lib/format";
import { HashStamp } from "./badges";

function EvidenceRow({ e }: { e: EvidenceView }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: "var(--paper)", border: "1px solid var(--grid-line)" }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          aria-label={e.status === "OK" ? "fetched" : "unreachable"}
          style={{
            background: e.status === "OK" ? "var(--verify)" : "var(--dispute)",
          }}
        />
        <span className="text-[13.5px] truncate max-w-[300px]" title={e.url}>
          {e.url}
        </span>
        <HashStamp sha256={e.sha256} />
        {e.kind === "CHALLENGE" ? (
          <span
            className="g-pill"
            style={{ background: "var(--dispute-soft)", color: "var(--dispute)", fontSize: 11 }}
          >
            FILED ON CHALLENGE
          </span>
        ) : null}
        <span className="g-annotate ml-auto">
          {e.status === "OK"
            ? `${formatEpochTime(e.fetched_at)} · ${e.size.toLocaleString()} bytes judged`
            : `unreachable at ${formatEpochTime(e.fetched_at)}`}
        </span>
        {e.status === "OK" && e.excerpt ? (
          <button className="g-link text-[13px] cursor-pointer" onClick={() => setOpen((v) => !v)}>
            {open ? "hide excerpt" : "recorded excerpt"}
          </button>
        ) : null}
      </div>
      {open ? (
        <pre
          className="mt-2 p-3 rounded text-[12px] whitespace-pre-wrap g-mono"
          style={{
            background: "var(--sheet)",
            border: "1px dashed var(--grid-strong)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {e.excerpt}
        </pre>
      ) : null}
    </div>
  );
}

export function EvidenceRegistry({
  evaluations,
  evidence,
}: {
  evaluations: EvaluationView[];
  evidence: Map<number, EvidenceView>;
}) {
  if (!evaluations.length) {
    return (
      <div className="g-card-paper">
        <div className="g-eyebrow mb-2">Evidence registry</div>
        <p className="g-caption">
          No evaluations yet. When one runs, every source the panel reads is
          fetched by the contract itself, delimiter-sanitized, hashed, and
          recorded here — the hash binds exactly the judged bytes.
        </p>
      </div>
    );
  }
  return (
    <div className="g-card">
      <div className="g-eyebrow mb-3">Evidence registry</div>
      <div className="grid gap-4">
        {evaluations
          .slice()
          .sort((a, b) => b.id - a.id)
          .map((ev) => (
            <div key={ev.id}>
              <div className="g-annotate g-mono mb-1.5">
                round #{ev.id} · {ev.kind.toLowerCase()} · {formatEpochTime(ev.judged_at)}
              </div>
              <div className="grid gap-1.5">
                {ev.evidence_ids.map((eid) => {
                  const e = evidence.get(eid);
                  return e ? <EvidenceRow key={eid} e={e} /> : null;
                })}
              </div>
            </div>
          ))}
      </div>
      <p className="g-annotate mt-3">
        Fetched and hashed by the contract at judgment time — a dispute panel
        re-reads these exact recorded bytes, never a refetch.
      </p>
    </div>
  );
}
