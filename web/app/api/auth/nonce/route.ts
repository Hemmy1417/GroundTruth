import { generateSiweNonce } from "viem/siwe";
import { nonceStore } from "@/lib/server/authStores";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rl = rateLimit(`nonce:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate limited" }), {
      status: 429,
      headers: { "retry-after": String(rl.retryAfterSecs) },
    });
  }
  const nonce = generateSiweNonce();
  await nonceStore().issue(nonce);
  return Response.json({ nonce });
}
