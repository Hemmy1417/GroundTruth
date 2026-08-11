import Link from "next/link";
import { Wordmark } from "@/components/shell";

/**
 * Landing — ClickHouse-style structure: black canvas, 7/5 hero with the
 * judgment as the code-window artifact (the judgment IS our query), yellow
 * stat callouts (honest protocol facts, no fabricated numbers), alternating
 * surface bands, yellow CTA band before a dark footer.
 */

function JudgmentWindow() {
  return (
    <div className="g-code-window" aria-label="Example on-chain judgment">
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--muted-soft)" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--dispute)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--refund)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--verify)" }} />
        <span className="ml-2 text-[11.5px]">get_evaluation(7) — agreement #3, judged under consensus</span>
      </div>
      <pre className="whitespace-pre-wrap">
{`{
  `}<span className="tok-key">&quot;judgment&quot;</span>{`: {
    `}<span className="tok-key">&quot;verdict&quot;</span>{`: `}<span className="tok-str">&quot;SATISFIED&quot;</span>{`,        `}<span className="tok-dim">{"// pinned in equivalence"}</span>{`
    `}<span className="tok-key">&quot;completion_bucket&quot;</span>{`: `}<span className="tok-num">95</span>{`,       `}<span className="tok-dim">{"// pinned — decides the split"}</span>{`
    `}<span className="tok-key">&quot;evidence_sufficient&quot;</span>{`: `}<span className="tok-num">true</span>{`,   `}<span className="tok-dim">{"// pinned"}</span>{`
    `}<span className="tok-key">&quot;confidence&quot;</span>{`: `}<span className="tok-str">&quot;HIGH&quot;</span>{`         `}<span className="tok-dim">{"// advisory — outside consensus"}</span>{`
  },
  `}<span className="tok-key">&quot;evidence&quot;</span>{`: [
    { `}<span className="tok-key">&quot;url&quot;</span>{`: `}<span className="tok-str">&quot;registry.gov/HT-2214-C&quot;</span>{`,
      `}<span className="tok-key">&quot;sha256&quot;</span>{`: `}<span className="tok-str">&quot;9f1c…e2a7&quot;</span>{` }  `}<span className="tok-dim">{"// binds the judged bytes"}</span>{`
  ],
  `}<span className="tok-key">&quot;settlement&quot;</span>{`: { `}<span className="tok-key">&quot;rule&quot;</span>{`: `}<span className="tok-str">&quot;FULL_RELEASE&quot;</span>{`, `}<span className="tok-key">&quot;policy&quot;</span>{`: `}<span className="tok-num">1</span>{` }
}`}
      </pre>
    </div>
  );
}

export default function Landing() {
  return (
    <div style={{ background: "var(--canvas)" }}>
      {/* top nav */}
      <header
        className="h-16 flex items-center justify-between px-6"
        style={{ borderBottom: "1px solid var(--grid-line)" }}
      >
        <Wordmark />
        <nav className="hidden md:flex items-center gap-6 text-[14px]" style={{ color: "var(--body)" }}>
          <Link href="/agreements" className="hover:text-white">Docket</Link>
          <Link href="/settings" className="hover:text-white">Settings</Link>
          <span className="g-pill g-pill-outline">STUDIONET</span>
        </nav>
        <Link href="/new" className="g-btn g-btn-accent g-btn-sm">
          Get started
        </Link>
      </header>

      {/* hero — 7/5 split */}
      <section className="max-w-[1280px] mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="g-pill-yellow g-pill mb-5 inline-flex">evidence-settled escrow</span>
            <h1 className="g-display-xl max-w-[560px]">
              Escrow that settles on verified truth.
            </h1>
            <p className="g-body-lg mt-5 max-w-[540px]">
              Define a financial agreement around something happening in the
              real world. GenLayer validators judge the evidence under
              consensus; a deterministic table settles the money; either party
              can challenge before it&apos;s final.
            </p>
            <div className="mt-8 flex gap-3 flex-wrap">
              <Link href="/new" className="g-btn g-btn-accent">
                Define a milestone
              </Link>
              <Link href="/agreements" className="g-btn g-btn-ink">
                Browse the docket
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <JudgmentWindow />
          </div>
        </div>

        {/* stat callouts — honest protocol facts, not invented community numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
          {[
            ["0–100", "judged completion, 5-pt buckets"],
            ["3 fields", "pinned in validator equivalence"],
            ["1 GEN", "bonded challenge, one round"],
            ["100%", "of settlement math deterministic"],
          ].map(([n, d]) => (
            <div key={d}>
              <div className="g-stat">{n}</div>
              <div className="g-annotate mt-1.5">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* problem band — surface-soft */}
      <section style={{ background: "var(--surface-soft)", borderTop: "1px solid var(--grid-line)", borderBottom: "1px solid var(--grid-line)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="max-w-[720px]">
            <div className="g-eyebrow mb-3">The problem</div>
            <h2 className="g-display-md">
              “Release the money when the building is structurally complete”
              is easy to write and hard to execute.
            </h2>
            <p className="g-caption mt-4">
              Smart contracts can hold the money but cannot read an inspection
              registry. Banks and escrow agents can read it — for a fee, on
              their schedule, with their discretion. The condition that decides
              the payment lives in the real world: progress reports,
              registries, certificates — ambiguous, conflicting, occasionally
              forged. Someone has to <em style={{ color: "var(--body-strong)" }}>judge</em> it.
            </p>
          </div>
        </div>
      </section>

      {/* the primitive — 3-up dark cards */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <div className="g-eyebrow mb-6">One deep primitive</div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            ["01 · Define & escrow", "Condition, deadline, release threshold, partial floor, evidence sources — frozen by mutual assent. The payer funds; the payee signs on; nobody holds keys."],
            ["02 · Judge & show", "Validators fetch the sources, sanitize, hash, and judge the completion level. Every field the money reads is agreed under consensus; hashes bind the judged bytes."],
            ["03 · Dispute & settle", "One bonded challenge; a second panel re-judges the RECORDED dossier. Then a versioned table splits the escrow — no model ever authors an amount."],
          ].map(([t, d]) => (
            <div key={t} className="g-card" style={{ padding: 32 }}>
              <div className="g-title-md">{t}</div>
              <p className="g-caption mt-2.5">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* threshold-native — yellow feature card + gauge sketch */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-2 gap-4 items-stretch">
          <div className="g-band-yellow" style={{ padding: 32 }}>
            <div
              className="g-eyebrow mb-2"
              style={{ color: "rgba(10,10,10,0.6)" }}
            >
              Threshold-native
            </div>
            <h2 className="g-display-sm" style={{ color: "var(--on-primary)" }}>
              Real projects aren&apos;t done / not-done.
            </h2>
            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(10,10,10,0.8)", lineHeight: 1.55 }}>
              Every agreement is a judged completion level against a release
              threshold and an optional partial floor: full release at the
              threshold, pro-rata in between, refund below. Binary YES/NO is
              just threshold = 100%. Early completion pays early; an early miss
              is provisional — “not yet” is not “failed”.
            </p>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-4">The deal&apos;s shape</div>
            <div className="relative" style={{ height: 56 }}>
              <div className="absolute left-0 right-0 top-4 flex overflow-hidden rounded" style={{ height: 14 }}>
                <div style={{ width: "60%", background: "var(--refund-soft)" }} />
                <div style={{ width: "30%", background: "var(--accent-soft)" }} />
                <div style={{ flex: 1, background: "var(--verify-soft)" }} />
              </div>
              <div className="absolute" style={{ left: "60%", top: 0, width: 2, height: 34, background: "var(--grid-strong)" }} />
              <div className="absolute" style={{ left: "90%", top: 0, width: 2, height: 34, background: "var(--primary)" }} />
              <div className="absolute g-mono g-annotate" style={{ top: 38, left: "60%", transform: "translateX(-50%)" }}>△ 60</div>
              <div className="absolute g-mono" style={{ top: 38, left: "90%", transform: "translateX(-50%)", fontSize: 11, color: "var(--primary)" }}>▲ 90</div>
            </div>
            <p className="g-annotate mt-5">
              “Release 3 GEN at 90% structural completion, pro-rata above
              60%.” Judged 75%? The table pays 2.24 to the payee, refunds the
              rest — deterministically.
            </p>
          </div>
        </div>
      </section>

      {/* honesty + dispute — 2-up on soft band */}
      <section style={{ background: "var(--surface-soft)", borderTop: "1px solid var(--grid-line)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-20 grid md:grid-cols-2 gap-4">
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-2">Consensus, shown honestly</div>
            <p className="g-caption">
              Every field the money reads — verdict, completion bucket,
              evidence sufficiency — is pinned inside validator equivalence:
              independent validators re-run the whole fetch-and-judge task and
              must agree on each one. Advisory fields are labeled advisory.
              Evidence is fetched by the contract itself, delimiter-sanitized,
              and hash-bound. No validator counts are ever invented.
            </p>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-2">Built to be fought</div>
            <p className="g-caption">
              Either party can challenge a verdict inside the window with a
              1 GEN bond and new evidence, snapshotted at filing. A second
              panel judges the RECORDED dossier — not a refetch, so nobody can
              fix the surface after the ruling. Unresolved disputes have a
              permissionless terminal escape; uncertainty never forfeits a
              bond. And most fights should end before the panel: propose a
              split, the other side accepts, done.
            </p>
          </div>
        </div>
      </section>

      {/* yellow CTA band */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <div className="g-band-yellow text-center" style={{ padding: 64 }}>
          <h2 className="g-display-md" style={{ color: "var(--on-primary)" }}>
            Put money on what actually happens.
          </h2>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link
              href="/new"
              className="g-btn"
              style={{ background: "var(--canvas)", color: "var(--on-dark)" }}
            >
              Define a milestone
            </Link>
            <Link
              href="/agreements"
              className="g-btn"
              style={{ border: "1px solid rgba(10,10,10,0.4)", color: "var(--on-primary)" }}
            >
              See live agreements
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--grid-line)" }}>
        <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-wrap items-center justify-between gap-4">
          <Wordmark />
          <div className="g-annotate" style={{ color: "var(--muted-soft)" }}>
            Prototype of evidence-settled escrow on GenLayer StudioNet.
            Financial parameters are experimental — not legal or underwriting
            standards.
          </div>
        </div>
      </footer>
    </div>
  );
}
