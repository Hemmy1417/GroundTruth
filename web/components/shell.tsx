"use client";

/**
 * App shell — dark CONSOLE layout: fixed left sidebar (wordmark, nav,
 * network/wallet at the bottom), main content right. NO gate —
 * transparency is the product: every read renders without a wallet; the
 * wallet gates only actions. (Deliberately different structure from the
 * portfolio's top-bar apps.)
 */
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { CONTRACT_CONFIGURED } from "@/lib/chain/config";

const NAV = [
  { href: "/agreements", label: "Docket", glyph: "≡" },
  { href: "/new", label: "New agreement", glyph: "+" },
  { href: "/settings", label: "Settings", glyph: "⚙" },
];

/** The mark: a gauge needle crossing the threshold into release. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      style={{ borderRadius: size * 0.22, flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="7" fill="#0A0A0A" />
      <rect x="5" y="19" width="22" height="4" rx="2" fill="#2A2A2A" />
      <rect x="21" y="19" width="6" height="4" rx="2" fill="#3A3A1F" />
      <path d="M21 15.5 L23.4 15.5 L22.2 18 Z" fill="#FCFF74" opacity="0.55" />
      <rect x="20.6" y="7" width="3.2" height="19" rx="1.6" fill="#FCFF74" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <LogoMark size={compact ? 20 : 23} />
      <span className="inline-flex items-baseline">
        <span
          className="font-bold"
          style={{ color: "var(--ink)", fontSize: compact ? 16 : 18, letterSpacing: "-0.5px" }}
        >
          ground
        </span>
        <span
          className="font-bold"
          style={{ color: "var(--primary)", fontSize: compact ? 16 : 18, letterSpacing: "-0.5px" }}
        >
          truth
        </span>
      </span>
    </Link>
  );
}

export function ConnectButton({ full = false }: { full?: boolean }) {
  const { address, wallets, connect, connecting, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (address) {
    return (
      <div className={full ? "grid gap-1.5" : "inline-flex items-center gap-2"}>
        <span className="g-pill g-pill-outline g-mono">{shortAddr(address)}</span>
        <button
          className="g-link text-[13px] cursor-pointer text-left"
          onClick={disconnect}
        >
          Disconnect
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        className={`g-btn g-btn-accent g-btn-sm ${full ? "w-full" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        Connect wallet
      </button>
      {open ? (
        <div
          className="absolute bottom-11 left-0 z-50 w-60 g-card"
          style={{ background: "var(--elevated)" }}
        >
          <div className="g-eyebrow mb-2">Choose a wallet</div>
          {wallets.length === 0 ? (
            <p className="g-annotate">
              No EVM wallet detected. Install MetaMask, Rainbow, or Zerion,
              then reload.
            </p>
          ) : (
            <div className="grid gap-2">
              {wallets.map((w) => (
                <button
                  key={w.info.uuid}
                  className="g-btn g-btn-ink g-btn-sm w-full justify-between"
                  disabled={connecting}
                  onClick={() => {
                    void connect(w).then(() => setOpen(false));
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    {w.info.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.info.icon} alt="" className="w-4 h-4 rounded" />
                    ) : null}
                    {w.info.name}
                  </span>
                  <span className="g-annotate">{connecting ? "…" : "→"}</span>
                </button>
              ))}
            </div>
          )}
          <p className="g-annotate mt-2.5">
            GroundTruth never holds keys — your wallet signs every action.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const nav = (
    <nav className="grid gap-1">
      {NAV.map((n) => {
        const active = pathname?.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium"
            style={
              active
                ? { background: "var(--sheet)", color: "var(--ink)" }
                : { color: "var(--annotate)" }
            }
          >
            <span
              aria-hidden
              className="g-mono text-[13px] w-4 text-center"
              style={{ color: active ? "var(--primary)" : "var(--muted-soft)" }}
            >
              {n.glyph}
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)" }}>
      {/* sidebar — desktop */}
      <aside
        className="hidden md:flex flex-col justify-between w-[228px] shrink-0 sticky top-0 h-screen px-4 py-5"
        style={{ borderRight: "1px solid var(--grid-line)" }}
      >
        <div>
          <div className="px-3 mb-6">
            <Wordmark />
          </div>
          {nav}
        </div>
        <div className="grid gap-3 px-3">
          {!CONTRACT_CONFIGURED && (
            <span
              className="g-pill"
              style={{ background: "var(--dispute-soft)", color: "var(--dispute)" }}
            >
              contract not configured
            </span>
          )}
          <span className="g-pill g-pill-outline w-fit" title="GenLayer StudioNet — a test network; GEN carries no real-world value.">
            STUDIONET
          </span>
          <ConnectButton full />
          <p className="g-annotate" style={{ color: "var(--muted-soft)" }}>
            Evidence-settled escrow on GenLayer. Prototype — experimental
            parameters.
          </p>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40" style={{ background: "var(--canvas)", borderBottom: "1px solid var(--grid-line)" }}>
        <div className="h-14 px-4 flex items-center justify-between">
          <Wordmark compact />
          <ConnectButton />
        </div>
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-lg text-[13.5px] font-medium whitespace-nowrap"
              style={
                pathname?.startsWith(n.href)
                  ? { background: "var(--sheet)", color: "var(--ink)" }
                  : { color: "var(--annotate)" }
              }
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      {/* main */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-8 pt-28 md:pt-8 max-w-[1080px]">
        {children}
      </main>
    </div>
  );
}
