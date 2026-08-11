import "server-only";

/**
 * Server env access — read lazily (Vercel injects at runtime), validated once.
 * Everything here is optional-by-design: the app must run credential-less
 * (memory store, no session persistence) and degrade honestly, never crash.
 */

export function serverEnv() {
  return {
    rpcUrl: process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "",
    chainId: Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61999),
    sessionSecret: process.env.SESSION_SECRET || "",
    firebaseServiceAccountB64: process.env.FIREBASE_SERVICE_ACCOUNT_B64 || "",
    demoAdminToken: process.env.DEMO_ADMIN_TOKEN || "",
  };
}

export function contractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(serverEnv().contractAddress);
}
