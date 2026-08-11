"use client";

/**
 * CompletionGauge — the signature component (docs/UX.md §5). The threshold-
 * native idea made visible: refund / pro-rata / full-release zones, floor and
 * threshold markers, the judged bucket needle, and the deterministic payout
 * readout. Every number comes from settlementPreview — the SAME math the
 * contract runs — so the preview can never drift from the chain.
 */
import { settlementPreview } from "@/lib/chain/types";
import { formatGen } from "@/lib/format";

export function CompletionGauge({
  thresholdBps,
  floorBps,
  amountAtto,
  bucket = null,
  keeperBps = 0,
  compact = false,
}: {
  thresholdBps: number;
  floorBps: number;
  amountAtto: bigint;
  bucket?: number | null;   // judged completion (null = not judged yet)
  keeperBps?: number;
  compact?: boolean;
}) {
  const thresholdPct = thresholdBps / 100;
  const floorPct = floorBps / 100;
  const judged = bucket !== null && bucket !== undefined;
  const preview = judged
    ? settlementPreview(amountAtto, bucket!, thresholdBps, floorBps, keeperBps)
    : null;

  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="g-eyebrow">Completion</span>
        <span className="g-eyebrow">
          {floorBps > 0 ? `floor ${floorPct} · ` : ""}release {thresholdPct}
        </span>
      </div>

      <div className="relative" style={{ height: compact ? 46 : 64 }}>
        {/* zones */}
        <div
          className="absolute left-0 right-0 flex overflow-hidden rounded"
          style={{ top: compact ? 12 : 20, height: 14 }}
        >
          <div
            style={{
              width: `${floorBps > 0 ? floorPct : thresholdPct}%`,
              background: "var(--refund-soft)",
            }}
          />
          {floorBps > 0 ? (
            <div
              style={{
                width: `${thresholdPct - floorPct}%`,
                background: "var(--accent-soft)",
              }}
            />
          ) : null}
          <div style={{ flex: 1, background: "var(--verify-soft)" }} />
        </div>

        {/* markers */}
        {floorBps > 0 ? (
          <div
            className="absolute"
            style={{
              left: `${floorPct}%`,
              top: compact ? 8 : 14,
              width: 2,
              height: compact ? 22 : 26,
              background: "var(--grid-strong)",
            }}
          />
        ) : null}
        <div
          className="absolute"
          style={{
            left: `${thresholdPct}%`,
            top: compact ? 8 : 14,
            width: 2,
            height: compact ? 22 : 26,
            background: "var(--accent)",
          }}
        />
        {!compact && floorBps > 0 ? (
          <div
            className="absolute g-mono g-annotate"
            style={{ top: 44, left: `${floorPct}%`, transform: "translateX(-50%)" }}
          >
            △ {floorPct} floor
          </div>
        ) : null}
        {!compact ? (
          <div
            className="absolute g-mono"
            style={{
              top: 44,
              left: `${thresholdPct}%`,
              transform: "translateX(-50%)",
              fontSize: 11,
              color: "var(--accent-deep)",
            }}
          >
            ▲ {thresholdPct} release
          </div>
        ) : null}

        {/* needle */}
        {judged ? (
          <div
            className="absolute"
            style={{
              left: `${bucket}%`,
              top: compact ? 2 : 6,
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                width: 3,
                height: compact ? 32 : 42,
                background: "var(--ink)",
                margin: "0 auto",
              }}
            />
            <div
              className="absolute g-mono"
              style={{
                top: -6,
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--ink)",
                color: "var(--canvas)",
                fontSize: 12,
                fontWeight: 600,
                padding: "1px 7px",
                borderRadius: 4,
              }}
            >
              {bucket}
            </div>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="flex gap-4 flex-wrap mt-2 g-annotate">
          <span>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
              style={{ background: "var(--refund-soft)", border: "1px solid var(--grid-strong)" }}
            />
            refund zone
          </span>
          {floorBps > 0 ? (
            <span>
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--grid-strong)" }}
              />
              pro-rata zone
            </span>
          ) : null}
          <span>
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
              style={{ background: "var(--verify-soft)", border: "1px solid var(--grid-strong)" }}
            />
            full release
          </span>
        </div>
      ) : null}

      {preview ? (
        <div
          className="mt-3 rounded-lg px-4 py-2.5 flex items-center justify-between flex-wrap gap-2"
          style={{ background: "var(--sheet)", border: "1px solid var(--grid-line)" }}
        >
          <span className="g-caption">
            At {bucket}%:{" "}
            <span className="g-mono font-semibold" style={{ color: "var(--ink)" }}>
              payee {formatGen(preview.payee)} · payer {formatGen(preview.payer)}
              {preview.keeper > 0n ? ` · keeper ${formatGen(preview.keeper)}` : ""} GEN
            </span>
          </span>
          <span className="g-annotate g-mono">rule: {preview.rule} · deterministic</span>
        </div>
      ) : null}
    </div>
  );
}
