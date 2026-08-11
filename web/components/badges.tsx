"use client";

/**
 * Badge vocabulary — palette-locked (docs/UX.md). Uncertainty is hold-gray,
 * never red; refund is amber-brown, distinct from dispute oxblood.
 */
import { shortHash } from "@/lib/format";

const STATE: Record<string, { fg: string; bg: string; label?: string }> = {
  PROPOSED: { fg: "var(--annotate)", bg: "var(--hold-soft)", label: "AWAITING ASSENT" },
  FUNDED: { fg: "var(--verify)", bg: "var(--verify-soft)", label: "ACTIVE" },
  ARMED: { fg: "var(--accent-deep)", bg: "var(--accent-soft)", label: "CHALLENGE WINDOW" },
  DISPUTED: { fg: "var(--dispute)", bg: "var(--dispute-soft)" },
  SETTLED: { fg: "#ffffff", bg: "var(--verify)" },
  EXPIRED: { fg: "var(--refund)", bg: "var(--refund-soft)" },
  CANCELLED: { fg: "var(--annotate)", bg: "var(--hold-soft)" },
};

export function StateChip({ state }: { state: string }) {
  const c = STATE[state] ?? STATE.PROPOSED!;
  return (
    <span className="g-pill" style={{ color: c.fg, background: c.bg }}>
      {c.label ?? state}
    </span>
  );
}

const VERDICT: Record<string, { fg: string; bg: string }> = {
  SATISFIED: { fg: "#ffffff", bg: "var(--verify)" },
  NOT_SATISFIED: { fg: "var(--refund)", bg: "var(--refund-soft)" },
  INCONCLUSIVE: { fg: "var(--hold)", bg: "var(--hold-soft)" },
};

export function VerdictPill({
  verdict,
  provisional = false,
}: {
  verdict: string;
  provisional?: boolean;
}) {
  const c = VERDICT[verdict] ?? VERDICT.INCONCLUSIVE!;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="g-pill" style={{ color: c.fg, background: c.bg }}>
        {verdict.replace("_", " ")}
      </span>
      {provisional ? (
        <span
          className="g-pill"
          style={{ border: "1px dashed var(--hold)", color: "var(--hold)" }}
          title="Recorded before the deadline — 'not yet' is not 'failed'. Nothing settles on a provisional verdict."
        >
          PROVISIONAL
        </span>
      ) : null}
    </span>
  );
}

export function RulePill({ rule }: { rule: string }) {
  const map: Record<string, { fg: string; bg: string }> = {
    FULL_RELEASE: { fg: "#ffffff", bg: "var(--verify)" },
    PRO_RATA: { fg: "var(--accent-deep)", bg: "var(--accent-soft)" },
    REFUND: { fg: "var(--refund)", bg: "var(--refund-soft)" },
    NEGOTIATED: { fg: "var(--ink)", bg: "var(--grid-line)" },
    EXPIRED_REFUND: { fg: "var(--refund)", bg: "var(--refund-soft)" },
    CANCELLED_REFUND: { fg: "var(--annotate)", bg: "var(--hold-soft)" },
  };
  const c = map[rule] ?? map.NEGOTIATED!;
  return (
    <span className="g-pill g-mono" style={{ color: c.fg, background: c.bg }}>
      {rule.replace("_", " ")}
    </span>
  );
}

export function HashStamp({ sha256 }: { sha256: string }) {
  if (!sha256) return <span className="g-annotate">no hash — unreachable</span>;
  return (
    <span className="g-stamp" title={sha256}>
      sha256:{shortHash(sha256, 14)}
    </span>
  );
}

export function AdvisoryBadge() {
  return (
    <span
      className="g-pill g-pill-outline"
      title="This field is the panel's advisory reading. It is deliberately outside validator equivalence and no state-changing rule reads it."
      style={{ fontSize: 11 }}
    >
      ADVISORY — OUTSIDE CONSENSUS
    </span>
  );
}

export function NetworkChip() {
  return (
    <span
      className="g-pill g-pill-outline"
      title="GroundTruth runs on GenLayer StudioNet — a test network. GEN here carries no real-world value."
    >
      STUDIONET
    </span>
  );
}
