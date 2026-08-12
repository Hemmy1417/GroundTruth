# GroundTruth — Security Review (Phase 10)

Hostile review of every surface, 2026-08-11. Method: code audit per surface +
mechanical sweeps + 75 direct tests of which 30 are adversarial/security
probes (suites: `test_groundtruth_adversarial.py`, `test_groundtruth_hostile
.py`, `test_groundtruth_security.py`). Findings below; the honest residual
risks are stated last, not hidden.

## Trust model in one paragraph

The contract is the authority: escrow, bonds, judgments, evidence hashes,
windows, and the settlement table live on-chain. The web app holds no keys
and no privileged state — the Firestore mirror is a deletable cache written
only by the server-side reconciler from public chain state; SIWE sessions
exist for UX personalization and gate nothing privileged. A user who trusts
only their wallet and the contract loses nothing if every server component
is hostile or dead.

## Surface-by-surface

### Contract economics (the crown jewels)
- **Effects before transfers, everywhere.** Conservation is asserted
  (`split does not conserve escrow` reverts), accounting decremented, state
  flagged — and only then do transfers ride `emit_transfer(on="finalized")`
  (deferred to finality; the EOA-proxy pattern). No reentrancy window exists.
- **Escrow leaves exactly once.** Every close path (settle, negotiated
  split, expire, cancel) is state-guarded against every other; probed
  pairwise in `test_settle_then_every_other_close_path_refused` and
  `test_negotiated_close_blocks_later_settle`.
- **Bonds pay exactly once.** Reassess/stale-escape/negotiated-close races
  all clear `d_bond` and flip `d_state` before sending; double-payment
  probed in three dedicated tests. The ledger identity
  (escrow_held, bonds_held, settled_total) is asserted at every hop of the
  worst-case arc.
- **Numeric discipline.** bps fields bounded and whole-percent; buckets
  multiples of 5 in 0..100 (S16, incl. the second panel); integer floor
  math with the remainder always assigned; atto-scale u256 throughout.

### Judgment pipeline
- **Injection:** evidence bodies, party statements, and creator-supplied
  question/metric are delimiter-sanitized (`<<<` → `‹‹‹`) BEFORE hashing, so
  a hostile page or hostile creator cannot forge evidence framing, and the
  recorded hash binds exactly the judged bytes. Prompt declares evidence
  data-never-instructions; regex-gated tests pin those clauses.
- **Model failure:** malformed or incoherent output (enum escapes,
  SATISFIED-below-threshold, bad buckets) reverts with nothing recorded;
  prose-wrapped JSON is recovered; garbage confidence is coerced (advisory).
  All-sources-dark records INCONCLUSIVE — an information failure is never a
  finding.
- **Equivalence (S7):** verdict + completion_bucket + evidence_sufficient
  compared exactly between leader and validators; NO_EVIDENCE agrees only on
  shared blindness; validator errors follow the EXPECTED/TRANSIENT/LLM
  comparison protocol (LLM errors force rotation).

### Auth (SIWE)
- Nonces are single-use, expiring, server-issued, consumed atomically
  BEFORE signature work (replay dies regardless); chainId pinned; domain
  checked against Host (trustworthy behind Vercel); signature recovered
  pure-crypto (no RPC trust); session cookie is HMAC-SHA256 with
  timing-safe compare, httpOnly, SameSite=Lax, Secure in production.
- Deliberate design: sessions gate NOTHING privileged (no admin routes
  exist), so session theft yields nothing. Rate limits are per-instance
  (serverless) — documented as defense-in-depth, not the security boundary.

### Web layer
- **RPC proxy:** forwards only to the FIXED server-env upstream (no SSRF
  pivot), POST-only, 200KB body cap, caches only `gen_call`/`eth_chainId`
  for 3s with in-flight coalescing; upstream non-200s pass through verbatim
  and are never cached.
- **Reconciler:** permissionless but idempotent (mirror converges on public
  chain truth — there is nothing to poison), zod-validated input,
  rate-limited 6/min/IP, gated on a configured contract.
- **Demo routes:** static text, act param clamped to 1|2|3, `no-store`.
- **Firestore rules:** client writes denied on every collection; nonces and
  reconcile metadata unreadable; public collections mirror only what the
  public chain already exposes.
- **XSS/secrets sweeps:** no `dangerouslySetInnerHTML`/`innerHTML`/`eval`;
  evidence excerpts render as text in `<pre>`; no secret ever logged; server
  secrets appear in no client-bundled file (grep-verified).

### Wallet (S6)
- Writes go through the connected EIP-6963 provider injected into
  `createClient` — never a `window.ethereum` fallback; pinned by three
  repo-level signed-write tests against the real exported actions.

## Attacks attempted and their outcomes

| Attack | Outcome |
|---|---|
| Forge a second evidence source inside a hostile page | defanged by sanitize-then-hash; test-pinned |
| Hostile creator smuggles framing via question/metric | sanitized at creation; test-pinned |
| Double-pay escrow via settle/negotiate/expire/cancel races | every pair refused; ledger unmoved |
| Double-refund bond via reassess-after-terminal etc. | refused; bonds zero exactly once |
| Bait-and-switch a negotiation proposal | id-checked acceptance refuses stale ids |
| Early refund on a healthy agreement (day-1 evaluate) | provisional rule: early miss moves nothing |
| Freeze funds forever (dispute never resolved / deadline passes) | permissionless terminal escape + expiry refund |
| Source flood / oversized page / dead exhibit URLs | caps + truncation-at-hash + UNREACHABLE recorded, non-fatal |
| Replay a SIWE message | nonce consumed atomically before signature work — dies |
| Sign in for the wrong chain / forged signer | chainId pinned; recovered address compared — 401 |
| Wrong-state calls on all 13 write methods | every gate probed; ledger asserted unmoved |
| Second panel returns incoherent ruling | reverts; dispute stays FILED (retryable); bond safe |

## Residual risks — stated honestly

1. **Consensus is the trust model.** If genuinely convincing fake evidence
   persuades a validator majority, the system acts on it. The bonded
   challenge and the recorded dossier are the recourse, not a prevention.
2. **Party-chosen sources.** Mutual assent freezes the list and the prompt
   weighs source independence, but two colluding parties can settle whatever
   they like — as with any escrow, collusion between the only two
   stakeholders is out of scope.
3. **Serverless rate limits are per-instance.** A distributed attacker can
   burn the server's upstream RPC quota, stalling the mirror; the app
   degrades to client-side chain-direct reads rather than failing.
4. **The demo evidence is app-served.** Stated openly in the product and
   DEMO.md; the judgment machinery treats those URLs like any web source.
5. **Windows tolerate clock drift.** The two-source consensus clock carries
   a 300s divergence tolerance; a boundary call inside that tolerance can
   land on either side of a window edge. Windows are sized in days, so the
   tolerance is noise — but it is a tolerance, and it is documented rather
   than pretended away. When no clock source is trustworthy, every window
   fails closed: nothing settles, nothing forfeits, nothing expires.

## Verdict

No open findings. The review added five economic-invariant probes
(`test_groundtruth_security.py`) rather than trusting the earlier suites'
coverage claims; all 75 direct tests pass and genvm-lint is clean.