// Formatting helpers — mono glyphs, tabular numerals, honest fallbacks.

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function shortHash(h: string | null | undefined, n = 10): string {
  if (!h) return "—";
  return h.length <= n ? h : `${h.slice(0, n)}…`;
}

export function formatGen(atto: string | bigint | null | undefined, digits = 3): string {
  if (atto == null || atto === "") return "—";
  const v = typeof atto === "bigint" ? atto : BigInt(atto);
  const whole = v / 10n ** 18n;
  const frac = v % 10n ** 18n;
  if (digits === 0 || frac === 0n) return whole.toString();
  const fracStr = (frac + 10n ** 18n).toString().slice(1, 1 + digits);
  const trimmed = fracStr.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

export function parseGen(input: string): bigint | null {
  const t = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  return BigInt(whole!) * 10n ** 18n + BigInt((frac + "0".repeat(18)).slice(0, 18));
}

export function pct(bps: number | null | undefined): string {
  if (bps == null) return "—";
  return `${bps % 100 === 0 ? bps / 100 : (bps / 100).toFixed(1)}%`;
}

export function formatEpoch(epoch: number | null | undefined): string {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatEpochTime(epoch: number | null | undefined): string {
  if (!epoch) return "—";
  const d = new Date(epoch * 1000);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

export function timeLeft(deadlineEpoch: number, nowMs = Date.now()): string {
  const secs = deadlineEpoch - Math.floor(nowMs / 1000);
  if (secs <= 0) return "expired";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d >= 2) return `${d}d ${h}h`;
  if (h > 0) return `${d * 24 + h}h ${m}m`;
  return `${m}m`;
}

/** Date input (yyyy-mm-dd) → end-of-day UTC epoch seconds. */
export function dateInputToEpoch(v: string): number {
  const t = Date.parse(`${v}T23:59:00Z`);
  return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
}
