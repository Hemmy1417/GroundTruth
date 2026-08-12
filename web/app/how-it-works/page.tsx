import { MarketingShell, PageHero, CtaBand } from "@/components/marketing";

/**
 * How it works — the lifecycle in depth: the six steps, the threshold-native
 * settlement shape, the timing rule, and the negotiation escape hatch.
 */

const STEPS: [string, string, string][] = [
  [
    "Define",
    "The Milestone Builder turns a vague event into a structured condition: a judgment question, a completion metric, a deadline, a release threshold with an optional partial floor, and 1–4 public evidence sources.",
    "A live contract preview and the completion gauge show the deal's exact shape — and what every completion level would pay — before anything is signed.",
  ],
  [
    "Escrow & assent",
    "One payable transaction creates and funds the agreement. It arms only when the payee accepts — the evidence list binds them, so their assent freezes it (mutual consent, on-chain).",
    "Until assent, the payer can cancel for a full refund. No keys are ever held by GroundTruth.",
  ],
  [
    "Judge",
    "Anyone may request an evaluation. The contract itself fetches each registered source, delimiter-sanitizes it, truncates, hashes, and puts the bundle before the validator panel with one deadline-aware question.",
    "Independent validators re-run the entire fetch-and-judge task. Verdict, completion bucket, and evidence sufficiency must agree exactly before anything is recorded.",
  ],
  [
    "Arm & challenge",
    "A conclusive verdict opens a 72-hour challenge window — settle is impossible inside it, challenge impossible after it (the same clock comparison, negated: no race).",
    "Either party may challenge with a 1 GEN bond, a statement (context, never evidence), and new sources snapshotted at filing.",
  ],
  [
    "Re-judge the record",
    "The second panel judges the RECORDED dossier — the exact excerpts the first panel saw, stored on-chain — plus the challenge exhibits. A fresh refetch is included only to make post-ruling edits visible.",
    "Verdict changed → bond home, corrected verdict settles. Unchanged → bond forfeits to the counterparty. Panel can't decide → original stands, bond home: uncertainty never punishes.",
  ],
  [
    "Settle",
    "A versioned, deterministic table splits the escrow from the agreed completion bucket: full release at the threshold, pro-rata above the floor, refund below. The caller earns a 0.5% keeper bounty — agreements close themselves.",
    "No model ever authors an amount. The settlement card shows the exact table row that fired.",
  ],
];

export default function HowItWorks() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="How it works"
        title="From a vague promise to a self-settling agreement."
        lead="Six steps, one object. Everything decisive is either agreed under validator consensus or computed by deterministic code — nothing in between."
      />

      {/* the six steps */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="grid gap-4">
          {STEPS.map(([t, d1, d2], i) => (
            <div key={t} className="g-card grid md:grid-cols-12 gap-4" style={{ padding: 28 }}>
              <div className="md:col-span-3 flex items-start gap-3">
                <span className="g-stat" style={{ fontSize: 34 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="g-title-md mt-1.5">{t}</span>
              </div>
              <p className="g-caption md:col-span-5">{d1}</p>
              <p className="g-annotate md:col-span-4">{d2}</p>
            </div>
          ))}
        </div>
      </section>

      {/* threshold-native */}
      <section
        style={{
          background: "var(--surface-soft)",
          borderTop: "1px solid var(--grid-line)",
          borderBottom: "1px solid var(--grid-line)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="g-eyebrow mb-3">Threshold-native</div>
            <h2 className="g-display-md">Real projects aren&apos;t done / not-done.</h2>
            <p className="g-caption mt-4">
              Every agreement is a judged completion level (0–100, five-point
              buckets) against a release threshold and an optional partial
              floor. Full release at the threshold; pro-rata to the judged
              level between floor and threshold; refund below the floor.
              Binary YES/NO is just threshold = 100% with no floor — one
              engine, no special cases.
            </p>
            <p className="g-caption mt-3">
              <strong style={{ color: "var(--body-strong)" }}>The timing rule:</strong>{" "}
              early completion pays early — a SATISFIED verdict settles whenever
              it lands. An early miss is <em>provisional</em>: “not yet” is not
              “failed”, and nothing settles on a miss before the deadline.
              Deadline passed with no conclusive verdict? A grace period, then
              anyone can trigger the refund — escrow is never trapped.
            </p>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-4">The deal&apos;s shape</div>
            <div className="relative" style={{ height: 56 }}>
              <div
                className="absolute left-0 right-0 top-4 flex overflow-hidden rounded"
                style={{ height: 14 }}
              >
                <div style={{ width: "60%", background: "var(--refund-soft)" }} />
                <div style={{ width: "30%", background: "var(--accent-soft)" }} />
                <div style={{ flex: 1, background: "var(--verify-soft)" }} />
              </div>
              <div className="absolute" style={{ left: "60%", top: 0, width: 2, height: 34, background: "var(--grid-strong)" }} />
              <div className="absolute" style={{ left: "90%", top: 0, width: 2, height: 34, background: "var(--primary)" }} />
              <div className="absolute g-mono g-annotate" style={{ top: 38, left: "60%", transform: "translateX(-50%)" }}>
                △ 60 floor
              </div>
              <div
                className="absolute g-mono"
                style={{ top: 38, left: "90%", transform: "translateX(-50%)", fontSize: 11, color: "var(--primary)" }}
              >
                ▲ 90 release
              </div>
            </div>
            <div className="mt-8" style={{ overflowX: "auto" }}>
              <table className="g-table" style={{ minWidth: 420 }}>
                <thead>
                  <tr>
                    <th>Judged completion</th>
                    <th>Rule</th>
                    <th>3 GEN escrow pays</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="g-mono">≥ 90%</td>
                    <td>FULL RELEASE</td>
                    <td className="g-mono">payee 2.985 (after 0.5% keeper)</td>
                  </tr>
                  <tr>
                    <td className="g-mono">60–85%</td>
                    <td>PRO RATA</td>
                    <td className="g-mono">payee = bucket% of pool, rest refunds</td>
                  </tr>
                  <tr>
                    <td className="g-mono">&lt; 60%</td>
                    <td>REFUND</td>
                    <td className="g-mono">payer 2.985, keeper 0.015</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* negotiation */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-2">Settle without the panel</div>
            <p className="g-caption">
              Either party can propose a split of the escrow at any point —
              the counterparty accepts and it settles immediately, rule
              NEGOTIATED, no panel involved. Acceptance is id-checked, so a
              replaced proposal can never be accepted by surprise. Mid-dispute
              settlements send the challenge bond home. This is how real
              arbitration works: most cases settle out of court <em>because</em>{" "}
              the tribunal is credible.
            </p>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-2">Overruns are normal, not disputes</div>
            <p className="g-caption">
              Construction slips. Either party can propose a later deadline;
              the other accepts and it moves — both-consent only, so nobody can
              move the window alone. Agreements also carry an optional project
              tag, grouping milestones into tranched project finance
              (“Harborview Tower — Milestones 1–3”).
            </p>
          </div>
        </div>
      </section>

      <CtaBand title="Define your first milestone in five minutes." />
    </MarketingShell>
  );
}
