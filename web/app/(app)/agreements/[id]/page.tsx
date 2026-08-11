"use client";

/**
 * The Agreement File — everything about one agreement on one page (docs/UX
 * §4): title block, gauge, lifecycle, evidence registry, judgment +
 * consensus, settlement, dispute room, and the context-dependent actions +
 * negotiation panels. Fully readable walletless; the wallet gates actions.
 */
import { use as usePromise, useMemo, useState } from "react";
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
import { SettlementCard } from "@/components/SettlementCard";
import { StateChip, VerdictPill } from "@/components/badges";
import { SkeletonCard } from "@/components/ui";
import {
  dateInputToEpoch,
  formatEpoch,
  formatGen,
  pct,
  shortAddr,
  timeLeft,
} from "@/lib/format";
import { GEN } from "@/lib/chain/config";

export default function AgreementFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = usePromise(params);
  const id = Number(idStr);
  const agreement = useAgreement(Number.isFinite(id) ? id : null);
  const a = agreement.data ?? null;

  const evalQueries = useEvaluationSet(a?.evaluation_ids);
  const evaluations = useMemo(
    () =>
      evalQueries
        .map((q) => q.data)
        .filter((e): e is EvaluationView => Boolean(e)),
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
      <div className="grid gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </div>
    );
  }
  if (!a) {
    return <div className="g-card-paper text-center py-12 g-caption">Agreement not found.</div>;
  }

  const latest = evaluations.find((e) => e.id === a.latest_eval_id) ?? null;
  const challenged =
    a.dispute.reassess_eval_id && latest?.id === a.dispute.reassess_eval_id
      ? evaluations.find(
          (e) =>
            e.kind === "INITIAL" &&
            e.id === Math.max(...evaluations.filter((x) => x.kind === "INITIAL").map((x) => x.id)),
        ) ?? null
      : evaluations.filter((e) => !e.provisional && e.kind === "INITIAL").at(-1) ?? null;
  const reassessment = a.dispute.reassess_eval_id
    ? evaluations.find((e) => e.id === a.dispute.reassess_eval_id) ?? null
    : null;

  return (
    <div className="grid gap-4">
      {/* title block */}
      <div className="g-titleblock">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="g-eyebrow mb-1">
              Agreement #{a.id}
              {a.project_tag ? ` · project: ${a.project_tag}` : ""} · milestone escrow
            </div>
            <h1 className="g-display-md">{a.title}</h1>
            <div className="g-annotate g-mono mt-1.5">
              payer {shortAddr(a.payer)} ⇄ payee {shortAddr(a.payee)} · deadline{" "}
              {formatEpoch(a.deadline)}
              {a.state === "FUNDED" ? ` (${timeLeft(a.deadline)} left)` : ""}
            </div>
          </div>
          <div className="text-right">
            <StateChip state={a.state} />
            <div className="g-mono text-[22px] mt-1.5">
              {formatGen(a.amount_atto)}{" "}
              <span className="g-annotate text-[13px]">GEN escrowed</span>
            </div>
          </div>
        </div>
      </div>

      {/* gauge */}
      <div className="g-card">
        <CompletionGauge
          thresholdBps={a.threshold_bps}
          floorBps={a.floor_bps}
          amountAtto={BigInt(a.amount_atto)}
          bucket={latest && latest.judgment.verdict !== "INCONCLUSIVE" ? latest.judgment.completion_bucket : null}
          keeperBps={50}
        />
        {latest?.provisional ? (
          <div
            className="mt-3 rounded-lg px-4 py-2.5"
            style={{ background: "var(--hold-soft)", border: "1px solid var(--hold)" }}
          >
            <span className="g-caption">
              <strong>Provisional.</strong> The deadline has not passed —
              “not yet” is not “failed”. Nothing settles on this reading; the
              would-pay figures show what today’s completion WOULD settle at.
            </span>
          </div>
        ) : null}
      </div>

      <LifecycleRail agreement={a} evaluations={evaluations} />

      <ActionsPanel a={a} latest={latest} />
      <NegotiationPanel a={a} />

      <DisputeRoom
        agreement={a}
        challenged={challenged}
        reassessment={reassessment}
        evidence={evidence}
      />

      <SettlementCard agreement={a} finalEval={latest} />

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <EvidenceRegistry evaluations={evaluations} evidence={evidence} />
        <div className="grid gap-4">
          {latest ? (
            <>
              <div className="g-card">
                <div className="g-eyebrow mb-2">Latest judgment</div>
                <div className="flex items-center gap-3 flex-wrap">
                  <VerdictPill verdict={latest.judgment.verdict} provisional={latest.provisional} />
                  <span className="g-mono g-caption">
                    @ {latest.judgment.completion_bucket}% · round #{latest.id}
                  </span>
                </div>
              </div>
              <ConsensusPanel evaluation={latest} />
            </>
          ) : (
            <div className="g-card-paper">
              <div className="g-eyebrow mb-2">No judgment yet</div>
              <p className="g-caption">
                Anyone may request an evaluation once the agreement is active.
                Validators fetch the registered sources, judge the completion
                level under consensus, and the result lands here with its
                evidence hashes.
              </p>
            </div>
          )}
          <div className="g-card-paper">
            <div className="g-eyebrow mb-2">The condition</div>
            <p className="text-[14.5px]">{a.question}</p>
            <div className="g-annotate mt-2">
              metric: {a.metric} · release at {pct(a.threshold_bps)}
              {a.floor_bps > 0 ? ` · pro-rata floor ${pct(a.floor_bps)}` : " · all-or-nothing"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── actions ─────────────────────────────────────────────────────────────── */

function ActionsPanel({ a }: { a: AgreementView; latest: EvaluationView | null }) {
  const { address, client } = useWallet();
  const { run, tx } = useTx();
  const config = useConfig();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [challengeUrls, setChallengeUrls] = useState("");

  const me = address.toLowerCase();
  const isParty = me === a.payer || me === a.payee;
  // stable per mount — render purity; windows update on refetch, not per tick
  const [nowSecs] = useState(() => Math.floor(Date.now() / 1000));
  const busy = tx.phase !== "idle" && tx.phase !== "failed" && tx.phase !== "success";
  const bond = BigInt(config.data?.challenge_bond_atto ?? (1n * GEN).toString());

  if (a.state === "SETTLED" || a.state === "EXPIRED" || a.state === "CANCELLED") return null;

  const act = (
    label: string,
    effect: string,
    write: () => Promise<string>,
    confirmed?: () => Promise<boolean>,
  ) =>
    run({
      label,
      effect,
      write,
      ...(confirmed ? { confirmed } : {}),
      invalidate: [["agreement", a.id], ["docket"], ["stats"], ["evaluation"]],
      touchAgreementId: a.id,
    });

  const stateAfter = (pred: (x: AgreementView) => boolean) => async () => {
    const fresh = await getAgreement(a.id);
    return fresh ? pred(fresh) : false;
  };

  const buttons: React.ReactNode[] = [];

  if (!client) {
    return (
      <div className="g-card flex items-center justify-between flex-wrap gap-3">
        <span className="g-caption">Connect a wallet to act on this agreement — reading is free for everyone.</span>
      </div>
    );
  }

  if (a.state === "PROPOSED") {
    if (me === a.payee)
      buttons.push(
        <button key="accept" className="g-btn g-btn-accent" disabled={busy}
          onClick={() => void act("Accept agreement", "Agreement active — sources frozen by mutual assent.",
            () => acceptAgreement(client, a.id), stateAfter((x) => x.state === "FUNDED"))}>
          Accept agreement
        </button>,
      );
    if (me === a.payer)
      buttons.push(
        <button key="cancel" className="g-btn g-btn-outline" disabled={busy}
          onClick={() => void act("Cancel & refund", "Escrow refunded in full.",
            () => cancelProposed(client, a.id), stateAfter((x) => x.state === "CANCELLED"))}>
          Cancel & refund
        </button>,
      );
  }

  if (a.state === "FUNDED") {
    buttons.push(
      <button key="evaluate" className="g-btn g-btn-ink" disabled={busy}
        onClick={() => void act("Request evaluation",
          "Judgment recorded with hash-bound evidence.",
          () => evaluateTx(client, a.id),
          stateAfter((x) => x.latest_eval_id !== a.latest_eval_id))}>
        Request evaluation
      </button>,
    );
    if (nowSecs >= a.deadline + 72 * 3600)
      buttons.push(
        <button key="expire" className="g-btn g-btn-outline" disabled={busy}
          onClick={() => void act("Expire & refund", "Deadline + grace passed with no verdict — payer refunded.",
            () => expireRefund(client, a.id), stateAfter((x) => x.state === "EXPIRED"))}>
          Expire & refund payer
        </button>,
      );
  }

  if (a.state === "ARMED" && a.dispute.state === "OPEN") {
    const windowOpen = nowSecs < a.dispute.window_ends;
    if (windowOpen && isParty)
      buttons.push(
        <button key="challenge" className="g-btn g-btn-outline" disabled={busy}
          style={{ borderColor: "var(--dispute)", color: "var(--dispute)" }}
          onClick={() => setChallengeOpen((v) => !v)}>
          Challenge verdict ({formatGen(bond, 0)} GEN bond) · {timeLeft(a.dispute.window_ends)} left
        </button>,
      );
    if (!windowOpen)
      buttons.push(
        <button key="settle" className="g-btn g-btn-accent" disabled={busy}
          onClick={() => void act("Settle", "Deterministic split executed — keeper bounty to you.",
            () => settleTx(client, a.id), stateAfter((x) => x.state === "SETTLED"))}>
          Settle (earn keeper bounty)
        </button>,
      );
  }

  if (a.state === "DISPUTED" && a.dispute.state === "FILED") {
    buttons.push(
      <button key="reassess" className="g-btn g-btn-ink" disabled={busy}
        onClick={() => void act("Run reassessment", "Second panel ruled on the recorded dossier.",
          () => reassessTx(client, a.id),
          stateAfter((x) => x.dispute.state !== "FILED"))}>
        Run reassessment
      </button>,
    );
    if (nowSecs >= a.dispute.terminal_at)
      buttons.push(
        <button key="stale" className="g-btn g-btn-outline" disabled={busy}
          onClick={() => void act("Resolve stale dispute", "Original verdict stands; bond refunded.",
            () => resolveStaleDispute(client, a.id),
            stateAfter((x) => x.dispute.state === "TERMINAL"))}>
          Resolve stale dispute
        </button>,
      );
  }

  if (a.state === "DISPUTED" && (a.dispute.state === "RESOLVED" || a.dispute.state === "TERMINAL")) {
    buttons.push(
      <button key="settle2" className="g-btn g-btn-accent" disabled={busy}
        onClick={() => void act("Settle", "Deterministic split executed — keeper bounty to you.",
          () => settleTx(client, a.id), stateAfter((x) => x.state === "SETTLED"))}>
        Settle (earn keeper bounty)
      </button>,
    );
  }

  if (!buttons.length && !challengeOpen) return null;

  return (
    <div className="g-card">
      <div className="g-eyebrow mb-3">Actions</div>
      <div className="flex gap-2.5 flex-wrap">{buttons}</div>
      {challengeOpen ? (
        <div className="mt-4 rounded-lg p-4" style={{ background: "var(--dispute-soft)" }}>
          <label className="g-label">Statement — why the verdict is wrong (context, never evidence)</label>
          <textarea className="g-textarea" value={statement}
            placeholder="The inspection note the panel relied on was preliminary; certification is not on record."
            onChange={(e) => setStatement(e.target.value)} />
          <label className="g-label mt-3">New evidence URLs (optional, one per line — snapshotted at filing)</label>
          <textarea className="g-textarea g-mono text-[13px]" rows={3} value={challengeUrls}
            placeholder="https://auditor.example.com/note" onChange={(e) => setChallengeUrls(e.target.value)} />
          <button className="g-btn g-btn-ink mt-3" disabled={busy || statement.trim().length < 5}
            onClick={() => {
              const urls = challengeUrls.split("\n").map((s) => s.trim()).filter(Boolean);
              void act("File challenge", "Dispute filed — the second panel will judge the recorded dossier.",
                () => challengeTx(client, a.id, statement.trim(), urls, bond),
                stateAfter((x) => x.dispute.state === "FILED"),
              ).then((ok) => ok && setChallengeOpen(false));
            }}>
            File challenge · bond {formatGen(bond, 0)} GEN
          </button>
          <p className="g-annotate mt-2">
            Bond returns if the verdict changes or the panel can&apos;t decide;
            it forfeits to the counterparty only if the verdict stands.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── negotiation ─────────────────────────────────────────────────────────── */

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
    run({
      label, effect, write,
      confirmed: async () => {
        const fresh = await getAgreement(a.id);
        return fresh ? fresh.proposal.id !== p.id || fresh.state === "SETTLED" || fresh.deadline !== a.deadline : false;
      },
      invalidate: [["agreement", a.id], ["docket"], ["stats"]],
      touchAgreementId: a.id,
    });

  return (
    <div className="g-card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="g-eyebrow">Negotiation — settle without the panel</div>
        <button className="g-link text-sm cursor-pointer" onClick={() => setOpen((v) => !v)}>
          {open ? "close" : "open"}
        </button>
      </div>

      {p.kind !== "NONE" ? (
        <div className="mt-3 rounded-lg px-4 py-3"
          style={{ background: "var(--paper)", border: "1px solid var(--grid-strong)" }}>
          <div className="g-caption">
            <strong>Open proposal #{p.id}</strong> by{" "}
            {p.proposed_by === a.payer ? "payer" : "payee"}:{" "}
            {p.kind === "SPLIT"
              ? `split the escrow ${p.payee_bps / 100}% payee / ${100 - p.payee_bps / 100}% payer`
              : `extend the deadline to ${formatEpoch(p.new_deadline)}`}
          </div>
          <div className="flex gap-2 mt-2">
            {me !== p.proposed_by ? (
              <button className="g-btn g-btn-accent g-btn-sm" disabled={busy}
                onClick={() => void act("Accept proposal",
                  p.kind === "SPLIT" ? "Settled by mutual agreement." : "Deadline extended by mutual consent.",
                  () => acceptProposal(client, a.id, p.id))}>
                Accept #{p.id}
              </button>
            ) : (
              <button className="g-btn g-btn-outline g-btn-sm" disabled={busy}
                onClick={() => void act("Withdraw proposal", "Proposal withdrawn.",
                  () => withdrawProposal(client, a.id))}>
                Withdraw
              </button>
            )}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-lg p-4" style={{ background: "var(--paper)" }}>
            <div className="g-label">Propose a split — payee gets {splitPct}%</div>
            <input type="range" min={0} max={100} step={5} value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))} className="w-full" />
            <div className="g-mono g-caption mt-1">
              payee {formatGen((BigInt(a.amount_atto) * BigInt(splitPct * 100)) / 10000n)} ·
              payer {formatGen((BigInt(a.amount_atto) * BigInt((100 - splitPct) * 100)) / 10000n)} GEN
            </div>
            <button className="g-btn g-btn-ink g-btn-sm mt-2" disabled={busy}
              onClick={() => void act("Propose split", "Proposal filed — awaiting the counterparty.",
                () => proposeSplit(client, a.id, splitPct * 100))}>
              Propose split
            </button>
          </div>
          {a.state === "FUNDED" ? (
            <div className="rounded-lg p-4" style={{ background: "var(--paper)" }}>
              <div className="g-label">Propose a deadline extension</div>
              <input type="date" className="g-input" value={extDate}
                onChange={(e) => setExtDate(e.target.value)} />
              <button className="g-btn g-btn-ink g-btn-sm mt-2"
                disabled={busy || !extDate || dateInputToEpoch(extDate) <= a.deadline}
                onClick={() => void act("Propose extension", "Proposal filed — awaiting the counterparty.",
                  () => proposeExtension(client, a.id, dateInputToEpoch(extDate)))}>
                Propose extension
              </button>
              <p className="g-annotate mt-1.5">Overruns are normal, not disputes.</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="g-annotate mt-3">
        Most disputes settle out of court — the panel&apos;s existence is what
        makes honest negotiation rational. Acceptance is id-checked: a
        replaced proposal can never be accepted by surprise.
      </p>
    </div>
  );
}
