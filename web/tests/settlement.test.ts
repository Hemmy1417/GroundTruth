/**
 * The deterministic settlement preview — the SAME table the contract runs
 * (Phase 5 mirrors these cases in contract tests; keep both in sync).
 */
import { describe, it, expect } from "vitest";
import { settlementPreview } from "../lib/chain/types";

const GEN = 10n ** 18n;
const amount = 3n * GEN;

describe("settlement table v1", () => {
  it("at/above threshold → full release", () => {
    for (const bucket of [90, 95, 100]) {
      const s = settlementPreview(amount, bucket, 9000, 6000);
      expect(s).toEqual({ payee: amount, payer: 0n, rule: "FULL_RELEASE" });
    }
  });

  it("floor ≤ bucket < threshold → pro-rata by bucket, remainder refunds", () => {
    const s = settlementPreview(amount, 60, 9000, 6000);
    expect(s.rule).toBe("PRO_RATA");
    expect(s.payee).toBe((amount * 6000n) / 10000n); // 1.8 GEN
    expect(s.payer).toBe(amount - s.payee);          // 1.2 GEN
    expect(s.payee + s.payer).toBe(amount);          // conservation
  });

  it("below floor → full refund", () => {
    const s = settlementPreview(amount, 55, 9000, 6000);
    expect(s).toEqual({ payee: 0n, payer: amount, rule: "REFUND" });
  });

  it("floor = 0 disables partial: anything below threshold refunds", () => {
    const s = settlementPreview(amount, 85, 9000, 0);
    expect(s.rule).toBe("REFUND");
    expect(s.payer).toBe(amount);
  });

  it("binary agreement is just threshold = 100%", () => {
    expect(settlementPreview(amount, 100, 10000, 0).rule).toBe("FULL_RELEASE");
    expect(settlementPreview(amount, 95, 10000, 0).rule).toBe("REFUND");
  });

  it("conserves every wei across the whole bucket range", () => {
    for (let bucket = 0; bucket <= 100; bucket += 5) {
      const s = settlementPreview(amount, bucket, 9000, 6000);
      expect(s.payee + s.payer).toBe(amount);
    }
  });
});
