# GroundTruth — Architecture (Phase 1)

**One deep primitive:** define a financial agreement around something happening
in the real world, gather evidence, have GenLayer judge whether the condition
was satisfied, allow that judgment to be challenged, and settle automatically.

Not six features — one object (the **Agreement**) moving through one lifecycle:

```
DEFINE → FUND → EVIDENCE → JUDGE → SHOW CONSENSUS → (DISPUTE → RE-JUDGE) → SETTLE
```

---

## 1. System overview

```
┌────────────────────────── Browser ──────────────────────────┐
│  Next.js app (Vercel) — wallet auth (EIP-6963 + SIWE)       │
│  reads/writes chain via same-origin /api/rpc proxy          │
│  realtime UX (dispute room, consensus) via Firestore        │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
     ┌─────────▼──────────┐    ┌──────────▼─────────┐
     │  GENLAYER STUDIONET │    │ Firestore (read-   │
     │  groundtruth.py     │    │ model ONLY; written│
     │  — the AUTHORITY    │    │ by server routes   │
     │  agreements, escrow,│    │ reconciling from   │
     │  evidence hashes,   │    │ chain; deletable   │
     │  judgments, disputes│    │ without data loss) │
     └─────────┬──────────┘    └────────────────────┘
               │ fetches at judgment time
     ┌─────────▼──────────────────────────┐
     │ Real-world evidence (public URLs)   │
     │ registered per agreement; demo acts │
     │ served by /api/demo/* routes        │
     └────────────────────────────────────┘
```

**Boundary rule (the Sentinel discipline, kept):**
- **GenLayer decides MEANING** — "does this evidence prove the condition was
  satisfied, and to what completion level?"
- **Deterministic code decides MONEY** — a pure function maps the agreed
  judgment to the payout split. No LLM ever authors an amount.
- **Firestore is a mirror** — realtime UX and fast lists; chain is truth;
  every mirrored row carries the tx hash it derives from.

## 2. The Agreement object (contract storage)

```
Agreement {
  id                     u256
  payer                  Address   — funds the escrow (project owner / financier)
  payee                  Address   — receives on satisfaction (contractor)
  title                  str       — "Harborview Tower — structural completion"
  condition_question     str       — the judgment question, frozen at creation
  metric                 str       — what completion is measured against
  threshold_bps          u256      — release trigger (9000 = 90%); 10000 = binary YES
  floor_bps              u256      — partial-release floor (0 = no partial payout)
  deadline_epoch         u256      — when the condition must be met
  evidence_sources       DynArray[str]  — 1–4 public URLs, frozen at creation
  amount_atto            u256      — escrowed GEN
  state                  str       — lifecycle state (below)
  evaluations            DynArray[u256] — judgment history
  dispute                {...}     — bonded challenge state
  settlement             {...}     — final split, recorded once, terminal
}
```

**Threshold-native:** binary YES/NO is just `threshold_bps = 10000, floor_bps = 0`.
One engine, no special cases.

## 3. Lifecycle state machine

```
        create_agreement (payer funds in the same tx)
                 │
                 ▼
             PROPOSED ── payee assent required: the evidence list binds them.
                 │        payer may cancel_proposed → CANCELLED (full refund)
        accept_agreement (payee)
                 │
                 ▼
              FUNDED ◄────────────────┐
                 │                     │ INCONCLUSIVE / ERROR
        evaluate (permissionless,      │ (no state change, cooldown, retry)
        after min_evidence_delay)      │
                 ▼                     │
            EVALUATED ─────────────────┘
                 │ conclusive verdict recorded
                 ▼
              ARMED ── challenge window (bonded, either party)
                 │                         │
     window expires unchallenged      challenge(bond, statement, new_urls)
                 │                         ▼
                 │                     DISPUTED
                 │                         │ re_evaluate → second panel judges the
                 │                         │ RECORDED dossier + challenge evidence
                 │                         ▼
                 │                    RE_EVALUATED (final — one dispute round)
                 │                         │
                 └──────────┬──────────────┘
                            ▼
                      settle (anyone)
                            ▼
                        SETTLED  — deterministic split executed, terminal

Failure paths:
  deadline + grace passes, no conclusive judgment  → EXPIRED → full refund to payer
  dispute filed but re-evaluation never concludes  → stale-dispute escape after
                                                     terminal window: original
                                                     verdict stands, bond refunded
```

- **One dispute round** (not infinite appeals): initial verdict → one bonded
  challenge → re-evaluation is final. Documented, honest, bounded.
- **INCONCLUSIVE never settles and never punishes** — it returns the agreement
  to FUNDED for retry after cooldown. Only a conclusive judgment can move money.

**Verdict timing semantics (S1 — enforce the window, both directions):**

| When | SATISFIED | NOT_SATISFIED |
|---|---|---|
| **Before deadline** | conclusive — arms the challenge window; settles after it (milestone met early = pay early) | **provisional** — recorded, shown ("would refund today"), but never settles: "not yet" is not "failed". Agreement stays FUNDED. |
| **At/after deadline** | conclusive (evidence must show satisfaction *by* the deadline — the judgment question carries the deadline) | conclusive — arms the challenge window; refund split after it |

Without this rule a payer could evaluate on day 1 of a 6-month milestone and
refund out of a healthy agreement. The deadline is enforced inside the
judgment question AND the settlement gate, not merely stored.

**Window boundary rule (S15):** a challenge is valid strictly *inside* the
challenge window; settle is callable strictly *after* it. The two predicates
are the same clock comparison negated — there is no instant where both
succeed, so a challenge cannot race a settle at the edge.

### Lifecycle additions (Phase-4 review; all two-party-consent, none unilateral)

- **Negotiated settlement** — either party may propose a split (payee share
  in bps of escrow); the counterparty accepts → SETTLED with rule
  `NEGOTIATED`, no panel. A newer proposal from either side replaces the
  open one; acceptance must match the exact proposal it accepts (id-checked,
  no bait-and-switch). Available in FUNDED / ARMED / DISPUTED — settling out
  of court is legal right up until the gavel. This is the arbitration thesis
  itself: the credible threat of the panel is what makes honest negotiation
  rational.
- **Mutual deadline extension** — either party proposes a new (later)
  deadline; the counterparty accepts → deadline moves. Construction overruns
  are normal, not disputes. Both-consent means no unilateral window-moving
  (S1 stays intact).
- **Keeper bounty** — a deterministic protocol-level cut (config
  `keeper_bounty_bps` of escrow, small) is paid to whoever executes the
  final `settle`. Agreements become self-executing: nobody has to remember,
  and monitoring agents earn by closing them. The bounty is storage-read,
  never LLM-produced (S7-safe), and paid once from escrow before the split.
- **Project tag** — an optional creation-time string; the frontend groups
  agreements into tranched projects ("Harborview Tower — Milestones 1–3").
  Pure metadata; no contract logic reads it.

## 4. Judgment & equivalence (S7 discipline)

The panel's structured judgment:

```json
{
  "verdict": "SATISFIED | NOT_SATISFIED | INCONCLUSIVE",
  "completion_bucket": 85,          // 0–100 in 5-point buckets
  "evidence_sufficient": true,
  "confidence": "HIGH|MEDIUM|LOW",  // advisory — outside equivalence
  "reason": "..."                   // advisory — outside equivalence
}
```

**Pinned in validator equivalence (every economically decisive field):**
`verdict`, `completion_bucket` (5-point buckets make agreement achievable),
`evidence_sufficient`. Advisory fields are labeled as such in the UI and no
state-changing rule reads them.

**Structural validation before state (S16)** — consensus can agree on
garbage, so every ruling is parsed into a validated struct at the contract
boundary before anything reads it: enum membership (`verdict`,
`confidence`), `completion_bucket` must be an integer multiple of 5 in
0–100, plus **coherence rules**: `SATISFIED` requires
`evidence_sufficient == true`; `SATISFIED` with `bucket < threshold` is
incoherent; `NOT_SATISFIED` with `bucket ≥ threshold` is incoherent — each
rejected as an LLM error (revert; nothing recorded), never settled.

**Settlement math (pure function, versioned):**

```
if verdict == SATISFIED and bucket >= threshold:   payee gets 100%
elif floor > 0 and bucket >= floor:                payee gets amount × bucket/100
                                                   payer refunded the remainder
else:                                              payer refunded 100%
```

The UI shows the exact rule row that fired — "consensus decided the completion
level; this table decided the money."

## 5. Evidence registry

Every evaluation records, on-chain, per source: `url · sha256 · excerpt ·
fetched_at · status (OK/UNREACHABLE)`. The hash binds the judged bytes; the
excerpt preserves the judged record for the dispute round (the second panel
judges the RECORDED dossier plus the challenger's new evidence — hashed at
filing). Delimiter sanitization (`<<<` → `‹‹‹`) before hashing, exactly as
proven in Sentinel — a hostile page cannot forge additional sources.

The registry UX (source → what it says → when → why it matters → status) is
rendered from these on-chain rows; Firestore only accelerates and live-updates
the display.

**S8 posture — party-chosen evidence, stated honestly and bound at the boundary:**
the agreement's evidence sources are chosen by the parties, and a payee may
well control one (a contractor's own progress page). Four defenses, layered:

1. **Mutual assent, frozen** — the payer's funding transaction is on-chain
   approval of the exact source list; it cannot change afterward (only a
   dispute can introduce new sources, hashed at filing).
2. **Integrity-bound at the boundary** — each evaluation hashes exactly the
   bytes it fetched, at fetch time, and stores the excerpt + its sha256 on-chain;
   the dispute panel then judges those RECORDED on-chain excerpts (S14) — the
   tamper-proof record, not a live refetch used as evidence — and *separately*
   re-fetches only to make post-ruling edits *visible* as tampering signals.
3. **Source-nature weighing in the prompt** — the panel is instructed that
   self-published party sources carry less evidentiary weight than
   independent ones (registries, inspection records), and that
   `evidence_sufficient=false` is the answer when only interested-party
   claims support satisfaction.
4. **Party statements are context, never evidence** — a challenge statement
   is unauthenticated text; only contract-fetched sources can ground a
   verdict flip (the Aegis-letter rule).

## 5b. Consensus wall-clock (S13)

Every window (deadline, challenge, stale-dispute terminal, cooldown) anchors
on the portfolio's multi-source consensus clock — three `/cdn-cgi/trace`
sources (Cloudflare, DigitalOcean, Medium) cross-checked against each other,
plus an Ethereum block-time floor — with the **asymmetric divergence guard**
(the fixed ClaimSense version; the symmetric guard froze timed methods in 13
earlier contracts when an explorer's indexer lagged). Honest semantics, stated
in the README too (S12): *up to* three sources, cross-checked when at least two
answer, with the chain block time as a one-directional floor; one live source
is trusted; zero live sources → the clock reads 0 and every window **fails
closed** (nothing settles, nothing forfeits). Arming itself requires a live
clock — the arming path reads the clock and reverts when it is down — so a
window can never be armed against a dead clock; its challenge deadline is
anchored to that live read, never activity-counted.

## 6. Consensus visualization (honesty contract)

Show what the protocol actually enforces: the pinned fields the validators had
to agree on, evidence reviewed count, and the verdict. Validator identities /
vote counts are protocol-internal on StudioNet — never fabricated. Advisory
fields carry an explicit ADVISORY badge.

## 7. Firebase (Firestore) boundary

- Collections: `agreements` (list/detail mirror), `evaluations`, `evidence`,
  `timeline` — all written **only** by Next.js API routes using the Admin SDK,
  reconciling from chain reads after each observed tx.
- Client **never** writes Firestore. Security rules: client writes denied.
- Realtime: dispute room + consensus panel subscribe to Firestore for live
  updates while transactions confirm; every fact displays with its chain tx.
- Deleting Firestore loses nothing — the app can always fall back to
  chain-direct reads (the Sentinel lesson, kept as a hard requirement).

## 8. Auth & wallets

Wallet-based only: EIP-6963 discovery, provider-injected genlayer-js client
(S6 — writes signed by the connected wallet, proven by the signed-write test
pattern), SIWE session via API route for personalization ("my agreements") and
write rate-limiting on server routes. No custodial keys, no accounts.

## 9. Security model (inherited + new)

Inherited from the proven portfolio: prompt-injection hardening (data-not-
instructions framing, delimiter sanitization, size caps), structural judgment
validation before any state change (S16), fail-safe nondet (LLM/web failure →
revert or INCONCLUSIVE, never a false settlement), bonded disputes, terminal
escapes for stuck states (S17), wei-conservation accounting (escrow + bonds
always balance), payout via deferred transfer at finality.

New surfaces to review in Phase 10: threshold-boundary gaming (evidence
engineered to sit exactly at a bucket edge), payer/payee collusion timing,
challenge-bond sizing vs escrow size.

**Views are indexed from day one (S10):** per-party agreement registries and
a bounded global list — no `@gl.public.view` may scan the full agreement map.

**Test suite is a deliverable, not an afterthought (S11):** direct-mode
pytest (core + adversarial + wei-conservation asserting escrow + bonds always
balance), the repo-level signed-write test (S6), genvm-lint in CI.

## 9b. Judge-standards compliance matrix (S1–S17)

| Std | How GroundTruth meets it |
|---|---|
| S1 | deadline enforced in the judgment question AND settlement gate; verdict timing semantics (early NOT_SATISFIED is provisional) |
| S2 | verdicts rest on contract-fetched evidence; challenge window is a real, clock-enforced response opportunity |
| S3 | no third-party pooling — escrow tracked to its agreement, bonds to their disputant |
| S4 | ARMED challenge window before any settlement drain; bonded challenge |
| S5 | INCONCLUSIVE/ERROR never settle; unreachable sources are information failures; hard failures revert |
| S6 | provider-injected genlayer-js client; repo signed-write test |
| S7 | verdict + completion_bucket + evidence_sufficient all pinned; advisory fields outside equivalence and outside money |
| S8 | mutual-assent frozen sources; hash-bound reads; source-nature weighing; statements-are-context rule |
| S9 | real GEN escrow settles on the verdict — the adjudication is load-bearing |
| S10 | indexed views only |
| S11 | direct + adversarial + wei-conservation + signed-write suites, CI |
| S12 | advisory badges; public-on-chain statements never called sealed; honest clock language; demo honesty statement |
| S13 | multi-source wall-clock (3 cross-checked cdn sources + Ethereum-block floor), asymmetric guard, fail-closed, arming requires a live clock |
| S14 | dispute panel judges the on-chain RECORDED excerpts (not a live refetch); a fresh refetch is included only to surface post-ruling edits |
| S15 | single funding path; single challenge path; challenge/settle boundary race excluded by construction |
| S16 | validated ruling struct with coherence rules before any state read |
| S17 | stale-dispute terminal escape (permissionless, wall-clock, defined rule: original verdict stands, bond refunded) + EXPIRED refund path |

## 10. Deployment model

- Contract → GenLayer StudioNet via CLI (no Docker), pinned runner.
- Web → Vercel (env: contract address, RPC URL, chain id; API routes provide
  the same-origin RPC proxy + demo evidence acts).
- Firestore → Firebase project; Admin credentials only in Vercel server env.
- CI → GitHub Actions: contract lint+tests, web typecheck+tests+build.

## 11. Flagship demo (construction / project finance)

**"Harborview Tower — Milestone 3: structural completion ≥ 90%."**
Payer escrows 3 GEN against the milestone with a 60% partial floor.

- **Act 1** — progress reports show ~60%: evaluation lands NOT_SATISFIED with
  bucket 60 → below threshold, above floor: the UI shows exactly what WOULD
  settle today (1.8 / 3 GEN) without settling.
- **Act 2** — reports reach 95%: SATISFIED @ 95 → ARMED. The payer challenges
  with "the inspection was preliminary; final failed" + a new source; the
  second panel re-judges the recorded dossier + new evidence — the dispute
  room shows both dossiers side by side.
- **Act 3** — re-evaluation confirms (or corrects) the verdict → settle →
  real GEN splits per the table, on-chain, traceable end to end.

Demo evidence acts are served by the app's own `/api/demo/*` routes (publicly
reachable by validators — the Sentinel pattern), and the runbook states
honestly: the pages are demo-controlled; the mechanism is production.
```
