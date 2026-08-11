/**
 * SIWE auth flow against the REAL route handlers: nonce issue → message sign
 * (real key, viem) → verify sets the session cookie → me reads it → replay
 * dies on the consumed nonce. Sessions/nonces run on the memory fallbacks.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { GET as nonceGET } from "../app/api/auth/nonce/route";
import { POST as verifyPOST } from "../app/api/auth/verify/route";
import { GET as meGET } from "../app/api/auth/me/route";
import { _resetRateLimiter } from "../lib/server/ratelimit";

const HOST = "groundtruth.test";
const CHAIN_ID = 61999;

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-32-bytes-minimum-okay!!";
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID = String(CHAIN_ID);
  _resetRateLimiter();
});

async function getNonce(): Promise<string> {
  const res = await nonceGET(new Request(`https://${HOST}/api/auth/nonce`));
  expect(res.status).toBe(200);
  return (await res.json()).nonce;
}

async function signIn(nonce: string, account = privateKeyToAccount(generatePrivateKey())) {
  const message = createSiweMessage({
    address: account.address,
    chainId: CHAIN_ID,
    domain: HOST,
    nonce,
    uri: `https://${HOST}`,
    version: "1",
  });
  const signature = await account.signMessage({ message });
  const res = await verifyPOST(
    new Request(`https://${HOST}/api/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", host: HOST },
      body: JSON.stringify({ message, signature }),
    }),
  );
  return { res, account, message, signature };
}

describe("SIWE auth", () => {
  it("full flow: nonce → sign → verify → session cookie → me", async () => {
    const nonce = await getNonce();
    const { res, account } = await signIn(nonce);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("gt_session=");
    expect(setCookie).toContain("HttpOnly");

    const me = await meGET(
      new Request(`https://${HOST}/api/auth/me`, {
        headers: { cookie: setCookie.split(";")[0]! },
      }),
    );
    expect(me.status).toBe(200);
    expect((await me.json()).address).toBe(account.address.toLowerCase());
  });

  it("a replayed message dies on the consumed nonce", async () => {
    const nonce = await getNonce();
    const { res, message, signature } = await signIn(nonce);
    expect(res.status).toBe(200);
    const replay = await verifyPOST(
      new Request(`https://${HOST}/api/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", host: HOST },
        body: JSON.stringify({ message, signature }),
      }),
    );
    expect(replay.status).toBe(401);
  });

  it("rejects a message for the wrong chain", async () => {
    const nonce = await getNonce();
    const account = privateKeyToAccount(generatePrivateKey());
    const message = createSiweMessage({
      address: account.address,
      chainId: 1, // mainnet, not ours
      domain: HOST,
      nonce,
      uri: `https://${HOST}`,
      version: "1",
    });
    const signature = await account.signMessage({ message });
    const res = await verifyPOST(
      new Request(`https://${HOST}/api/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", host: HOST },
        body: JSON.stringify({ message, signature }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a forged signature (signer ≠ claimed address)", async () => {
    const nonce = await getNonce();
    const claimed = privateKeyToAccount(generatePrivateKey());
    const attacker = privateKeyToAccount(generatePrivateKey());
    const message = createSiweMessage({
      address: claimed.address,
      chainId: CHAIN_ID,
      domain: HOST,
      nonce,
      uri: `https://${HOST}`,
      version: "1",
    });
    const signature = await attacker.signMessage({ message });
    const res = await verifyPOST(
      new Request(`https://${HOST}/api/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", host: HOST },
        body: JSON.stringify({ message, signature }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a nonce the server never issued", async () => {
    const { res } = await signIn("deadbeefdeadbeef");
    expect(res.status).toBe(401);
  });
});
