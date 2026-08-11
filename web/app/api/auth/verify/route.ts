import { z } from "zod";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { recoverMessageAddress } from "viem";
import { nonceStore } from "@/lib/server/authStores";
import { issueSession, sessionCookieHeader } from "@/lib/server/session";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { serverEnv } from "@/lib/server/env";

export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

export async function POST(req: Request) {
  const rl = rateLimit(`verify:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid body" }), { status: 400 });
  }
  const { message, signature } = parsed.data;

  const fields = parseSiweMessage(message);
  const host = req.headers.get("host") ?? "";
  if (
    !validateSiweMessage({ message: fields, domain: host }) ||
    !fields.address ||
    !fields.nonce ||
    fields.chainId !== serverEnv().chainId // pin the chain (S-portfolio: SIWE chainId)
  ) {
    return new Response(JSON.stringify({ error: "invalid siwe message" }), { status: 401 });
  }

  // single-use, expiring, server-issued — consumed atomically BEFORE
  // signature work so a replayed message dies here regardless.
  if (!(await nonceStore().consume(fields.nonce))) {
    return new Response(JSON.stringify({ error: "unknown or used nonce" }), { status: 401 });
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return new Response(JSON.stringify({ error: "unrecoverable signature" }), { status: 401 });
  }
  if (recovered.toLowerCase() !== fields.address.toLowerCase()) {
    return new Response(JSON.stringify({ error: "signature mismatch" }), { status: 401 });
  }

  const token = issueSession(fields.address);
  if (!token) {
    // sessions unconfigured (no SESSION_SECRET) — succeed statelessly so the
    // client knows the wallet is proven, but no cookie can be issued.
    return Response.json({ address: fields.address.toLowerCase(), session: false });
  }
  return new Response(
    JSON.stringify({ address: fields.address.toLowerCase(), session: true }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": sessionCookieHeader(token),
      },
    },
  );
}
