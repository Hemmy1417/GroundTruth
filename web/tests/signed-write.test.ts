/**
 * Repository-level proof that GroundTruth contract writes are SIGNED by the
 * connected wallet (S6). The wallet context builds the client with the
 * connected EIP-1193 provider — createClient({chain, account, provider}) —
 * and every exported action routes through writeAndWait(client, ...), so
 * eth_sendTransaction goes through the wallet the user picked, never a
 * window.ethereum fallback. These tests pin that by feeding a
 * recording-provider client into the REAL exported actions.
 *
 * genlayer-js 1.1.8 nuance: nonce/gas are read over a fetch-based JSON-RPC
 * transport (NOT the provider), so the fetch stub must answer each method
 * with properly typed hex — an object for everything makes BigInt() throw
 * before eth_sendTransaction ever fires.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { evaluate, settle } from "../lib/chain/groundtruth";

const ACCOUNT = ("0x" + "12".repeat(20)) as `0x${string}`;
const TX_HASH = ("0x" + "cd".repeat(32)) as `0x${string}`;

const CONSENSUS_MAIN = {
  address: ("0x" + "01".repeat(20)) as `0x${string}`,
  abi: [
    {
      type: "function",
      name: "addTransaction",
      stateMutability: "nonpayable",
      inputs: [
        { name: "sender", type: "address" },
        { name: "recipient", type: "address" },
        { name: "numOfInitialValidators", type: "uint256" },
        { name: "maxRotations", type: "uint256" },
        { name: "txData", type: "bytes" },
      ],
      outputs: [],
    },
  ],
};

function rpcResult(method: string): string {
  switch (method) {
    case "eth_chainId":              return `0x${studionet.id.toString(16)}`;
    case "eth_getTransactionCount":  return "0x0";
    case "eth_estimateGas":          return "0x30d40";
    case "eth_gasPrice":             return "0x1";
    case "eth_maxPriorityFeePerGas": return "0x1";
    case "eth_blockNumber":          return "0x1";
    case "eth_getBalance":           return "0x0";
    case "eth_call":                 return "0x";
    default:                          return "0x1";
  }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: unknown, opts: { body?: string } | undefined) => {
      let body: unknown = {};
      try {
        body = JSON.parse(opts?.body ?? "{}");
      } catch {
        /* non-JSON */
      }
      const one = (b: { id?: number; method?: string }) => ({
        jsonrpc: "2.0",
        id: b?.id ?? 1,
        result: rpcResult(b?.method ?? ""),
      });
      const payload = Array.isArray(body)
        ? (body as { id?: number; method?: string }[]).map(one)
        : one(body as { id?: number; method?: string });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function recordingProvider() {
  const calls: Array<{ method: string; params: unknown[] }> = [];
  const provider = {
    isMetaMask: true,
    request: async ({ method, params = [] }: { method: string; params?: unknown[] }) => {
      calls.push({ method, params });
      switch (method) {
        case "eth_chainId":             return `0x${studionet.id.toString(16)}`;
        case "eth_accounts":
        case "eth_requestAccounts":     return [ACCOUNT];
        case "eth_getTransactionCount": return "0x0";
        case "eth_estimateGas":         return "0x30d40";
        case "eth_gasPrice":            return "0x1";
        case "eth_sendTransaction":     return TX_HASH;
        default:                         return "0x1";
      }
    },
    on: () => {},
    removeListener: () => {},
  };
  return { provider, calls };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function providerClient() {
  const { provider, calls } = recordingProvider();
  const client: any = createClient({ chain: studionet, account: ACCOUNT, provider });
  client.chain.consensusMainContract = CONSENSUS_MAIN;
  return { client, calls };
}

describe("GroundTruth writes are signed by the connected wallet provider", () => {
  it("routes writeContract through the injected EIP-1193 provider (correct from)", async () => {
    const { client, calls } = providerClient();
    const txHash = await client.writeContract({
      address: ("0x" + "ab".repeat(20)) as `0x${string}`,
      functionName: "evaluate",
      args: [1],
      value: 0n,
    });
    expect(txHash).toBe(TX_HASH);
    const sendTx = calls.find((c) => c.method === "eth_sendTransaction");
    expect(sendTx, "eth_sendTransaction must be signed by the wallet provider").toBeDefined();
    expect(
      String((sendTx!.params[0] as { from: string }).from).toLowerCase(),
    ).toBe(ACCOUNT.toLowerCase());
  });

  it("the real evaluate action signs through the provider-backed client", async () => {
    const { client, calls } = providerClient();
    void evaluate(client, 1).catch(() => {});
    await vi.waitFor(
      () => expect(calls.find((c) => c.method === "eth_sendTransaction")).toBeDefined(),
      { timeout: 4000 },
    );
    const sendTx = calls.find((c) => c.method === "eth_sendTransaction")!;
    expect(
      String((sendTx.params[0] as { from: string }).from).toLowerCase(),
    ).toBe(ACCOUNT.toLowerCase());
  });

  it("the real settle action signs through the provider-backed client", async () => {
    const { client, calls } = providerClient();
    void settle(client, 1).catch(() => {});
    await vi.waitFor(
      () => expect(calls.find((c) => c.method === "eth_sendTransaction")).toBeDefined(),
      { timeout: 4000 },
    );
  });
});
