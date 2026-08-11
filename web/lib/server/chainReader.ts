import "server-only";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { serverEnv } from "./env";
import type {
  AgreementView,
  EvaluationView,
  EvidenceView,
  StatsView,
} from "../chain/types";

/**
 * Server-side chain reads for the reconciler. Read-only client (no account);
 * retries once through a rate-limit pause. The view names + JSON shapes are
 * the lib/chain/types.ts contract that groundtruth.py implements.
 */

export interface ChainReader {
  stats(): Promise<StatsView>;
  agreement(id: number): Promise<AgreementView | null>;
  evaluation(id: number): Promise<EvaluationView | null>;
  evidence(id: number): Promise<EvidenceView | null>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function createChainReader(): ChainReader {
  const env = serverEnv();
  const chain: any = {
    ...studionet,
    rpcUrls: { default: { http: [env.rpcUrl] } },
  };
  const client: any = createClient({ chain });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function read<T>(fn: string, args: unknown[] = []): Promise<T | null> {
    for (let i = 0; ; i++) {
      try {
        const raw = await client.readContract({
          address: env.contractAddress as `0x${string}`,
          functionName: fn,
          args,
        });
        if (raw === "" || raw == null) return null;
        return typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/not found|does not exist|unknown/i.test(msg)) return null;
        if (/rate limit|429|-32029/i.test(msg) && i < 2) {
          await sleep(12_000);
          continue;
        }
        throw err;
      }
    }
  }

  return {
    async stats() {
      const s = await read<StatsView>("get_stats");
      if (!s) throw new Error("get_stats returned empty");
      return s;
    },
    agreement: (id) => read<AgreementView>("get_agreement", [id]),
    evaluation: (id) => read<EvaluationView>("get_evaluation", [id]),
    evidence: (id) => read<EvidenceView>("get_evidence", [id]),
  };
}
