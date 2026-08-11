import "server-only";

/**
 * Read-cache + in-flight coalescing for the same-origin RPC proxy — the
 * Sentinel rate-limit lesson, kept: StudioNet allows 30 req/min per IP, and
 * a dashboard fanning out view reads burns it fast. Identical `gen_call`
 * bodies within TTL share one upstream request; everything else passes
 * through untouched.
 */

type CacheEntry = { at: number; body: string };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

const TTL_MS = 3_000;
const MAX_ENTRIES = 200;

export function isCacheableMethod(method: unknown): boolean {
  return method === "gen_call" || method === "eth_chainId";
}

export async function forwardWithCache(
  upstreamUrl: string,
  rawBody: string,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<{ status: number; body: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: JSON.stringify({ error: "invalid JSON" }) };
  }
  const single = !Array.isArray(parsed) ? (parsed as { method?: unknown }) : null;
  const cacheable = single !== null && isCacheableMethod(single.method);
  const key = cacheable ? rawBody : "";

  if (cacheable) {
    const hit = cache.get(key);
    if (hit && now - hit.at < TTL_MS) return { status: 200, body: hit.body };
    const pending = inflight.get(key);
    if (pending) return { status: 200, body: await pending };
  }

  const doFetch = async (): Promise<string> => {
    const res = await fetchImpl(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: rawBody,
    });
    const text = await res.text();
    if (!res.ok) {
      // Non-200s (rate limits included) surface verbatim — never cached.
      throw Object.assign(new Error("upstream"), { status: res.status, body: text });
    }
    return text;
  };

  try {
    let body: string;
    if (cacheable) {
      const p = doFetch();
      inflight.set(key, p);
      try {
        body = await p;
      } finally {
        inflight.delete(key);
      }
      cache.set(key, { at: now, body });
      if (cache.size > MAX_ENTRIES) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) cache.delete(oldest[0]);
      }
    } else {
      body = await doFetch();
    }
    return { status: 200, body };
  } catch (err) {
    const e = err as { status?: number; body?: string; message?: string };
    if (e.status) return { status: e.status, body: e.body ?? "" };
    return {
      status: 502,
      body: JSON.stringify({ error: "upstream unreachable" }),
    };
  }
}

/** Test hook. */
export function _resetRpcCache(): void {
  cache.clear();
  inflight.clear();
}
