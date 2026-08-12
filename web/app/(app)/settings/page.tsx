"use client";

/**
 * Settings — quiet, scannable rows grouped into sections. Wallet + network up
 * top (what the user acts with); protocol parameters and the demo reference
 * below, progressively disclosed. No boxes-in-boxes.
 */
import { useConfig, useStats } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { CHAIN_RPC_DIRECT, CONTRACT_ADDRESS, CONTRACT_CONFIGURED, EXPLORER_URL } from "@/lib/chain/config";
import { FIREBASE_ENABLED } from "@/lib/firebase";
import { formatGen, pct, shortAddr } from "@/lib/format";
import { ConnectButton } from "@/components/shell";
import { Disclosure, Row, Section } from "@/components/kit";

export default function SettingsPage() {
  const { address, siweOk } = useWallet();
  const config = useConfig();
  const stats = useStats();
  const c = config.data;

  return (
    <div className="wrap-read sections">
      <div>
        <h1 className="t-title">Settings</h1>
        <p className="t-body mt-1">Your wallet, the network, and the protocol you’re transacting against.</p>
      </div>

      <Section title="Wallet">
        {address ? (
          <div>
            <Row k="Connected" mono>{shortAddr(address)}</Row>
            <Row k="Session (SIWE)">{siweOk ? "Verified" : "Not established (optional)"}</Row>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="t-small">GroundTruth never holds your keys — reads are public, the wallet signs actions.</p>
            <ConnectButton />
          </div>
        )}
      </Section>

      <Section title="Network">
        <Row k="Chain">GenLayer StudioNet · 61999</Row>
        <Row k="RPC (browser)">same-origin proxy</Row>
        <Row k="Contract">
          {CONTRACT_CONFIGURED ? (
            <a className="link t-mono" href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{shortAddr(CONTRACT_ADDRESS)}</a>
          ) : "Not configured"}
        </Row>
        <Row k="Realtime mirror">{FIREBASE_ENABLED ? "Firestore connected" : "Off (chain-direct)"}</Row>
      </Section>

      {c ? (
        <Section title="Protocol">
          <Row k="Policy version">v{c.policy_version}</Row>
          <Row k="Challenge window">{c.challenge_window_seconds / 3600 >= 1 ? `${c.challenge_window_seconds / 3600}h` : `${c.challenge_window_seconds}s`}</Row>
          <Row k="Dispute terminal escape">{c.dispute_terminal_seconds / 86400 >= 1 ? `${c.dispute_terminal_seconds / 86400}d` : `${c.dispute_terminal_seconds}s`}</Row>
          <Row k="Evaluation cooldown">{c.eval_cooldown_seconds}s</Row>
          <Row k="Challenge bond">{formatGen(c.challenge_bond_atto, 0)} GEN</Row>
          <Row k="Keeper bounty">{pct(c.keeper_bounty_bps)}</Row>
        </Section>
      ) : null}

      <div>
        {stats.data ? (
          <Disclosure label="Protocol totals">
            <div style={{ paddingTop: "var(--s2)" }}>
              <Row k="Agreements">{stats.data.agreements}</Row>
              <Row k="Evaluations">{stats.data.evaluations}</Row>
              <Row k="Evidence rows">{stats.data.evidence}</Row>
              <Row k="Escrow held">{formatGen(stats.data.escrow_held_atto)} GEN</Row>
              <Row k="Bonds held">{formatGen(stats.data.bonds_held_atto)} GEN</Row>
              <Row k="Settled to date">{formatGen(stats.data.settled_total_atto)} GEN</Row>
            </div>
          </Disclosure>
        ) : null}
        <Disclosure label="Demo evidence (Harborview Tower)">
          <p className="t-small" style={{ paddingTop: "var(--s2)" }}>
            The flagship demo watches evidence pages served by this app so validators can fetch them like any web source:{" "}
            <span className="t-mono">/api/demo/harborview/progress</span> and{" "}
            <span className="t-mono">/api/demo/harborview/inspection</span> (act 1–3), plus the challenger’s exhibit at{" "}
            <span className="t-mono">/api/demo/harborview/audit</span>. The acts are demo-controlled; the fetch → hash → judge → consensus → settle machinery is production.
          </p>
        </Disclosure>
      </div>

      <p className="t-meta" style={{ borderTop: "1px solid var(--line)", paddingTop: "var(--s5)" }}>
        Prototype of evidence-settled escrow on GenLayer StudioNet. Financial parameters are experimental — not legal or underwriting standards.
      </p>
    </div>
  );
}
