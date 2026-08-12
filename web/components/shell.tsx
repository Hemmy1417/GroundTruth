"use client";

/**
 * App shell — a calm top bar: wordmark, two nav links, one wallet control.
 * No sidebar, no clutter. Transparency is the product: reads render without
 * a wallet; the wallet gates only actions.
 */
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { CONTRACT_CONFIGURED } from "@/lib/chain/config";

const NAV = [
  { href: "/agreements", label: "Agreements" },
  { href: "/new", label: "New" },
];

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect width="24" height="24" rx="7" fill="var(--accent)" />
      <path d="M6.5 12.5l3.2 3.2 7-7" stroke="var(--on-accent)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <LogoMark />
      <span style={{ fontSize: 16.5, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>
        GroundTruth
      </span>
    </Link>
  );
}

export function ConnectButton({ block = false }: { block?: boolean }) {
  const { address, wallets, connect, connecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (address) {
    return (
      <button className={`badge badge-outline ${block ? "w-full" : ""}`} style={{ height: 38, cursor: "pointer" }} onClick={disconnect} title="Disconnect">
        <span className="badge-dot" style={{ background: "var(--success)" }} />
        <span className="t-mono" style={{ fontSize: 12.5 }}>{shortAddr(address)}</span>
      </button>
    );
  }
  return (
    <div className="relative">
      <button className={`btn btn-primary btn-sm ${block ? "btn-block" : ""}`} onClick={() => setOpen((v) => !v)}>
        Connect wallet
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 z-50" style={{ width: 280, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-card)", boxShadow: "var(--shadow-lg)", padding: "var(--s4)" }}>
          <div className="t-label mb-3">Choose a wallet</div>
          {wallets.length === 0 ? (
            <p className="t-small">No EVM wallet detected. Install MetaMask, Rainbow, or Zerion, then reload.</p>
          ) : (
            <div className="stack-s">
              {wallets.map((w) => (
                <button
                  key={w.info.uuid}
                  className="btn btn-secondary btn-block"
                  style={{ justifyContent: "space-between" }}
                  disabled={connecting}
                  onClick={() => void connect(w).then(() => setOpen(false))}
                >
                  <span className="flex items-center gap-2">
                    {w.info.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.info.icon} alt="" width={18} height={18} style={{ borderRadius: 5 }} />
                    ) : null}
                    {w.info.name}
                  </span>
                  <span className="t-meta">{connecting ? "…" : "→"}</span>
                </button>
              ))}
            </div>
          )}
          <p className="t-meta mt-3">GroundTruth never holds your keys.</p>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "color-mix(in srgb, var(--bg) 86%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap flex items-center justify-between" style={{ height: 60 }}>
          <div className="flex items-center gap-7">
            <Wordmark />
            <nav className="hidden sm:flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname?.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} className="btn btn-ghost btn-sm" style={active ? { background: "var(--surface-2)", color: "var(--ink)" } : undefined}>
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {!CONTRACT_CONFIGURED ? <Badge>Not configured</Badge> : null}
            <Link href="/settings" className="btn btn-ghost btn-sm hidden sm:inline-flex" style={pathname?.startsWith("/settings") ? { background: "var(--surface-2)", color: "var(--ink)" } : undefined}>
              Settings
            </Link>
            <ConnectButton />
          </div>
        </div>
        <nav className="sm:hidden flex gap-1 wrap" style={{ paddingBottom: 8, overflowX: "auto" }}>
          {[...NAV, { href: "/settings", label: "Settings" }].map((n) => {
            const active = pathname?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className="btn btn-ghost btn-sm" style={active ? { background: "var(--surface-2)", color: "var(--ink)" } : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="wrap" style={{ paddingTop: "var(--s7)", paddingBottom: "var(--s9)" }}>
        {children}
      </main>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge badge-warning">{children}</span>;
}
