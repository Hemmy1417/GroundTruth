"use client";

/**
 * The Agreement File — redesigned to a calm, hero-first, progressive-
 * disclosure layout: understand the state in 3 seconds (status + the number
 * + one line + one action), quiet supporting rows, and everything technical
 * (evidence, consensus, lifecycle, dispute record, IDs) tucked behind
 * "Advanced details". All chain logic is preserved from the prior version.
 */
import { use as usePromise, useMemo, useState } from "react";
import Link from "next/link";
import { useAgreement, useConfig, useEvaluationSet, useEvidenceSet } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { useTx } from "@/lib/tx";
import {
  acceptAgreement,
  acceptProposal,
  cancelProposed,
  challenge as challengeTx,
  evaluate as evaluateTx,
  expireRefund,
  getAgreement,
  proposeExtension,
  proposeSplit,
  reassess as reassessTx,
  resolveStaleDispute,
  settle as settleTx,
  withdrawProposal,
} from "@/lib/chain/groundtruth";
import type { AgreementView, EvaluationView, EvidenceView } from "@/lib/chain/types";
import { CompletionGauge } from "@/components/CompletionGauge";
import { LifecycleRail } from "@/components/LifecycleRail";
import { ConsensusPanel } from "@/components/ConsensusPanel";
import { EvidenceRegistry } from "@/components/EvidenceRegistry";
import { DisputeRoom } from "@/components/DisputeRoom";
import { Badge, Disclosure, Row, Section, Skeleton } from "@/components/kit";
import { dateInputToEpoch, formatEpoch, formatGen, pct, shortAddr, timeLeft } from "@/lib/format";
import { GEN, explorerTxUrl } from "@/lib/chain/config";

type Hero = {
  tone: "success" | "warning" | "danger" | "pending" | "neutral";
  status: string;
  num?: string;
  numLabel?: string;
  line: string;
};

function deriveHero(a: AgreementView, latest: EvaluationView | null): Hero {
  const s = a.settlement;
  if (a.state === "SETTLED") {
    const payee = BigInt(s.payee_atto), payer = BigInt(s.payer_atto);
    const win = payee >= payer;
    return {
      tone: "success",
      status: s.rule === "NEGOTIATED" ? "Settled by agreement" : "Milestone settled",
      num: `${formatGen(win ? s.payee_atto : s.payer_atto)} GEN`,
      numLabel: win ? "released to payee" : "refunded to payer",
      line:
        s.rule === "NEGOTIATED"
          ? "Both parties agreed a split — no panel needed."
          : latest
            ? `Consensus judged ${latest.judgment.completion_bucket}% against a ${pct(a.threshold_bps)} release threshold.`
            : `Deterministic settlement, policy v${s.policy_version}.`,
    };
  }
  if (a.state === "EXPIRED")
    return { tone: "warning", status: "Expired", num: `${formatGen(s.payer_atto)} GEN`, numLabel: "refunded to payer", line: "The deadline passed with no conclusive verdict." };
  if (a.state === "CANCELLED")
    return { tone: "neutral", status: "Cancelled", num: `${formatGen(s.payer_atto)} GEN`, numLabel: "refunded", line: "Cancelled before the payee accepted." };
  if (a.state === "PROPOSED")
    return { tone: "pending", status: "Awaiting the payee", num: `${formatGen(a.amount_atto)} GEN`, numLabel: "in escrow", line: "The payee must accept before the agreement is active." };
  if (a.state === "DISPUTED")
    return { tone: "danger", status: "Under dispute", num: `${formatGen(a.amount_atto)} GEN`, numLabel: "in escrow", line: "A challenge was filed — a second panel judges the recorded evidence." };
  if (a.state === "ARMED")
    return {
      tone: "pending",
      status: latest?.judgment.verdict === "SATISFIED" ? "Satisfied — challenge window open" : "Ruled — challenge window open",
      num: latest ? `${latest.judgment.completion_bucket}%` : undefined,
      numLabel: latest ? "judged completion" : undefined,
      line: `${timeLeft(a.dispute.window_ends)} to challenge, then anyone can settle.`,
    };
  // FUNDED
  if (latest?.provisional)
    return { tone: "neutral", status: "Not yet satisfied", num: `${latest.judgment.completion_bucket}%`, numLabel: "judged so far", line: "“Not yet” is not “failed” — nothing settles before the deadline." };
  if (latest?.judgment.verdict === "INCONCLUSIVE")
    return { tone: "neutral", status: "Inconclusive", line: "The panel couldn’t establish the completion level. Nothing moved — evaluate again when the evidence is clearer." };
  return { tone: "pending", status: "Active", num: `${formatGen(a.amount_atto)} GEN`, numLabel: "in escrow", line: "Ready for evaluation against the registered evidence." };
}

const TONE_ICON: Record<Hero["tone"], React.ReactNode> = {
  success: <span style={{ color: "var(--success)" }}>✓</span>,
  danger: <span style={{ color: "var(--danger)" }}>!</span>,
  warning: <span style={{ color: "var(--warning)" }}>↩</span>,
  pending: <span style={{ color: "var(--accent)" }}>◷</span>,
  neutral: <span style={{ color: "var(--muted)" }}>—</span>,
};

export default function AgreementFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = usePromise(params);
  const id = Number(idStr);
  const agreement = useAgreement(Number.isFinite(id) ? id : null);
  const a = agreement.data ?? null;

  const evalQueries = useEvaluationSet(a?.evaluation_ids);
  const evaluations = useMemo(
    () => evalQueries.map((q) => q.data).filter((e): e is EvaluationView => Boolean(e)),
    [evalQueries],
  );
  const evidenceIds = useMemo(() => {
    const ids = new Set<number>();
    for (const ev of evaluations) ev.evidence_ids.forEach((i) => ids.add(i));
    return [...ids];
  }, [evaluations]);
  const evidenceQueries = useEvidenceSet(evidenceIds);
  const evidence = useMemo(() => {
    const m = new Map<number, EvidenceView>();
    for (const q of evidenceQueries) if (q.data) m.set(q.data.id, q.data);
    return m;
  }, [evidenceQueries]);

  if (agreement.isLoading) {
    return (
      <div className="wrap-read stack">
        <Skeleton h={22} w={180} />
        <div className="card-hero stack-s"><Skeleton h={28} w={220} /><Skeleton h={48} w={260} /></div>
        <Skeleton h={200} />
      </div>
    );
  }
  if (!a) {
    return (
      <div className="wrap-read" style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
        <div className="t-h2">Agreement not found</div>
        <p className="t-body mt-2">It may have been created against a different contract.</p>
        <Link href="/agreements" className="link mt-5 inline-block">← Back to agreements</Link>
      </div>
    );
  }

  const latest = evaluations.find((e) => e.id === a.latest_eval_id) ?? null;
  const challenged = evaluations.filter((e) => !e.provisional && e.kind === "INITIAL").at(-1) ?? null;
  const reassessment = a.dispute.reassess_eval_id ? evaluations.find((e) => e.id === a.dispute.reassess_eval_id) ?? null : null;
  const hero = deriveHero(a, latest);
  const evCount = evidence.size;

  return (
    <div className="wrap-read sections">
      {/* breadcrumb + identity */}
      <div>
        <Link href="/agreements" className="t-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          ← Agreements
        </Link>
        <h1 className="t-title mt-3">{a.title}</h1>
        {a.project_tag ? <p className="t-meta mt-1">{a.project_tag}</p> : null}
      </div>

      {/* PRIMARY — the hero: state in 3 seconds */}
      <div className="card-hero">
        <Badge tone={hero.tone} dot>{hero.status}</Badge>
        {hero.num ? (
          <div className="mt-5">
            <div className="t-num t-num-xl">{hero.num}</div>
            {hero.numLabel ? <div className="t-small mt-1">{hero.numLabel}</div> : null}
          </div>
        ) : (
          <div className="mt-4 t-num t-num-lg" aria-hidden style={{ color: "var(--muted)" }}>{TONE_ICON[hero.tone]}</div>
        )}
        <p className="t-body mt-3" style={{ maxWidth: 460, margin: "12px auto 0" }}>{hero.line}</p>
        <div className="mt-6 flex justify-center">
          <ActionsPanel a={a} latest={latest} />
        </div>
      </div>

      {/* SECONDARY — the agreement, as quiet rows */}
      <Section title="Agreement">
        <div>
          <Row k="Payer" mono>{shortAddr(a.payer)}</Row>
          <Row k="Payee" mono>{shortAddr(a.payee)}</Row>
          <Row k="Escrow">{formatGen(a.amount_atto)} GEN</Row>
          <Row k="Release threshold">{pct(a.threshold_bps)}{a.floor_bps > 0 ? ` · floor ${pct(a.floor_bps)}` : ""}</Row>
          <Row k="Deadline">{formatEpoch(a.deadline)}{a.state === "FUNDED" ? ` · ${timeLeft(a.deadline)} left` : ""}</Row>
        </div>
        <p className="t-small mt-4" style={{ color: "var(--ink-2)" }}>{a.question}</p>
      </Section>

      {/* the gauge — the deal's shape, one calm visual */}
      {latest || a.floor_bps >= 0 ? (
        <Section title="Completion">
          <CompletionGauge
            thresholdBps={a.threshold_bps}
            floorBps={a.floor_bps}
            amountAtto={BigInt(a.amount_atto)}
            bucket={latest && latest.judgment.verdict !== "INCONCLUSIVE" ? latest.judgment.completion_bucket : null}
            keeperBps={50}
          />
        </Section>
      ) : null}

      {/* negotiation — only when it applies */}
      <NegotiationPanel a={a} />

      {/* dispute room — only when a dispute exists (it self-hides otherwise) */}
      <DisputeRoom agreement={a} challenged={challenged} reassessment={reassessment} evidence={evidence} />

      {/* TERTIARY — everything technical, progressively disclosed */}
      <div>
        {latest ? (
          <Disclosure label="Consensus & judgment" defaultOpen={a.state === "SETTLED"}>
            <ConsensusPanel evaluation={latest} />
          </Disclosure>
        ) : null}
        <Disclosure label="Evidence" count={evCount ? `${evCount} recorded` : "none yet"}>
          <EvidenceRegistry evaluations={evaluations} evidence={evidence} />
        </Disclosure>
        <Disclosure label="Lifecycle & timeline">
          <LifecycleRail agreement={a} evaluations={evaluations} />
        </Disclosure>
        <Disclosure label="Technical details">
          <div className="stack-s" style={{ paddingTop: "var(--s2)" }}>
            <Row k="Agreement ID">#{a.id}</Row>
            <Row k="Payer" mono>{a.payer}</Row>
            <Row k="Payee" mono>{a.payee}</Row>
            <Row k="State">{a.state}</Row>
            <Row k="Policy version">v{a.settlement.policy_version || 1}</Row>
            {a.settlement.settled ? (
              <Row k="Settlement rule" mono>{a.settlement.rule}</Row>
            ) : null}
          </div>
        </Disclosure>
      </div>
    </div>
  );
}

/* ══ ActionsPanel — logic preserved verbatim; presentation on the kit ══════ */

function ActionsPanel({ a }: { a: AgreementView; latest: EvaluationView | null }) {
  const { address, client } = useWallet();
  const { run, tx } = useTx();
  const config = useConfig();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [challengeUrls, setChallengeUrls] = useState("");

  const me = address.toLowerCase();
  const isParty = me === a.payer || me === a.payee;
  const [nowSecs] = useState(() => Math.floor(Date.now() / 1000));
  const busy = tx.phase !== "idle" && tx.phase !== "failed" && tx.phase !== "success";
  const bond = BigInt(config.data?.challenge_bond_atto ?? (1n * GEN).toString());

  if (a.state === "SETTLED" || a.state === "EXPIRED" || a.state === "CANCELLED") return null;

  const act = (label: string, effect: string, write: () => Promise<string>, confirmed?: () => Promise<boolean>) =>
    run({ label, effect, write, ...(confirmed ? { confirmed } : {}), invalidate: [["agreement", a.id], ["docket"], ["stats"], ["evaluation"]], touchAgreementId: a.id });
  const stateAfter = (pred: (x: AgreementView) => boolean) => async () => {
    const fresh = await getAgreement(a.id);
    return fresh ? pred(fresh) : false;
  };

  if (!client) {
    return <span className="t-small">Connect a wallet to act — reading is free.</span>;
  }

  const buttons: React.ReactNode[] = [];
  const P = (key: string, label: string, on: () => void, kind: "primary" | "secondary" | "danger" = "primary") =>
    buttons.push(<button key={key} className={`btn btn-${kind} btn-lg`} disabled={busy} onClick={on}>{label}</button>);

  if (a.state === "PROPOSED") {
    if (me === a.payee) P("accept", "Accept agreement", () => void act("Accept agreement", "Agreement active — sources frozen by mutual assent.", () => acceptAgreement(client, a.id), stateAfter((x) => x.state === "FUNDED")));
    if (me === a.payer) P("cancel", "Cancel & refund", () => void act("Cancel & refund", "Escrow refunded in full.", () => cancelProposed(client, a.id), stateAfter((x) => x.state === "CANCELLED")), "secondary");
  }
  if (a.state === "FUNDED") {
    P("evaluate", "Request evaluation", () => void act("Request evaluation", "Judgment recorded with hash-bound evidence.", () => evaluateTx(client, a.id), stateAfter((x) => x.latest_eval_id !== a.latest_eval_id)));
    if (nowSecs >= a.deadline + 72 * 3600) P("expire", "Expire & refund", () => void act("Expire & refund", "Deadline + grace passed — payer refunded.", () => expireRefund(client, a.id), stateAfter((x) => x.state === "EXPIRED")), "secondary");
  }
  if (a.state === "ARMED" && a.dispute.state === "OPEN") {
    const windowOpen = nowSecs < a.dispute.window_ends;
    if (windowOpen && isParty) P("challenge", `Challenge · ${timeLeft(a.dispute.window_ends)} left`, () => setChallengeOpen((v) => !v), "danger");
    if (!windowOpen) P("settle", "Settle", () => void act("Settle", "Deterministic split executed — keeper bounty to you.", () => settleTx(client, a.id), stateAfter((x) => x.state === "SETTLED")));
  }
  if (a.state === "DISPUTED" && a.dispute.state === "FILED") {
    P("reassess", "Run reassessment", () => void act("Run reassessment", "Second panel ruled on the recorded dossier.", () => reassessTx(client, a.id), stateAfter((x) => x.dispute.state !== "FILED")));
    if (nowSecs >= a.dispute.terminal_at) P("stale", "Resolve stale dispute", () => void act("Resolve stale dispute", "Original verdict stands; bond refunded.", () => resolveStaleDispute(client, a.id), stateAfter((x) => x.dispute.state === "TERMINAL")), "secondary");
  }
  if (a.state === "DISPUTED" && (a.dispute.state === "RESOLVED" || a.dispute.state === "TERMINAL")) {
    P("settle2", "Settle", () => void act("Settle", "Deterministic split executed — keeper bounty to you.", () => settleTx(client, a.id), stateAfter((x) => x.state === "SETTLED")));
  }

  if (!buttons.length && !challengeOpen) return null;

  return (
    <div style={{ width: "100%" }}>
      <div className="btn-row" style={{ justifyContent: "center" }}>{buttons}</div>
      {challengeOpen ? (
        <div className="card mt-5" style={{ textAlign: "left" }}>
          <label className="input-label">Why is the verdict wrong? <span className="t-meta">(statement — context, never evidence)</span></label>
          <textarea className="textarea" value={statement} placeholder="The inspection note the panel relied on was preliminary; certification is not on record." onChange={(e) => setStatement(e.target.value)} />
          <label className="input-label mt-4">New evidence URLs <span className="t-meta">(optional, one per line — snapshotted at filing)</span></label>
          <textarea className="textarea input-mono" rows={3} value={challengeUrls} placeholder="https://auditor.example.com/note" onChange={(e) => setChallengeUrls(e.target.value)} />
          <div className="btn-row mt-4">
            <button className="btn btn-primary" disabled={busy || statement.trim().length < 5}
              onClick={() => {
                const urls = challengeUrls.split("\n").map((s) => s.trim()).filter(Boolean);
                void act("File challenge", "Dispute filed — the second panel will judge the recorded dossier.", () => challengeTx(client, a.id, statement.trim(), urls, bond), stateAfter((x) => x.dispute.state === "FILED")).then((ok) => ok && setChallengeOpen(false));
              }}>
              File challenge · bond {formatGen(bond, 0)} GEN
            </button>
            <button className="btn btn-ghost" onClick={() => setChallengeOpen(false)}>Cancel</button>
          </div>
          <p className="t-meta mt-3">Bond returns if the verdict changes or the panel can’t decide; it forfeits to the counterparty only if the verdict stands.</p>
        </div>
      ) : null}
    </div>
  );
}

/* ══ NegotiationPanel — logic preserved; presentation on the kit ══════════ */

function NegotiationPanel({ a }: { a: AgreementView }) {
  const { address, client } = useWallet();
  const { run, tx } = useTx();
  const [open, setOpen] = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [extDate, setExtDate] = useState("");

  const me = address.toLowerCase();
  const isParty = me === a.payer || me === a.payee;
  const busy = tx.phase !== "idle" && tx.phase !== "failed" && tx.phase !== "success";
  const negotiable = ["FUNDED", "ARMED", "DISPUTED"].includes(a.state);
  const p = a.proposal;
  if (!negotiable || !isParty || !client) return null;

  const act = (label: string, effect: string, write: () => Promise<string>) =>
    run({ label, effect, write, confirmed: async () => { const fresh = await getAgreement(a.id); return fresh ? fresh.proposal.id !== p.id || fresh.state === "SETTLED" || fresh.deadline !== a.deadline : false; }, invalidate: [["agreement", a.id], ["docket"], ["stats"]], touchAgreementId: a.id });

  return (
    <Section title="Settle without the panel" description="Either party can propose a split or a deadline extension — the tribunal’s existence is what makes honest negotiation rational.">
      {p.kind !== "NONE" ? (
        <div className="card mb-4" style={{ borderColor: "var(--accent)", background: "var(--accent-bg)" }}>
          <div className="t-small" style={{ color: "var(--ink)" }}>
            <strong>Open proposal #{p.id}</strong> by {p.proposed_by === a.payer ? "payer" : "payee"}:{" "}
            {p.kind === "SPLIT" ? `split ${p.payee_bps / 100}% payee / ${100 - p.payee_bps / 100}% payer` : `extend deadline to ${formatEpoch(p.new_deadline)}`}
          </div>
          <div className="btn-row mt-3">
            {me !== p.proposed_by ? (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void act("Accept proposal", p.kind === "SPLIT" ? "Settled by mutual agreement." : "Deadline extended.", () => acceptProposal(client, a.id, p.id))}>Accept #{p.id}</button>
            ) : (
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void act("Withdraw proposal", "Proposal withdrawn.", () => withdrawProposal(client, a.id))}>Withdraw</button>
            )}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="input-label">Propose a split — payee gets {splitPct}%</div>
            <input type="range" min={0} max={100} step={5} value={splitPct} onChange={(e) => setSplitPct(Number(e.target.value))} />
            <div className="t-mono t-small mt-2">payee {formatGen((BigInt(a.amount_atto) * BigInt(splitPct * 100)) / 10000n)} · payer {formatGen((BigInt(a.amount_atto) * BigInt((100 - splitPct) * 100)) / 10000n)} GEN</div>
            <button className="btn btn-secondary btn-sm mt-3" disabled={busy} onClick={() => void act("Propose split", "Proposal filed — awaiting the counterparty.", () => proposeSplit(client, a.id, splitPct * 100))}>Propose split</button>
          </div>
          {a.state === "FUNDED" ? (
            <div className="card">
              <div className="input-label">Propose a deadline extension</div>
              <input type="date" className="input" value={extDate} onChange={(e) => setExtDate(e.target.value)} />
              <button className="btn btn-secondary btn-sm mt-3" disabled={busy || !extDate || dateInputToEpoch(extDate) <= a.deadline} onClick={() => void act("Propose extension", "Proposal filed — awaiting the counterparty.", () => proposeExtension(client, a.id, dateInputToEpoch(extDate)))}>Propose extension</button>
              <p className="t-meta mt-2">Overruns are normal, not disputes.</p>
            </div>
          ) : null}
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>Open negotiation →</button>
      )}
    </Section>
  );
}

// keep the explorer helper referenced (tx links live inside sub-components)
export const _explorer = explorerTxUrl;
