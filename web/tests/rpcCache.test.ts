import { describe, it, expect, beforeEach } from "vitest";
import { forwardWithCache, _resetRpcCache } from "../lib/server/rpcCache";

const URL_ = "https://rpc.example/api";

function fetchCounter(status = 200, body = '{"jsonrpc":"2.0","result":"ok"}') {
  let calls = 0;
  const impl = (async () => {
    calls++;
    return new Response(body, { status });
  }) as unknown as typeof fetch;
  return { impl, calls: () => calls };
}

const genCall = (id: number) =>
  JSON.stringify({ jsonrpc: "2.0", id, method: "gen_call", params: [{ to: "0xabc" }] });

describe("rpc proxy cache", () => {
  beforeEach(() => _resetRpcCache());

  it("identical gen_call bodies within TTL hit upstream once", async () => {
    const f = fetchCounter();
    await forwardWithCache(URL_, genCall(1), f.impl, 1000);
    await forwardWithCache(URL_, genCall(1), f.impl, 2000);
    expect(f.calls()).toBe(1);
  });

  it("different bodies are not shared", async () => {
    const f = fetchCounter();
    await forwardWithCache(URL_, genCall(1), f.impl, 1000);
    await forwardWithCache(URL_, genCall(2), f.impl, 1000);
    expect(f.calls()).toBe(2);
  });

  it("TTL expiry refetches", async () => {
    const f = fetchCounter();
    await forwardWithCache(URL_, genCall(1), f.impl, 1000);
    await forwardWithCache(URL_, genCall(1), f.impl, 10_000);
    expect(f.calls()).toBe(2);
  });

  it("writes (eth_sendRawTransaction) are never cached", async () => {
    const f = fetchCounter();
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: ["0x1"] });
    await forwardWithCache(URL_, body, f.impl, 1000);
    await forwardWithCache(URL_, body, f.impl, 1001);
    expect(f.calls()).toBe(2);
  });

  it("upstream 429 surfaces verbatim and is not cached", async () => {
    const f = fetchCounter(429, '{"error":"rate limited"}');
    const r1 = await forwardWithCache(URL_, genCall(1), f.impl, 1000);
    expect(r1.status).toBe(429);
    const ok = fetchCounter();
    const r2 = await forwardWithCache(URL_, genCall(1), ok.impl, 1500);
    expect(r2.status).toBe(200); // retry reached upstream — the 429 wasn't cached
  });

  it("invalid JSON is rejected without an upstream call", async () => {
    const f = fetchCounter();
    const r = await forwardWithCache(URL_, "not json", f.impl, 1000);
    expect(r.status).toBe(400);
    expect(f.calls()).toBe(0);
  });
});
