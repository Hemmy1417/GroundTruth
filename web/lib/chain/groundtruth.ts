"use client";

/**
 * Contract layer. READS go through a bare client over the same-origin proxy
 * (retry through rate limits). WRITES take the wallet's provider-backed
 * client (S6 — never a fallback signer) and resolve only when the effect is
 * real: submitted → ACCEPTED, with the revert-payload walker surfacing clean
 * UserError messages, and receipt polling that survives 429s — a rate limit
 * during polling must never be reported as a failed transaction.
 */
import { createClient } from "genlayer-js";
import { CHAIN, CONTRACT_ADDRESS } from "./config";
import type {
  AgreementView,
  ConfigView,
  EvaluationView,
  EvidenceView,
  StatsView,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Client = any;

let readClientSingleton: Client | null = null;
function readClient(): Client {
  if (!readClientSingleton) {
    readClientSingleton = createClient({ chain: CHAIN });
  }
  return readClientSingleton;
}

const RETRYABLE = /rate limit|429|-32029|too many|temporarily|failed to fetch|upstream unreachable/i;

async function read(functionName: string, args: unknown[] = []): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      const raw = await readClient().readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      });
      return typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (i < 3 && RETRYABLE.test(msg)) {
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function writeAndWait(
  client: Client,
  functionName: string,
  args: unknown[],
  value?: bigint,
): Promise<string> {
  const params: Record<string, unknown> = {
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  };
  if (value !== undefined) params.value = value;
  const hash = await client.writeContract(params);

  // The tx is now SUBMITTED — transient polling failures must not surface as
  // a failed transaction; wait out the rate window and resume on the SAME tx.
  let receipt: any;
  for (let attempt = 0; ; attempt++) {
    try {
      receipt = await client.waitForTransactionReceipt({
        hash,
        status: "ACCEPTED",
        interval: 6000,
        retries: 50,
      });
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (RETRYABLE.test(msg) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }
      throw e;
    }
  }

  const status = String(receipt?.status ?? "").toUpperCase();
  if (status.includes("UNDETERMINED") || status.includes("CANCELED")) {
    throw new Error("Validators could not reach consensus — try again");
  }
  const lr = receipt?.consensus_data?.leader_receipt;
  const r = Array.isArray(lr) ? lr[0] : lr;
  if (r?.execution_result === "ERROR") {
    // A clean gl.vm.UserError revert arrives with EMPTY stderr — its message
    // rides in a rollback "payload" field. Walk the receipt for it, or every
    // contract-level rejection is swallowed silently.
    const payloads: string[] = [];
    const walk = (o: any, d = 0) => {
      if (!o || d > 8) return;
      if (Array.isArray(o)) {
        o.forEach((x) => walk(x, d + 1));
        return;
      }
      if (typeof o === "object") {
        if (typeof o.payload === "string" && o.payload && o.payload !== "exit_code 1")
          payloads.push(o.payload);
        Object.values(o).forEach((v) => walk(v, d + 1));
      }
    };
    walk(receipt);
    const stderr: string = r?.genvm_result?.stderr ?? "";
    const userErr = stderr.match(/UserError: (.+)/)?.[1];
    const msg = userErr || payloads.sort((a, b) => b.length - a.length)[0] || "";
    console.error("[GroundTruth] contract execution error:", { functionName, payloads, stderr });
    throw new Error((msg || "Contract execution error — see console").slice(0, 240));
  }
  return hash;
}

// ── reads ────────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<ConfigView> {
  return JSON.parse(await read("get_config")) as ConfigView;
}

export async function getStats(): Promise<StatsView> {
  return JSON.parse(await read("get_stats")) as StatsView;
}

export async function getAgreement(id: number): Promise<AgreementView | null> {
  const raw = await read("get_agreement", [id]);
  return raw ? (JSON.parse(raw) as AgreementView) : null;
}

export type AgreementListItem = {
  id: number;
  title: string;
  state: string;
  payer: string;
  payee: string;
  amount_atto: string;
  threshold_bps: number;
  deadline: number;
  project_tag: string;
  latest_eval_id: number;
};

export async function listAgreements(
  offset = 0,
  limit = 20,
): Promise<{ total: number; agreements: AgreementListItem[] }> {
  const raw = await read("list_agreements", [offset, limit]);
  return raw ? JSON.parse(raw) : { total: 0, agreements: [] };
}

export async function getAgreementsFor(
  party: string,
  offset = 0,
  limit = 20,
): Promise<{ total: number; agreement_ids: number[] }> {
  const raw = await read("get_agreements_for", [party.toLowerCase(), offset, limit]);
  return raw ? JSON.parse(raw) : { total: 0, agreement_ids: [] };
}

export async function getEvaluation(id: number): Promise<EvaluationView | null> {
  const raw = await read("get_evaluation", [id]);
  return raw ? (JSON.parse(raw) as EvaluationView) : null;
}

export async function getEvidence(id: number): Promise<EvidenceView | null> {
  const raw = await read("get_evidence", [id]);
  return raw ? (JSON.parse(raw) as EvidenceView) : null;
}

// ── writes (client = the wallet's provider-backed genlayer-js client) ────────

export function createAgreement(
  client: Client,
  p: {
    payee: string;
    title: string;
    question: string;
    metric: string;
    thresholdBps: number;
    floorBps: number;
    deadlineEpoch: number;
    sources: string[];
    projectTag?: string;
    amountAtto: bigint;
  },
): Promise<string> {
  return writeAndWait(
    client,
    "create_agreement",
    [
      p.payee,
      p.title,
      p.question,
      p.metric,
      p.thresholdBps,
      p.floorBps,
      p.deadlineEpoch,
      JSON.stringify(p.sources),
      p.projectTag ?? "",
    ],
    p.amountAtto,
  );
}

export function acceptAgreement(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "accept_agreement", [id]);
}

export function cancelProposed(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "cancel_proposed", [id]);
}

export function evaluate(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "evaluate", [id]);
}

export function challenge(
  client: Client,
  id: number,
  statement: string,
  sources: string[],
  bondAtto: bigint,
): Promise<string> {
  return writeAndWait(client, "challenge", [id, statement, JSON.stringify(sources)], bondAtto);
}

export function reassess(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "reassess", [id]);
}

export function resolveStaleDispute(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "resolve_stale_dispute", [id]);
}

export function settle(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "settle", [id]);
}

export function expireRefund(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "expire_refund", [id]);
}

export function proposeSplit(client: Client, id: number, payeeBps: number): Promise<string> {
  return writeAndWait(client, "propose_split", [id, payeeBps]);
}

export function proposeExtension(
  client: Client,
  id: number,
  newDeadlineEpoch: number,
): Promise<string> {
  return writeAndWait(client, "propose_extension", [id, newDeadlineEpoch]);
}

export function acceptProposal(client: Client, id: number, proposalId: number): Promise<string> {
  return writeAndWait(client, "accept_proposal", [id, proposalId]);
}

export function withdrawProposal(client: Client, id: number): Promise<string> {
  return writeAndWait(client, "withdraw_proposal", [id]);
}

export type { AgreementView, ConfigView, EvaluationView, EvidenceView, StatsView };
