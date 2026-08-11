"use client";

/**
 * MilestoneBuilder — the signature wizard: vague event in, structured
 * contract out. Left, the form (4 steps); right, a live contract preview
 * rendered as an engineering document, with the CompletionGauge reacting to
 * the sliders so you SEE the deal's shape before signing. One payable tx.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress } from "viem";
import { useWallet } from "@/lib/wallet";
import { useTx } from "@/lib/tx";
import { createAgreement, getStats } from "@/lib/chain/groundtruth";
import { CompletionGauge } from "@/components/CompletionGauge";
import { TitleBlock } from "@/components/ui";
import { ConnectButton } from "@/components/shell";
import { dateInputToEpoch, formatEpoch, parseGen, pct } from "@/lib/format";

const STEPS = ["Condition", "Money", "Evidence", "Review & fund"] as const;

/**
 * Optional URL prefill (?demo=harborview&act=1|2|3) — the /demo page's
 * "recreate the demo" links land here with the whole Harborview agreement
 * filled in. Read once at mount from window.location (client-only page; no
 * Suspense/searchParams machinery needed).
 */
function initialForm() {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get("demo") !== "harborview") return null;
  const act = ["1", "2", "3"].includes(q.get("act") ?? "") ? q.get("act") : "1";
  const origin = window.location.origin;
  const in30d = new Date(Date.now() + 30 * 86400_000);
  return {
    title: `Harborview Tower — Milestone 3 (act ${act})`,
    question:
      "Has Harborview Tower reached certified structural completion per the building-control registry?",
    metric: "structural completion percentage",
    deadline: in30d.toISOString().slice(0, 10),
    projectTag: "Harborview Tower",
    amount: "3",
    threshold: 90,
    floor: 60,
    sourcesText: `${origin}/api/demo/harborview/progress?act=${act}\n${origin}/api/demo/harborview/inspection?act=${act}`,
  };
}

export default function NewAgreementPage() {
  const { address, client } = useWallet();
  const { run, tx } = useTx();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefill] = useState(initialForm);

  // condition
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [question, setQuestion] = useState(prefill?.question ?? "");
  const [metric, setMetric] = useState(prefill?.metric ?? "");
  const [deadline, setDeadline] = useState(prefill?.deadline ?? "");
  const [projectTag, setProjectTag] = useState(prefill?.projectTag ?? "");
  // money
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState(prefill?.amount ?? "1");
  const [threshold, setThreshold] = useState(prefill?.threshold ?? 90);
  const [floorOn, setFloorOn] = useState(true);
  const [floor, setFloor] = useState(prefill?.floor ?? 60);
  // evidence
  const [sourcesText, setSourcesText] = useState(prefill?.sourcesText ?? "");

  const amountAtto = parseGen(amount) ?? 0n;
  const deadlineEpoch = deadline ? dateInputToEpoch(deadline) : 0;
  // stable per mount — render purity (revalidated on-chain at signing anyway)
  const [mountedAt] = useState(() => Math.floor(Date.now() / 1000));
  const sources = useMemo(
    () =>
      sourcesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [sourcesText],
  );
  const effFloor = floorOn ? floor : 0;

  const stepValid = [
    title.trim().length >= 3 &&
      question.trim().length >= 10 &&
      metric.trim().length >= 3 &&
      deadlineEpoch > mountedAt + 600,
    isAddress(payee) &&
      payee.toLowerCase() !== address.toLowerCase() &&
      amountAtto > 0n &&
      threshold >= 5 &&
      (!floorOn || floor < threshold),
    sources.length >= 1 &&
      sources.length <= 4 &&
      sources.every((s) => /^https?:\/\/\S+$/.test(s) && s.length <= 300),
    true,
  ];

  async function submit() {
    if (!client) return;
    const ok = await run({
      label: "Create agreement",
      effect: "Escrow funded — awaiting payee assent.",
      write: () =>
        createAgreement(client, {
          payee,
          title: title.trim(),
          question: question.trim(),
          metric: metric.trim(),
          thresholdBps: threshold * 100,
          floorBps: effFloor * 100,
          deadlineEpoch,
          sources,
          projectTag: projectTag.trim(),
          amountAtto,
        }),
      confirmed: async () => {
        const st = await getStats();
        return st.agreements > 0;
      },
      invalidate: [["docket"], ["stats"], ["mine"]],
    });
    if (ok) router.push("/agreements");
  }

  return (
    <div>
      <TitleBlock eyebrow="Milestone builder" title="Define a real-world condition" />

      {/* stepper */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className="g-pill cursor-pointer"
            style={
              i === step
                ? { background: "var(--ink)", color: "var(--canvas)" }
                : i < step
                  ? { background: "var(--verify-soft)", color: "var(--verify)" }
                  : { background: "var(--hold-soft)", color: "var(--annotate)" }
            }
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ── form ── */}
        <div className="g-card">
          {step === 0 && (
            <div className="grid gap-4">
              <div>
                <label className="g-label">Agreement title</label>
                <input
                  className="g-input"
                  placeholder="Harborview Tower — Milestone 3: structural completion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="g-label">
                  The judgment question — what the validator panel will answer
                </label>
                <textarea
                  className="g-textarea"
                  placeholder="Has Harborview Tower reached certified structural completion per the building-control registry?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="g-label">Completion metric (judged 0–100%)</label>
                  <input
                    className="g-input"
                    placeholder="structural completion percentage"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  />
                </div>
                <div>
                  <label className="g-label">Deadline</label>
                  <input
                    type="date"
                    className="g-input"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="g-label">Project tag (optional — groups milestones)</label>
                <input
                  className="g-input"
                  placeholder="Harborview Tower"
                  value={projectTag}
                  onChange={(e) => setProjectTag(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div>
                <label className="g-label">Payee wallet (who receives on satisfaction)</label>
                <input
                  className="g-input g-mono"
                  placeholder="0x…"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                />
              </div>
              <div>
                <label className="g-label">Escrow amount (GEN)</label>
                <input
                  className="g-input g-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="g-label">
                  Release threshold — {threshold}% completion
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setThreshold(t);
                    if (floor >= t) setFloor(Math.max(5, t - 5));
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="g-label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={floorOn}
                    onChange={(e) => setFloorOn(e.target.checked)}
                  />
                  Partial release floor {floorOn ? `— ${floor}%` : "(off — all-or-nothing)"}
                </label>
                {floorOn ? (
                  <input
                    type="range"
                    min={5}
                    max={threshold - 5}
                    step={5}
                    value={floor}
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full"
                  />
                ) : null}
                <p className="g-annotate mt-1">
                  Below the threshold but at/above the floor, the payee is paid
                  pro-rata to the judged completion; the rest refunds. Binary
                  YES/NO is just threshold = 100% with no floor.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div>
                <label className="g-label">Evidence source URLs (one per line, 1–4)</label>
                <textarea
                  className="g-textarea g-mono text-[13px]"
                  rows={5}
                  placeholder={
                    "https://registry.example.gov/permits/HT-2214-C\nhttps://pm.example.com/harborview/progress"
                  }
                  value={sourcesText}
                  onChange={(e) => setSourcesText(e.target.value)}
                />
              </div>
              <div
                className="rounded-lg px-4 py-3"
                style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}
              >
                <p className="text-[13.5px]" style={{ color: "var(--accent-deep)" }}>
                  <strong>Funding freezes this list.</strong> The panel judges
                  only these sources; independent ones (registries, inspection
                  records) carry more evidentiary weight than self-published
                  pages — the panel is told so. The payee must assent before
                  the agreement arms.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3">
              <p className="g-caption">
                One signature creates and funds the agreement. It arms only
                after the payee assents; until then you can cancel for a full
                refund.
              </p>
              {!address ? (
                <ConnectButton />
              ) : (
                <button
                  className="g-btn g-btn-accent w-full"
                  disabled={tx.phase !== "idle" && tx.phase !== "failed"}
                  onClick={() => void submit()}
                >
                  Sign & escrow {amount || "0"} GEN
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              className="g-btn g-btn-outline g-btn-sm"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < 3 ? (
              <button
                className="g-btn g-btn-ink g-btn-sm"
                disabled={!stepValid[step]}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </button>
            ) : null}
          </div>
        </div>

        {/* ── live contract preview ── */}
        <div className="g-card-paper">
          <div className="g-eyebrow mb-3">Contract preview — fills in as you type</div>
          <div className="g-titleblock mb-3">
            <div className="g-display-sm">{title.trim() || "Untitled agreement"}</div>
            {projectTag.trim() ? (
              <div className="g-annotate mt-1">Project: {projectTag.trim()}</div>
            ) : null}
          </div>
          <dl className="grid gap-2 text-[14px]">
            <div>
              <dt className="g-annotate">The panel will be asked</dt>
              <dd className="mt-0.5">{question.trim() || "—"}</dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className="g-annotate">Metric</dt>
                <dd>{metric.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="g-annotate">Deadline</dt>
                <dd className="g-mono">{deadlineEpoch ? formatEpoch(deadlineEpoch) : "—"}</dd>
              </div>
            </div>
            <div>
              <dt className="g-annotate">Watched sources</dt>
              <dd className="g-mono text-[12.5px]">
                {sources.length ? sources.map((s) => <div key={s}>{s}</div>) : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <CompletionGauge
              thresholdBps={threshold * 100}
              floorBps={effFloor * 100}
              amountAtto={amountAtto || 10n ** 18n}
              bucket={null}
              keeperBps={50}
            />
          </div>
          <p className="g-annotate mt-3">
            Settlement is a deterministic table over the judged completion —
            release at {pct(threshold * 100)}
            {effFloor ? `, pro-rata above ${pct(effFloor * 100)}` : ", all-or-nothing"}.
            No model ever authors an amount. Early satisfaction pays early; an
            early miss is provisional, never a failure.
          </p>
        </div>
      </div>
    </div>
  );
}
