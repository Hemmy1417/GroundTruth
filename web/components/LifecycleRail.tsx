"use client";

/**
 * LifecycleRail — the agreement's state history as a horizontal rail.
 * Provisional verdicts are hollow nodes (recorded, non-binding). Every node
 * is a real on-chain fact; nothing decorative.
 */
import type { AgreementView, EvaluationView } from "@/lib/chain/types";
import { formatEpochTime, timeLeft } from "@/lib/format";

type Node = {
  label: string;
  at: number;
  kind: "done" | "provisional" | "live" | "pending";
  detail?: string;
};

export function LifecycleRail({
  agreement,
  evaluations,
}: {
  agreement: AgreementView;
  evaluations: EvaluationView[];
}) {
  const a = agreement;
  const nodes: Node[] = [
    { label: "Created + funded", at: a.created_at, kind: "done" },
  ];

  if (a.state === "CANCELLED") {
    nodes.push({ label: "Cancelled — refunded", at: a.settlement.settled_at, kind: "done" });
  } else if (a.state === "PROPOSED") {
    nodes.push({ label: "Awaiting payee assent", at: 0, kind: "live" });
  } else {
    nodes.push({ label: "Payee assented", at: 0, kind: "done" });
  }

  for (const ev of evaluations.slice().sort((x, y) => x.id - y.id)) {
    nodes.push({
      label: `${ev.kind === "REASSESSMENT" ? "Re-judged" : "Judged"}: ${ev.judgment.verdict.replace("_", " ")} @ ${ev.judgment.completion_bucket}%`,
      at: ev.judged_at,
      kind: ev.provisional ? "provisional" : "done",
      detail: ev.provisional ? "provisional — nothing settles before the deadline" : undefined,
    });
  }

  if (a.state === "ARMED") {
    nodes.push({
      label: "Challenge window open",
      at: 0,
      kind: "live",
      detail: `${timeLeft(a.dispute.window_ends)} left — either party may challenge; settle opens after`,
    });
  }
  if (a.dispute.state === "FILED") {
    nodes.push({
      label: `Disputed by ${a.dispute.challenger === a.payer ? "payer" : "payee"} (1 GEN bond)`,
      at: a.dispute.filed_at,
      kind: "live",
      detail: "awaiting reassessment — the second panel judges the recorded dossier",
    });
  }
  if (a.dispute.state === "RESOLVED") {
    nodes.push({ label: "Dispute resolved", at: 0, kind: "done" });
  }
  if (a.dispute.state === "TERMINAL") {
    nodes.push({
      label: "Dispute closed (terminal)",
      at: 0,
      kind: "done",
      detail: "bond refunded — an unresolved dispute never traps funds",
    });
  }
  if (a.state === "SETTLED") {
    nodes.push({
      label: `Settled — ${a.settlement.rule.replace("_", " ")}`,
      at: a.settlement.settled_at,
      kind: "done",
    });
  } else if (a.state === "EXPIRED") {
    nodes.push({
      label: "Expired — payer refunded",
      at: a.settlement.settled_at,
      kind: "done",
    });
  } else if (a.state !== "PROPOSED" && a.state !== "CANCELLED") {
    nodes.push({ label: "Settlement", at: 0, kind: "pending" });
  }

  return (
    <div className="g-card">
      <div className="g-eyebrow mb-3">Lifecycle</div>
      <div className="flex flex-wrap items-start gap-0">
        {nodes.map((n, i) => (
          <div key={i} className="flex items-start">
            {i > 0 ? (
              <div
                className="mt-[7px] mx-1.5"
                style={{ width: 22, height: 2, background: "var(--grid-strong)" }}
              />
            ) : null}
            <div className="max-w-[190px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full shrink-0"
                  style={{
                    background:
                      n.kind === "done"
                        ? "var(--ink)"
                        : n.kind === "live"
                          ? "var(--accent)"
                          : "var(--sheet)",
                    border:
                      n.kind === "provisional"
                        ? "2px dashed var(--hold)"
                        : n.kind === "pending"
                          ? "2px solid var(--grid-strong)"
                          : "2px solid transparent",
                  }}
                />
                <span className="text-[13px] font-medium leading-tight">{n.label}</span>
              </div>
              {n.at ? (
                <div className="g-annotate g-mono ml-5">{formatEpochTime(n.at)}</div>
              ) : null}
              {n.detail ? <div className="g-annotate ml-5">{n.detail}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
