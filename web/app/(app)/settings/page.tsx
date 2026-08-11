"use client";

/**
 * Settings — wallet, network, contract, protocol parameters, and the demo
 * evidence reference. Everything here is inspectable truth, no forms for
 * their own sake.
 */
import { useConfig, useStats } from "@/lib/hooks";
import { useWallet } from "@/lib/wallet";
import { CHAIN_RPC_DIRECT, CONTRACT_ADDRESS, CONTRACT_CONFIGURED, EXPLORER_URL } from "@/lib/chain/config";
import { FIREBASE_ENABLED } from "@/lib/firebase";
import { formatGen, pct, shortAddr } from "@/lib/format";
import { TitleBlock } from "@/components/ui";
import { ConnectButton } from "@/components/shell";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-2.5"
      style={{ borderBottom: "1px solid var(--grid-line)" }}
    >
      <span className="g-caption">{k}</span>
      <span className="g-mono text-[13px] text-right break-all">{v}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { address, siweOk } = useWallet();
  const config = useConfig();
  const stats = useStats();
  const c = config.data;

  return (
    <div>
      <TitleBlock eyebrow="Configuration" title="Settings" />
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="g-card">
          <div className="g-eyebrow mb-2">Wallet</div>
          {address ? (
            <>
              <Row k="Connected" v={shortAddr(address)} />
              <Row k="Session (SIWE)" v={siweOk ? "verified" : "not established (optional)"} />
            </>
          ) : (
            <div className="py-2">
              <ConnectButton />
            </div>
          )}
          <p className="g-annotate mt-3">
            GroundTruth never holds keys. Reading is public; the wallet signs
            actions only.
          </p>
        </div>

        <div className="g-card">
          <div className="g-eyebrow mb-2">Network & contract</div>
          <Row k="Network" v="GenLayer StudioNet (61999)" />
          <Row k="RPC (direct)" v={CHAIN_RPC_DIRECT} />
          <Row k="RPC (page)" v="same-origin /api/rpc proxy" />
          <Row
            k="Contract"
            v={
              CONTRACT_CONFIGURED ? (
                <a
                  className="g-link"
                  href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddr(CONTRACT_ADDRESS)}
                </a>
              ) : (
                "not configured"
              )
            }
          />
          <Row k="Realtime mirror" v={FIREBASE_ENABLED ? "Firestore connected" : "off (chain-direct)"} />
        </div>

        <div className="g-card">
          <div className="g-eyebrow mb-2">Protocol parameters (on-chain)</div>
          {c ? (
            <>
              <Row k="Policy version" v={c.policy_version} />
              <Row k="Challenge window" v={`${c.challenge_window_seconds / 3600}h`} />
              <Row k="Dispute terminal escape" v={`${c.dispute_terminal_seconds / 86400}d`} />
              <Row k="Evaluation cooldown" v={`${c.eval_cooldown_seconds}s`} />
              <Row k="Challenge bond" v={`${formatGen(c.challenge_bond_atto, 0)} GEN`} />
              <Row k="Keeper bounty" v={pct(c.keeper_bounty_bps)} />
              <Row k="Max sources" v={c.max_sources} />
            </>
          ) : (
            <p className="g-annotate py-2">
              {CONTRACT_CONFIGURED ? "loading…" : "contract not configured"}
            </p>
          )}
        </div>

        <div className="g-card">
          <div className="g-eyebrow mb-2">Protocol totals</div>
          {stats.data ? (
            <>
              <Row k="Agreements" v={stats.data.agreements} />
              <Row k="Evaluations" v={stats.data.evaluations} />
              <Row k="Evidence rows" v={stats.data.evidence} />
              <Row k="Escrow held" v={`${formatGen(stats.data.escrow_held_atto)} GEN`} />
              <Row k="Bonds held" v={`${formatGen(stats.data.bonds_held_atto)} GEN`} />
              <Row k="Settled to date" v={`${formatGen(stats.data.settled_total_atto)} GEN`} />
            </>
          ) : (
            <p className="g-annotate py-2">
              {CONTRACT_CONFIGURED ? "loading…" : "contract not configured"}
            </p>
          )}
        </div>

        <div className="g-card md:col-span-2">
          <div className="g-eyebrow mb-2">Demo evidence (Harborview Tower)</div>
          <p className="g-caption">
            The flagship demo watches evidence pages served by this app itself
            (publicly reachable, so validators fetch them like any web
            source): <span className="g-mono">/api/demo/harborview/progress?act=1|2|3</span>{" "}
            and <span className="g-mono">/api/demo/harborview/inspection?act=1|2|3</span>, plus
            the challenger&apos;s exhibit at <span className="g-mono">/api/demo/harborview/audit</span>.
            The acts are demo-controlled; the fetch → hash → judge → consensus
            → settle machinery is production. Moving between acts = registering
            the next act&apos;s URLs on a fresh agreement (or extending with new
            sources via dispute) — stateless, honest, reproducible.
          </p>
        </div>
      </div>
    </div>
  );
}
