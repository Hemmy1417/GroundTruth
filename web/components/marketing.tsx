"use client";

/**
 * Marketing shell — the public site's top-nav + footer (ClickHouse-style:
 * black canvas, nav menu, yellow Get-started). The app itself uses the
 * sidebar console shell; these pages are the editorial layer.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./shell";

const MENU = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/trust", label: "Trust & disputes" },
  { href: "/demo", label: "Live demo" },
  { href: "/agreements", label: "Docket" },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <header
        className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
        style={{ background: "var(--canvas)", borderBottom: "1px solid var(--grid-line)" }}
      >
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav className="hidden md:flex items-center gap-1 text-[14px]">
            {MENU.map((m) => {
              const active = pathname === m.href;
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="px-3 py-2 rounded-lg font-medium"
                  style={
                    active
                      ? { background: "var(--sheet)", color: "var(--ink)" }
                      : { color: "var(--body)" }
                  }
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="g-pill g-pill-outline hidden sm:inline-flex">STUDIONET</span>
          <Link href="/new" className="g-btn g-btn-accent g-btn-sm">
            Get started
          </Link>
        </div>
      </header>

      {/* mobile menu row */}
      <nav
        className="md:hidden flex gap-1 px-4 py-2 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--grid-line)" }}
      >
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="px-3 py-1.5 rounded-lg text-[13.5px] font-medium whitespace-nowrap"
            style={
              pathname === m.href
                ? { background: "var(--sheet)", color: "var(--ink)" }
                : { color: "var(--annotate)" }
            }
          >
            {m.label}
          </Link>
        ))}
      </nav>

      {children}

      <footer style={{ borderTop: "1px solid var(--grid-line)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Wordmark />
              <p className="g-annotate mt-3" style={{ color: "var(--muted-soft)" }}>
                Escrow that settles on verified truth.
              </p>
            </div>
            {[
              {
                head: "Product",
                links: [
                  ["How it works", "/how-it-works"],
                  ["Trust & disputes", "/trust"],
                  ["Live demo", "/demo"],
                ],
              },
              {
                head: "App",
                links: [
                  ["The docket", "/agreements"],
                  ["New agreement", "/new"],
                  ["Settings", "/settings"],
                ],
              },
              {
                head: "Protocol",
                links: [
                  ["GenLayer", "https://www.genlayer.com"],
                  ["StudioNet explorer", "https://explorer-studio.genlayer.com"],
                ],
              },
            ].map((col) => (
              <div key={col.head}>
                <div className="g-eyebrow mb-3">{col.head}</div>
                <div className="grid gap-2">
                  {col.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href!}
                      className="text-[13.5px]"
                      style={{ color: "var(--annotate)" }}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p
            className="g-annotate mt-10 pt-6"
            style={{ color: "var(--muted-soft)", borderTop: "1px solid var(--grid-line)" }}
          >
            Prototype of evidence-settled escrow on GenLayer StudioNet.
            Financial parameters are experimental — not legal or underwriting
            standards.
          </p>
        </div>
      </footer>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="max-w-[1280px] mx-auto px-6 pt-20 pb-14">
      <div className="max-w-[760px]">
        <div className="g-eyebrow mb-3">{eyebrow}</div>
        <h1 className="g-display-lg">{title}</h1>
        <p className="g-body-lg mt-4">{lead}</p>
      </div>
    </section>
  );
}

export function CtaBand({ title }: { title: string }) {
  return (
    <section className="max-w-[1280px] mx-auto px-6 py-20">
      <div className="g-band-yellow text-center" style={{ padding: 56 }}>
        <h2 className="g-display-md" style={{ color: "var(--on-primary)" }}>
          {title}
        </h2>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link
            href="/new"
            className="g-btn"
            style={{ background: "#ffffff", color: "var(--ink)" }}
          >
            Define a milestone
          </Link>
          <Link
            href="/agreements"
            className="g-btn"
            style={{ border: "1px solid rgba(255,255,255,0.55)", color: "var(--on-primary)" }}
          >
            See live agreements
          </Link>
        </div>
      </div>
    </section>
  );
}
