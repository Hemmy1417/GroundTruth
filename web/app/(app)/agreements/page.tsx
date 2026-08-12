"use client";

/**
 * Agreements — the docket as a calm list. One primary action (New agreement),
 * a light summary strip, then scannable rows: title + parties on the left,
 * amount + status on the right. Grouped by project when tagged. Fully
 * readable without a wallet.
 */
import Link from "next/link";
import { useMemo } from "react";
import { useDocket, useMyAgreementIds, useStats } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { formatEpoch, formatGen, pct, shortAddr } from "@/lib/format";
import { Badge, EmptyState, Skeleton } from "@/components/kit";
import { CONTRACT_CONFIGURED } from "@/lib/chain/config";

const STATE_TONE: Record<string, { tone: "success" | "warning" | "danger" | "pending" | "neutral"; label: string }> = {
  PROPOSED: { tone: "pending", label: "Awaiting assent" },
  FUNDED: { tone: "pending", label: "Active" },
  ARMED: { tone: "pending", label: "Challenge window" },
  DISPUTED: { tone: "danger", label: "Disputed" },
  SETTLED: { tone: "success", label: "Settled" },
  EXPIRED: { tone: "warning", label: "Expired" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
};

export default function DocketPage() {
  const { address } = useWallet();
  const docket = useDocket();
  const stats = useStats();
  const mine = useMyAgreementIds(address || null);
  const myIds = useMemo(() => new Set(mine.data?.agreement_ids ?? []), [mine.data]);

  if (!CONTRACT_CONFIGURED) {
    return <EmptyState title="Contract not configured" body="No contract address is set for this build. Once GroundTruth is deployed and configured, the docket runs against live chain state." />;
  }

  const items = docket.data?.agreements ?? [];
  const groups = new Map<string, typeof items>();
  for (const a of items) {
    const key = a.project_tag || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div className="sections">
      {/* header + primary action */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="t-title">Agreements</h1>
          <p className="t-body mt-1">Every escrow settled on verified evidence — public, on-chain.</p>
        </div>
        <Link href="/new" className="btn btn-primary">New agreement</Link>
      </div>

      {/* quiet summary strip — three numbers, not fifteen */}
      <div className="grid grid-cols-3 gap-6" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "var(--s5) 0" }}>
        <Summary label="Agreements" value={stats.data ? String(stats.data.agreements) : undefined} />
        <Summary label="In escrow" value={stats.data ? `${formatGen(stats.data.escrow_held_atto)} GEN` : undefined} />
        <Summary label="Settled" value={stats.data ? `${formatGen(stats.data.settled_total_atto)} GEN` : undefined} />
      </div>

      {/* the list */}
      {docket.isLoading ? (
        <div className="stack-s">{[0, 1, 2].map((i) => <Skeleton key={i} h={68} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No agreements yet" body="Define a real-world condition, escrow the money against it, and let the evidence decide." action={<Link href="/new" className="btn btn-primary">Create the first agreement</Link>} />
      ) : (
        <div className="stack">
          {[...groups.entries()].map(([tag, rows]) => (
            <div key={tag || "untagged"}>
              {tag ? <div className="t-label mb-3">{tag} · {rows.length} milestone{rows.length > 1 ? "s" : ""}</div> : null}
              <div style={{ borderTop: "1px solid var(--line)" }}>
                {rows.map((a) => {
                  const st = STATE_TONE[a.state] ?? STATE_TONE.PROPOSED!;
                  return (
                    <Link key={a.id} href={`/agreements/${a.id}`} className="flex items-center justify-between gap-4"
                      style={{ padding: "var(--s4) var(--s2)", borderBottom: "1px solid var(--line)", transition: "background 120ms ease", borderRadius: 8 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span className="t-h3" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                          {myIds.has(a.id) ? <span className="badge badge-outline" style={{ height: 20, fontSize: 11 }}>Yours</span> : null}
                        </div>
                        <div className="t-meta mt-0.5">
                          {shortAddr(a.payer)} → {shortAddr(a.payee)} · release {pct(a.threshold_bps)} · {formatEpoch(a.deadline)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="t-num" style={{ fontSize: 15 }}>{formatGen(a.amount_atto)} <span className="t-meta">GEN</span></span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="t-label">{label}</div>
      {value ? <div className="t-num t-num-lg mt-1">{value}</div> : <Skeleton h={26} w={80} className="mt-2" />}
    </div>
  );
}
