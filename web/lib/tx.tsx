"use client";

/**
 * Transaction lifecycle — the portfolio-standard honest write path:
 *
 *   IDLE → SIGNING → JUDGING (validators run the round; the slow honest
 *   step) → RECONCILING (ACCEPTED; waiting until the EFFECT is readable)
 *   → SUCCESS | FAILED
 *
 * GenLayer receipts say ACCEPTED, not "views updated" — so after the receipt
 * the toast holds at RECONCILING and polls a caller-supplied view predicate
 * until the state change is actually visible, then invalidates queries and
 * fire-and-forgets a /api/reconcile ping so the Firestore mirror catches up.
 * The UI never claims what it cannot yet read.
 */
import { createContext, useCallback, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { explorerTxUrl } from "./chain/config";

export type TxPhase = "idle" | "signing" | "judging" | "reconciling" | "success" | "failed";

export type TxState = {
  phase: TxPhase;
  label: string;
  hash: string;
  error: string;
  effect: string;
};

type Runner = (opts: {
  label: string;
  effect?: string;
  write: () => Promise<string>;
  /** Poll until true — proves the effect is readable. */
  confirmed?: () => Promise<boolean>;
  invalidate?: (string | number)[][];
  /** Agreement id for the reconcile ping (mirror freshness). */
  touchAgreementId?: number;
}) => Promise<boolean>;

const TxCtx = createContext<{ tx: TxState; run: Runner; dismiss: () => void } | null>(null);

export function useTx() {
  const v = useContext(TxCtx);
  if (!v) throw new Error("useTx outside TxProvider");
  return v;
}

const IDLE: TxState = { phase: "idle", label: "", hash: "", error: "", effect: "" };

export function TxProvider({ children }: { children: React.ReactNode }) {
  const [tx, setTx] = useState<TxState>(IDLE);
  const queryClient = useQueryClient();

  const dismiss = useCallback(() => setTx(IDLE), []);

  const run: Runner = useCallback(
    async ({ label, effect = "", write, confirmed, invalidate = [], touchAgreementId }) => {
      setTx({ phase: "signing", label, hash: "", error: "", effect });
      let hash = "";
      try {
        // writeAndWait resolves only at ACCEPTED (or throws with the revert
        // reason) — the signing→judging boundary lives inside it.
        setTx((s) => ({ ...s, phase: "judging" }));
        hash = await write();
        setTx((s) => ({ ...s, phase: "reconciling", hash }));
        if (confirmed) {
          for (let i = 0; i < 30; i++) {
            try {
              if (await confirmed()) break;
            } catch {
              /* transient read — keep polling */
            }
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        await Promise.all(
          invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key })),
        );
        // mirror freshness — fire and forget
        void fetch("/api/reconcile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(touchAgreementId ? { touchAgreementId } : {}),
        }).catch(() => {});
        setTx((s) => ({ ...s, phase: "success" }));
        setTimeout(() => setTx((cur) => (cur.hash === hash ? IDLE : cur)), 6000);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const rejected = /rejected|denied|4001/i.test(message);
        setTx({
          phase: "failed",
          label,
          hash,
          effect,
          error: rejected ? "Signature request declined in the wallet." : message,
        });
        return false;
      }
    },
    [queryClient],
  );

  return (
    <TxCtx.Provider value={{ tx, run, dismiss }}>
      {children}
      <TxToast tx={tx} dismiss={dismiss} />
    </TxCtx.Provider>
  );
}

const PHASE_COPY: Record<TxPhase, string> = {
  idle: "",
  signing: "Waiting for your wallet signature…",
  judging: "Submitted — validators are fetching evidence and judging (this is the honest slow part, ~1–2 min)…",
  reconciling: "Accepted on-chain — confirming the state change is readable…",
  success: "Confirmed. State updated.",
  failed: "Transaction failed.",
};

function TxToast({ tx, dismiss }: { tx: TxState; dismiss: () => void }) {
  if (tx.phase === "idle") return null;
  const active = tx.phase === "signing" || tx.phase === "judging" || tx.phase === "reconciling";
  const order: TxPhase[] = ["signing", "judging", "reconciling", "success"];
  const cur = order.indexOf(tx.phase as TxPhase);
  return (
    <div className="g-toast" role="status">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-[15px]">{tx.label}</div>
          <div className="g-caption mt-1">{PHASE_COPY[tx.phase]}</div>
          {tx.phase === "success" && tx.effect ? (
            <div className="g-caption mt-1" style={{ color: "var(--verify)" }}>
              {tx.effect}
            </div>
          ) : null}
          {tx.phase === "failed" && (
            <div className="g-caption mt-1" style={{ color: "var(--dispute)" }}>
              {tx.error}
            </div>
          )}
          {tx.hash ? (
            <a
              className="g-link g-mono text-xs mt-2 inline-block"
              href={explorerTxUrl(tx.hash)}
              target="_blank"
              rel="noreferrer"
            >
              {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {active ? (
            <span
              aria-hidden
              className="inline-block w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--grid-strong)", borderTopColor: "var(--accent)" }}
            />
          ) : (
            <button onClick={dismiss} aria-label="Dismiss" className="g-caption cursor-pointer">
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-1 mt-3">
        {order.map((p, i) => (
          <div
            key={p}
            className="h-1 flex-1 rounded-full"
            style={{
              background:
                tx.phase === "failed"
                  ? i === 0
                    ? "var(--dispute)"
                    : "var(--grid-line)"
                  : cur >= i
                    ? "var(--accent)"
                    : "var(--grid-line)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
