import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "./env";

/**
 * Stateless signed sessions — `address.exp.hmac` in an httpOnly cookie.
 * HMAC-SHA256 over `${address}.${exp}` with SESSION_SECRET. No server-side
 * session table; expiry rides in the payload and is covered by the MAC.
 * With no SESSION_SECRET configured, sessions are disabled (issue/verify
 * both refuse) — chain access is unaffected.
 */

export const SESSION_COOKIE = "gt_session";
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

function mac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function issueSession(address: string, now = Date.now()): string | null {
  const { sessionSecret } = serverEnv();
  if (!sessionSecret) return null;
  const addr = address.toLowerCase();
  const exp = now + SESSION_TTL_MS;
  const payload = `${addr}.${exp}`;
  return `${payload}.${mac(payload, sessionSecret)}`;
}

export function verifySession(
  token: string | undefined,
  now = Date.now(),
): { address: string } | null {
  const { sessionSecret } = serverEnv();
  if (!sessionSecret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [addr, expStr, sig] = parts as [string, string, string];
  const exp = Number(expStr);
  if (!/^0x[a-f0-9]{40}$/.test(addr) || !Number.isFinite(exp)) return null;
  if (now > exp) return null;
  const expected = mac(`${addr}.${expStr}`, sessionSecret);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { address: addr };
}

export function sessionCookieHeader(token: string, maxAgeSecs = SESSION_TTL_MS / 1000): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeSecs)}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
