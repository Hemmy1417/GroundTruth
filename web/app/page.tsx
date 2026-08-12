import Link from "next/link";
import { MarketingShell, CtaBand } from "@/components/marketing";

/**
 * Home — focused: 7/5 hero with the judgment code-window, honest stat
 * callouts, the primitive in three cards, and page link-outs. Depth lives on
 * /how-it-works, /trust, and /demo.
 */

function JudgmentWindow() {
  return (
    <div className="g-code-window" aria-label="Example on-chain judgment">
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--muted-soft)" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--dispute)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--refund)" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--verify)" }} />
        <span className="ml-2 text-[11.5px]">get_evaluation(7) — judged under consensus</span>
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

export default function Home() {
  return (
    <MarketingShell>
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
              <Link href="/how-it-works" className="g-btn g-btn-ink">
                How it works
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

      {/* the primitive — 3-up dark cards, each linking deeper */}
      <section
        style={{
          background: "var(--surface-soft)",
          borderTop: "1px solid var(--grid-line)",
          borderBottom: "1px solid var(--grid-line)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="g-eyebrow mb-6">One deep primitive</div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              [
                "01 · Define & escrow",
                "Condition, deadline, release threshold, partial floor, evidence sources — frozen by mutual assent. The payer funds; the payee signs on; nobody holds keys.",
                "/how-it-works",
              ],
              [
                "02 · Judge & show",
                "Validators fetch the sources, sanitize, hash, and judge the completion level. Every field the money reads is agreed under consensus.",
                "/trust",
              ],
              [
                "03 · Dispute & settle",
                "One bonded challenge; a second panel re-judges the RECORDED dossier. Then a versioned table splits the escrow — no model authors an amount.",
                "/trust",
              ],
            ].map(([t, d, href]) => (
              <Link key={t} href={href!} className="g-card block" style={{ padding: 32 }}>
                <div className="g-title-md">{t}</div>
                <p className="g-caption mt-2.5">{d}</p>
                <span className="g-link text-[13.5px] mt-3 inline-block">Read more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* demo teaser */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-4 items-stretch">
          <div className="g-band-yellow" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-2" style={{ color: "rgba(10,10,10,0.6)" }}>
              Flagship demo
            </div>
            <h2 className="g-display-sm" style={{ color: "var(--on-primary)" }}>
              Harborview Tower — release 3 GEN at 90% structural completion.
            </h2>
            <p className="mt-3 text-[14.5px]" style={{ color: "rgba(10,10,10,0.8)", lineHeight: 1.55 }}>
              Three acts: 60% judged provisional, 95% satisfied then challenged
              (“the inspection was preliminary”), and a certified final that
              settles for real. Every act runs the production machinery.
            </p>
            <Link
              href="/demo"
              className="g-btn mt-5"
              style={{ background: "#ffffff", color: "var(--ink)" }}
            >
              Walk the demo
            </Link>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-4">Why GenLayer</div>
            <p className="g-caption">
              A deterministic contract cannot read an inspection registry. A
              single AI backend could — but then one company&apos;s model
              decides who gets paid. GenLayer sits exactly in the gap:
              independent validators each run the judgment and must agree on
              every decisive field before state can change. The escrow makes
              the judgment load-bearing; the deterministic table keeps money
              out of the model&apos;s hands.
            </p>
            <Link href="/trust" className="g-link text-[13.5px] mt-3 inline-block">
              The full trust model →
            </Link>
          </div>
        </div>
      </section>

      <CtaBand title="Put money on what actually happens." />
    </MarketingShell>
  );
}
