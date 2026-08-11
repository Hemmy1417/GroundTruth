"use client";

/**
 * The Docket — every agreement, public. Grouped by project tag when present;
 * the connected wallet's agreements are flagged. Fully readable walletless.
 */
import Link from "next/link";
import { useMemo } from "react";
import { useDocket, useMyAgreementIds, useStats } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { formatEpoch, formatGen, pct, shortAddr } from "@/lib/format";
import { StateChip } from "@/components/badges";
import { EmptyState, SkeletonCard, StatTile, TitleBlock } from "@/components/ui";
import { CONTRACT_CONFIGURED } from "@/lib/chain/config";

export default function DocketPage() {
  const { address } = useWallet();
  const docket = useDocket();
  const stats = useStats();
  const mine = useMyAgreementIds(address || null);
  const myIds = useMemo(() => new Set(mine.data?.agreement_ids ?? []), [mine.data]);

  if (!CONTRACT_CONFIGURED) {
    return (
      <EmptyState
        title="Contract not configured"
        body="This build has no NEXT_PUBLIC_CONTRACT_ADDRESS set. Once GroundTruth is deployed to StudioNet and the address configured, the docket runs against live chain state."
      />
    );
  }

  const items = docket.data?.agreements ?? [];
  const groups = new Map<string, typeof items>();
  for (const a of items) {
    const key = a.project_tag || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div>
      <TitleBlock
        eyebrow="Public record"
        title="The docket"
        right={
          <Link href="/new" className="g-btn g-btn-accent g-btn-sm">
            New agreement
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Agreements" value={stats.data?.agreements ?? "—"} />
        <StatTile
          label="Escrow held"
          value={stats.data ? `${formatGen(stats.data.escrow_held_atto)} GEN` : "—"}
        />
        <StatTile
          label="Settled to date"
          value={stats.data ? `${formatGen(stats.data.settled_total_atto)} GEN` : "—"}
        />
        <StatTile label="Judgments" value={stats.data?.evaluations ?? "—"} />
      </div>

      {docket.isLoading ? (
        <div className="grid gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No agreements yet"
          body="Define a real-world condition, escrow the money against it, and let the evidence decide."
          action={
            <Link href="/new" className="g-btn g-btn-ink">
              Create the first agreement
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6">
          {[...groups.entries()].map(([tag, rows]) => (
            <div key={tag || "untagged"}>
              {tag ? (
                <div className="g-eyebrow mb-2">
                  Project — {tag} · {rows.length} milestone{rows.length > 1 ? "s" : ""}
                </div>
              ) : null}
              <div className="grid gap-2.5">
                {rows.map((a) => (
                  <Link
                    key={a.id}
                    href={`/agreements/${a.id}`}
                    className="g-card block hover:border-[var(--ink)]"
                    style={{ borderWidth: 1 }}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-[15.5px] truncate">
                          #{a.id} — {a.title}
                        </div>
                        <div className="g-annotate g-mono mt-0.5">
                          {shortAddr(a.payer)} ⇄ {shortAddr(a.payee)} · release at{" "}
                          {pct(a.threshold_bps)} · deadline {formatEpoch(a.deadline)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {myIds.has(a.id) ? (
                          <span className="g-pill g-pill-outline" style={{ fontSize: 11 }}>
                            YOURS
                          </span>
                        ) : null}
                        <span className="g-mono font-semibold">
                          {formatGen(a.amount_atto)} GEN
                        </span>
                        <StateChip state={a.state} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
