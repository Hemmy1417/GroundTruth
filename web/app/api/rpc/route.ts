import { forwardWithCache } from "@/lib/server/rpcCache";
import { serverEnv } from "@/lib/server/env";

// Same-origin GenLayer RPC proxy — kills CORS failures on browser writes and
// coalesces duplicate view reads (StudioNet is 30 req/min per IP). POST only.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000) {
    return new Response(JSON.stringify({ error: "body too large" }), { status: 413 });
  }
  const { rpcUrl } = serverEnv();
  const { status, body } = await forwardWithCache(rpcUrl, raw);
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}
