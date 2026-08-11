import { z } from "zod";
import { createChainReader } from "@/lib/server/chainReader";
import { reconcile } from "@/lib/server/reconcile";
import { mirrorStore } from "@/lib/server/authStores";
import { contractConfigured } from "@/lib/server/env";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

// Chain → Firestore reconciler. Clients ping it after a confirmed write
// (fire-and-forget); idempotent, so concurrent calls converge. Rate-limited
// hard: it fans out chain reads and StudioNet allows 30 req/min per IP.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ touchAgreementId: z.number().int().positive().optional() });

export async function POST(req: Request) {
  if (!contractConfigured()) {
    return new Response(JSON.stringify({ error: "contract not configured" }), { status: 503 });
  }
  const rl = rateLimit(`reconcile:${clientIp(req)}`, 6, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
  }
  const body = Body.safeParse(await req.json().catch(() => ({})));
  try {
    const synced = await reconcile(createChainReader(), mirrorStore(), {
      ...(body.success && body.data.touchAgreementId
        ? { touchAgreementId: body.data.touchAgreementId }
        : {}),
    });
    return Response.json({ ok: true, synced });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg.slice(0, 200) }), { status: 502 });
  }
}
