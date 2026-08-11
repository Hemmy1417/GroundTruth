import "server-only";

/**
 * Per-IP sliding-window rate limiter. In-memory and therefore PER-INSTANCE on
 * Vercel serverless — documented as best-effort defense-in-depth; the real
 * gates are the SIWE signature + single-use nonces. Windows are small so the
 * map stays bounded.
 */

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): { ok: boolean; retryAfterSecs: number } {
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSecs: 0 };
  }
  w.count += 1;
  if (w.count > max) {
    return { ok: false, retryAfterSecs: Math.ceil((w.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSecs: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "unknown").trim();
}

/** Test hook. */
export function _resetRateLimiter(): void {
  windows.clear();
}
