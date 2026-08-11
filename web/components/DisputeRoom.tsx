"use client";

/**
 * DisputeRoom — the two-column confrontation (docs/UX.md §5): the RECORDED
 * dossier the first panel judged vs the challenger's filed exhibits, the
 * statement as a filed exhibit (context, never evidence), and the
 * re-evaluation verdict when it lands. Subscribes to the Firestore mirror
 * for live refresh while transactions confirm.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AgreementView, EvaluationView, EvidenceView } from "@/lib/chain/types";
import { subscribeAgreement } from "@/lib/firebase";
import { formatEpochTime, formatGen, shortAddr, timeLeft } from "@/lib/format";
import { HashStamp, VerdictPill } from "./badges";

function ExhibitList({
  ids,
  evidence,
  emptyText,
}: {
  ids: number[];
  evidence: Map<number, EvidenceView>;
  emptyText: string;
}) {
  if (!ids.length) return <p className="g-annotate">{emptyText}</p>;
  return (
    <div className="grid gap-1.5">
      {ids.map((eid) => {
        const e = evidence.get(eid);
        if (!e) return null;
        return (
          <div
            key={eid}
            className="rounded px-3 py-2"
            style={{ background: "var(--sheet)", border: "1px solid var(--grid-line)" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: e.status === "OK" ? "var(--verify)" : "var(--dispute)" }}
              />
              <span className="text-[13px] truncate max-w-[220px]" title={e.url}>
                {e.url}
              </span>
              <HashStamp sha256={e.sha256} />
            </div>
            {e.status === "OK" && e.excerpt ? (
              <pre
                className="mt-1.5 p-2 rounded text-[11.5px] whitespace-pre-wrap g-mono"
                style={{
                  background: "var(--paper)",
                  border: "1px dashed var(--grid-strong)",
                  maxHeight: 150,
                  overflowY: "auto",
                }}
              >
                {e.excerpt.slice(0, 700)}
              </pre>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function DisputeRoom({
  agreement,
  challenged,
  reassessment,
  evidence,
}: {
  agreement: AgreementView;
  challenged: EvaluationView | null;
  reassessment: EvaluationView | null;
  evidence: Map<number, EvidenceView>;
}) {
  const a = agreement;
  const d = a.dispute;
  const queryClient = useQueryClient();

  // realtime: the mirror updates on reconcile → refresh the chain reads
  useEffect(() => {
    if (d.state !== "FILED") return;
    return subscribeAgreement(a.id, () => {
      void queryClient.invalidateQueries({ queryKey: ["agreement", a.id] });
    });
  }, [a.id, d.state, queryClient]);

  if (d.state === "NONE" || d.state === "OPEN") return null;

  const challengeExhibitIds = challenged
    ? [...evidence.values()]
        .filter((e) => e.agreement_id === a.id && e.kind === "CHALLENGE")
        .map((e) => e.id)
    : [];

  return (
    <div className="g-card" style={{ borderTop: "3px solid var(--dispute)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="g-eyebrow">Dispute room</div>
        <div className="flex items-center gap-2">
          <span
            className="g-pill"
            style={{ background: "var(--dispute-soft)", color: "var(--dispute)" }}
          >
            {d.state === "FILED"
              ? "AWAITING REASSESSMENT"
              : d.state === "RESOLVED"
                ? "RESOLVED"
                : "CLOSED — TERMINAL"}
          </span>
          {d.state === "FILED" ? (
            <span className="g-annotate g-mono">
              terminal escape in {timeLeft(d.terminal_at)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 g-caption">
        Challenged by{" "}
        <span className="g-mono">{shortAddr(d.challenger)}</span>{" "}
        ({d.challenger === a.payer ? "payer" : "payee"}) · bond{" "}
        <span className="g-mono">{formatGen(d.bond_atto)} GEN</span> ·{" "}
        filed {formatEpochTime(d.filed_at)}
      </div>

      <div
        className="mt-3 rounded-lg px-4 py-3"
        style={{ background: "var(--dispute-soft)", border: "1px solid var(--dispute)" }}
      >
        <div className="g-eyebrow" style={{ color: "var(--dispute)" }}>
          Challenger&apos;s statement — context only, never evidence
        </div>
        <p className="text-[14px] mt-1" style={{ color: "var(--ink)" }}>
          “{d.statement}”
        </p>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-lg p-3" style={{ background: "var(--paper)" }}>
          <div className="g-eyebrow mb-2">The recorded dossier (panel 1 judged)</div>
          {challenged ? (
            <>
              <div className="mb-2">
                <VerdictPill verdict={challenged.judgment.verdict} />
                <span className="g-mono g-caption ml-2">
                  @ {challenged.judgment.completion_bucket}%
                </span>
              </div>
              <ExhibitList
                ids={challenged.evidence_ids}
                evidence={evidence}
                emptyText="No recorded rows."
              />
            </>
          ) : (
            <p className="g-annotate">loading…</p>
          )}
        </div>
        <div className="rounded-lg p-3" style={{ background: "var(--paper)" }}>
          <div className="g-eyebrow mb-2">Challenge exhibits (snapshotted at filing)</div>
          <ExhibitList
            ids={challengeExhibitIds}
            evidence={evidence}
            emptyText="No new sources filed — the challenge rests on the statement and the recorded dossier."
          />
        </div>
      </div>

      {reassessment ? (
        <div
          className="mt-4 rounded-lg px-4 py-3"
          style={{ background: "var(--sheet)", border: "2px solid var(--ink)" }}
        >
          <div className="g-eyebrow mb-1">Second panel — final</div>
          <div className="flex items-center gap-3 flex-wrap">
            <VerdictPill verdict={reassessment.judgment.verdict} />
            <span className="g-mono g-caption">@ {reassessment.judgment.completion_bucket}%</span>
            <span className="g-caption">
              {reassessment.judgment.verdict === "INCONCLUSIVE"
                ? "— could not re-establish the finding: the original verdict stands, bond refunded (uncertainty never punishes)."
                : challenged &&
                    (reassessment.judgment.verdict !== challenged.judgment.verdict ||
                      reassessment.judgment.completion_bucket !==
                        challenged.judgment.completion_bucket)
                  ? "— the verdict CHANGED: the corrected finding settles, bond refunded."
                  : "— unchanged: the original verdict stands, bond forfeited to the counterparty."}
            </span>
          </div>
          {reassessment.judgment.reason ? (
            <p className="g-caption mt-1.5">“{reassessment.judgment.reason}”</p>
          ) : null}
        </div>
      ) : d.state === "TERMINAL" && !d.reassess_eval_id ? (
        <p className="g-annotate mt-3">
          The reassessment never concluded — the terminal escape fired:
          original verdict stands, bond refunded. An unresolved dispute never
          traps funds.
        </p>
      ) : null}
    </div>
  );
}
