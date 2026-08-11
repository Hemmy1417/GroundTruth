import { describe, it, expect } from "vitest";
import { GET as progressGET } from "../app/api/demo/harborview/progress/route";
import { GET as inspectionGET } from "../app/api/demo/harborview/inspection/route";
import { GET as auditGET } from "../app/api/demo/harborview/audit/route";

const url = (path: string, act?: number) =>
  new Request(`https://gt.test${path}${act ? `?act=${act}` : ""}`);

describe("demo evidence routes", () => {
  it("progress acts tell three different stories (60 → 95 → 100)", async () => {
    const a1 = await (await progressGET(url("/api/demo/harborview/progress", 1))).text();
    const a2 = await (await progressGET(url("/api/demo/harborview/progress", 2))).text();
    const a3 = await (await progressGET(url("/api/demo/harborview/progress", 3))).text();
    // whitespace-tolerant: report prose wraps lines mid-figure
    const flat = (s: string) => s.replace(/\s+/g, " ");
    expect(flat(a1)).toContain("60 percent");
    expect(flat(a2)).toContain("95 percent");
    expect(flat(a3)).toContain("100 percent");
    expect(new Set([a1, a2, a3]).size).toBe(3);
  });

  it("inspection registry moves none → preliminary → certified", async () => {
    const a1 = await (await inspectionGET(url("/api/demo/harborview/inspection", 1))).text();
    const a2 = await (await inspectionGET(url("/api/demo/harborview/inspection", 2))).text();
    const a3 = await (await inspectionGET(url("/api/demo/harborview/inspection", 3))).text();
    expect(a1).toContain("NO COMPLETION INSPECTION");
    expect(a2).toContain("CERTIFICATE PENDING");
    expect(a3).toContain("CERTIFIED — FINAL INSPECTION PASSED");
  });

  it("bad/missing act falls back to act 1, never errors", async () => {
    const r = await progressGET(url("/api/demo/harborview/progress", 9));
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("60 percent");
  });

  it("audit note (challenger's exhibit) argues the preliminary-certificate case", async () => {
    const t = await (await auditGET()).text();
    expect(t).toContain("PRELIMINARY");
    expect(t).toContain("should not be treated as satisfied");
  });

  it("serves text/plain with no-store (validators must always see the live act)", async () => {
    const r = await progressGET(url("/api/demo/harborview/progress", 1));
    expect(r.headers.get("content-type")).toContain("text/plain");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
