import { MarketingShell, PageHero, CtaBand } from "@/components/marketing";

/**
 * Trust & disputes — the honesty contract in depth: what consensus actually
 * pins, how evidence is integrity-bound, how disputes work, and every
 * fail-safe rule. No claim here exceeds what the contract enforces.
 */

export default function Trust() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Trust & disputes"
        title="Every claim on this page is enforced by the contract."
        lead="GroundTruth's rule: consensus decides meaning, code decides money. Here is exactly where the line runs — including what is deliberately OUTSIDE consensus."
      />

      {/* equivalence */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-3">Pinned in validator equivalence</div>
            <div className="grid gap-2">
              {[
                ["verdict", "SATISFIED · NOT_SATISFIED · INCONCLUSIVE"],
                ["completion_bucket", "0–100, multiples of 5 — decides the pro-rata split"],
                ["evidence_sufficient", "gates every conclusive verdict"],
              ].map(([k, d]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ background: "var(--canvas)", border: "1px solid var(--grid-line)" }}
                >
                  <span className="g-mono text-[13.5px]" style={{ color: "var(--ink)" }}>{k}</span>
                  <span className="g-annotate text-right">{d}</span>
                </div>
              ))}
            </div>
            <p className="g-caption mt-4">
              Independent validators re-run the whole fetch-and-judge task and
              must agree on each field exactly. A field a validator can
              silently disagree on is a field that can be gamed — so every
              economically decisive field is inside the equivalence rule.
            </p>
          </div>
          <div className="g-card" style={{ padding: 32 }}>
            <div className="g-eyebrow mb-3">Deliberately OUTSIDE consensus</div>
            <div className="grid gap-2">
              {[
                ["confidence", "the panel's advisory self-assessment"],
                ["reason", "one or two cited sentences, for humans"],
              ].map(([k, d]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg px-4 py-3"
                  style={{ background: "var(--canvas)", border: "1px dashed var(--grid-strong)" }}
                >
                  <span className="g-mono text-[13.5px]" style={{ color: "var(--annotate)" }}>{k}</span>
                  <span className="g-annotate text-right">{d}</span>
                </div>
              ))}
            </div>
            <p className="g-caption mt-4">
              Advisory fields are labeled ADVISORY in the interface and no
              state-changing rule reads them. Structural validation still
              applies to everything: an agreed-upon contradiction (SATISFIED
              below the threshold, a bucket of 47) is rejected as model error —
              consensus can agree on garbage; the boundary refuses it.
            </p>
            <p className="g-annotate mt-3">
              Validator identities and vote counts are protocol-internal on
              StudioNet. GroundTruth never fabricates them.
            </p>
          </div>
        </div>
      </section>

      {/* evidence integrity */}
      <section
        style={{
          background: "var(--surface-soft)",
          borderTop: "1px solid var(--grid-line)",
          borderBottom: "1px solid var(--grid-line)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="max-w-[720px] mb-10">
            <div className="g-eyebrow mb-3">Evidence integrity</div>
            <h2 className="g-display-md">The hash binds exactly the judged bytes.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              [
                "Fetched by the contract",
                "Never party-uploaded. The contract fetches each registered source itself at judgment time; a source only a party can vouch for is a source the panel discounts.",
              ],
              [
                "Sanitized, then hashed",
                "Every '<<<' in fetched content is defanged before hashing — a hostile page cannot close its own evidence block and forge additional sources. The sha256 stored on-chain covers exactly what the panel read.",
              ],
              [
                "Frozen by mutual assent",
                "The source list is fixed when the payee accepts. Only a dispute can introduce new sources — and those are snapshotted at filing, not at reading.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="g-card" style={{ padding: 28 }}>
                <div className="g-title-md">{t}</div>
                <p className="g-caption mt-2.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* dispute machinery */}
      <section className="max-w-[1280px] mx-auto px-6 py-20">
        <div className="max-w-[720px] mb-10">
          <div className="g-eyebrow mb-3">The dispute round</div>
          <h2 className="g-display-md">Built to be fought — once, fairly, with an exit.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            [
              "The second panel judges the RECORD",
              "Excerpts of what the first panel judged are stored on-chain at judgment time. The reassessment reads those exact bytes plus the challenge exhibits — never a refetch as evidence, so nobody can fix the surface after the ruling. A fresh fetch is included only to make tampering visible.",
            ],
            [
              "Bond economics that never punish uncertainty",
              "Verdict changed → challenger's bond returns and the corrected verdict settles. Unchanged → bond forfeits to the counterparty who was dragged through it. Second panel can't decide → original stands and the bond returns. INCONCLUSIVE is a designed outcome, not a loss.",
            ],
            [
              "Strict windows, no races",
              "Challenge is valid strictly inside the 72-hour window; settle strictly after it. The two predicates are the same clock comparison negated — there is no instant where both succeed. The clock itself is two independent sources with a divergence guard; when it's down, everything fails closed.",
            ],
            [
              "A dispute can never trap funds",
              "If a filed dispute is never reassessed, anyone can end it after seven days: original verdict stands, bond refunded. Expired agreements refund the payer after a grace period. Every locked wei has a permissionless way home.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="g-card" style={{ padding: 28 }}>
              <div className="g-title-md">{t}</div>
              <p className="g-caption mt-2.5">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* fail-safe table */}
      <section className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="g-card" style={{ padding: 32 }}>
          <div className="g-eyebrow mb-4">Failure discipline — what happens when things break</div>
          <div style={{ overflowX: "auto" }}>
          <table className="g-table" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th>Failure</th>
                <th>What the contract does</th>
                <th>What it never does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Every source unreachable", "records INCONCLUSIVE with the dark evidence rows; retry after cooldown", "treat an information failure as a finding"],
                ["Model returns garbage", "transaction reverts; nothing recorded", "settle on malformed output"],
                ["Validators disagree", "no consensus — the write fails; retry", "let one leader's answer stand"],
                ["Clock sources down", "windows fail closed; nothing settles or forfeits", "guess the time"],
                ["Dispute never resolves", "permissionless terminal escape after 7d; bond refunded", "strand the bond or the escrow"],
                ["Deadline passes, no verdict", "grace period, then permissionless refund", "trap the escrow"],
              ].map(([a, b, c]) => (
                <tr key={a}>
                  <td style={{ color: "var(--body-strong)" }}>{a}</td>
                  <td>{b}</td>
                  <td style={{ color: "var(--annotate)" }}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <CtaBand title="Read the docket — every judgment is public." />
    </MarketingShell>
  );
}
