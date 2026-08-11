// GroundTruth chain config. All values here are public.
import { studionet } from "genlayer-js/chains";

// Direct upstream RPC — used ONLY for the MetaMask network definition
// (the extension isn't subject to page CORS, so it talks to studio directly).
export const CHAIN_RPC_DIRECT =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || studionet.rpcUrls.default.http[0];

// Same-origin proxy the PAGE's genlayer-js client uses for reads + gas/nonce,
// so a CORS-less rate-limit/error response can't become "Failed to fetch".
// Resolves to <origin>/api/rpc in the browser; falls back to the direct RPC
// during SSR (no wallet calls happen there).
function pageRpcUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/api/rpc`;
  return CHAIN_RPC_DIRECT;
}

// The chain handed to genlayer-js createClient — identical to studionet but
// with the RPC transport pointed at the proxy. Consensus contract config and
// everything else is preserved by the spread.
export const CHAIN = {
  ...studionet,
  rpcUrls: {
    ...studionet.rpcUrls,
    default: { http: [pageRpcUrl()] },
    public: { http: [pageRpcUrl()] },
  },
} as typeof studionet;

export const CHAIN_HEX = ("0x" + studionet.id.toString(16)) as `0x${string}`;
export const CHAIN_RPC = CHAIN_RPC_DIRECT;
export const CHAIN_NAME = studionet.name;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "") as `0x${string}`;
export const CONTRACT_CONFIGURED = /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);

export const EXPLORER_URL = (
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio.genlayer.com"
).replace(/\/$/, "");

export function explorerTxUrl(hash: string): string {
  return hash ? `${EXPLORER_URL}/tx/${hash}` : "";
}

export const GEN = 10n ** 18n;
