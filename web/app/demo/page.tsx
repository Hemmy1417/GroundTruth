import Link from "next/link";
import { MarketingShell, PageHero } from "@/components/marketing";

/**
 * Live demo — the Harborview Tower walkthrough: three acts, honest about
 * what's demo-controlled (the evidence pages) and what's production (all of
 * the machinery). The acts are addressable URLs anyone can open.
 */

const ACTS: {
  n: string;
  title: string;
  world: string;
  machine: string;
  urls: [string, string][];
  tone: string;
}[] = [
  {
    n: "Act 1",
    title: "60% — provisional, nothing moves",
    world:
      "The monthly progress report reads 60% structural completion; the building-control registry shows no completion inspection on record.",
    machine:
      "The panel judges NOT_SATISFIED @ 60. The deadline hasn't passed, so the verdict is PROVISIONAL — recorded with hash-bound evidence, gauge shows the would-pay split (1.79 GEN pro-rata), and nothing settles. “Not yet” is not “failed”.",
    urls: [
      ["progress report", "/api/demo/harborview/progress?act=1"],
      ["inspection registry", "/api/demo/harborview/inspection?act=1"],
    ],
    tone: "var(--hold)",
  },
  {
    n: "Act 2",
    title: "95% — satisfied, then challenged",
    world:
      "The report reaches 95% with an engineer's inspection note; the registry says the note is PRELIMINARY — certificate pending. A lender's audit note argues the milestone should not count until certification is lodged.",
    machine:
      "The panel judges SATISFIED @ 95 → the challenge window arms. The payer challenges with a 1 GEN bond, citing the audit note (snapshotted at filing). A second panel re-judges the RECORDED dossier plus the exhibit — the dispute room shows both sides.",
    urls: [
      ["progress report", "/api/demo/harborview/progress?act=2"],
      ["inspection registry", "/api/demo/harborview/inspection?act=2"],
      ["lender's audit note (challenge exhibit)", "/api/demo/harborview/audit"],
    ],
    tone: "var(--dispute)",
  },
  {
    n: "Act 3",
    title: "Certified — settles for real",
    world:
      "The final inspection passes with the independent checker's countersignature; the certificate is lodged at building control. The registry reads CERTIFIED.",
    machine:
      "The panel confirms SATISFIED @ 100 with certified evidence. After the window, anyone settles: the deterministic table releases the escrow to the payee, the caller earns the 0.5% keeper bounty, and the settlement card shows the exact rule that fired.",
    urls: [
      ["progress report", "/api/demo/harborview/progress?act=3"],
      ["inspection registry", "/api/demo/harborview/inspection?act=3"],
    ],
    tone: "var(--verify)",
  },
];

export default function Demo() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Live demo"
        title="Harborview Tower, in three acts."
        lead="A payer escrows GEN against certified structural completion (release at 90%, pro-rata floor 60%). The world changes; the agreement follows — judgment, dispute, settlement, all on-chain."
      />

      {/* honesty statement — first, not buried */}
      <section className="max-w-[1280px] mx-auto px-6 pb-10">
        <div
          className="rounded-xl px-6 py-5"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--primary)" }}
        >
          <p className="text-[14px]" style={{ color: "var(--body-strong)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--primary)" }}>Honesty statement.</strong>{" "}
            The evidence pages below are served by this app and switched
            between acts — a live demo cannot wait for a real tower to be
            built. <em>Everything else is production machinery</em>: the
            contract fetches these pages itself, hashes the exact bytes,
            independent validators re-judge the task under consensus, and the
            deterministic table settles real GEN. Open any URL — what you see
            is exactly what the panel reads.
          </p>
        </div>
      </section>

      {/* the acts */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20 grid gap-4">
        {ACTS.map((act) => (
          <div
            key={act.n}
            className="g-card grid lg:grid-cols-12 gap-5"
            style={{ padding: 28, borderLeft: `3px solid ${act.tone}` }}
          >
            <div className="lg:col-span-3">
              <div className="g-eyebrow" style={{ color: act.tone }}>{act.n}</div>
              <div className="g-title-md mt-1.5">{act.title}</div>
              <div className="grid gap-1.5 mt-4">
                {act.urls.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="g-mono text-[12px] g-link"
                  >
                    {label} ↗
                  </a>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="g-eyebrow mb-1.5">The world says</div>
              <p className="g-caption">{act.world}</p>
            </div>
            <div className="lg:col-span-5">
              <div className="g-eyebrow mb-1.5">The machine does</div>
              <p className="g-caption">{act.machine}</p>
            </div>
          </div>
        ))}
      </section>

      {/* run it yourself */}
      <section
        style={{
          background: "var(--surface-soft)",
          borderTop: "1px solid var(--grid-line)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="g-eyebrow mb-3">Run it yourself</div>
              <h2 className="g-display-md">The demo is just an agreement.</h2>
              <p className="g-caption mt-4">
                There is no demo mode. Create an agreement in the Milestone
                Builder pointing at the act URLs above (they are public — the
                validators fetch them like any other web page), set release 90
                / floor 60, have the payee accept, and press{" "}
                <span className="g-mono">Request evaluation</span>. Move
                between acts by creating the next agreement against the next
                act&apos;s URLs — every step is a real consensus round on
                StudioNet.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <Link href="/new" className="g-btn g-btn-accent">
                  Recreate the demo
                </Link>
                <Link href="/agreements" className="g-btn g-btn-ink">
                  Watch the docket
                </Link>
              </div>
            </div>
            <div className="g-code-window">
              <div className="mb-2" style={{ color: "var(--muted-soft)" }}>
                <span className="text-[11.5px]">the demo agreement, as the builder assembles it</span>
              </div>
              <pre className="whitespace-pre-wrap">
{`title      `}<span className="tok-str">&quot;Harborview Tower — Milestone 3&quot;</span>{`
question   `}<span className="tok-str">&quot;Certified structural completion?&quot;</span>{`
threshold  `}<span className="tok-num">90%</span>{`   floor  `}<span className="tok-num">60%</span>{`
escrow     `}<span className="tok-num">3 GEN</span>{`
sources    `}<span className="tok-str">&quot;…/progress?act=1&quot;</span>{`
           `}<span className="tok-str">&quot;…/inspection?act=1&quot;</span>{`
`}<span className="tok-dim">{"// funding freezes the list; payee assent arms it"}</span>
              </pre>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
