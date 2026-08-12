# GroundTruth — Deployment

## Deployment record — StudioNet (2026-08-11)

| | |
|---|---|
| Contract | `0x5D35a58B2e5e131F837D70Fe0CcC8901772435A9` |
| Deploy tx | `0x51d056f8e8737a821b6a7accf8e7e7ea5ecb8fb358d8331bced135c06cb4d30e` |
| Version | v0.1.0 |
| Consensus | ACCEPTED — 3× AGREE |
| Deployer/owner | `0x10dbf82a8bb191bd1c082de5ef915e998aa5ccd7` |
| Constructor | `eval_cooldown_seconds = 300` (demo cadence) |
| Network | GenLayer StudioNet (chainId 61999), gasless |
| Runner | pinned `py-genlayer:1jb45aa8…jpz09h6` |

### Pre-deploy gate (all green)
- `genvm-lint check groundtruth.py --json` → ok, 0 diagnostics
- 75 direct tests pass (core · disputes · adversarial · hostile · security)
- runner version hash pinned; no `:test`/`:latest`

### Post-deploy verification
- `get_config` reads clean: owner set, policy v1, challenge window 72h,
  dispute terminal 7d, cooldown 300s, bond 1 GEN, keeper 50 bps, max 4 sources.
- `get_stats` reads clean: empty ledger (0 agreements, 0 escrow, 0 bonds).
- **Deployed bytecode byte-for-byte matches local `groundtruth.py`** (55,581
  bytes; `genlayer code` head/tail verified).
- **Frontend read path verified**: the app's genlayer-js client
  (`createClient({ chain: studionet })`) reads `get_config` / `get_stats` /
  `list_agreements` against the live address correctly.

### Deployment topology

```text
contract → GenLayer StudioNet via genlayer CLI (no Docker)
web      → Vercel (root: web/); same-origin /api/rpc proxy, /api/demo evidence,
           /api/auth SIWE, /api/reconcile → Firestore mirror
mirror   → Firestore (optional; realtime convenience, Admin SDK writes only —
           the app runs chain-direct without it)
```

### Environment (Phase 12 hand-off)
- `contract/.env` — `GROUNDTRUTH_CONTRACT_ADDRESS` set (integration tests).
- `web/.env.local` — `NEXT_PUBLIC_CONTRACT_ADDRESS` set.
- Vercel deploy needs (public): `NEXT_PUBLIC_CONTRACT_ADDRESS`,
  `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_GENLAYER_CHAIN_ID`. Optional
  server: `GENLAYER_RPC_URL`, `SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_B64`
  + the `NEXT_PUBLIC_FIREBASE_*` client trio, `DEMO_ADMIN_TOKEN`. Do NOT set
  `NEXT_PUBLIC_API_URL` unless a separate API host exists.

### Known tooling note (not a contract issue)
`gltest`'s attach-to-live (`build_contract(contract_address=…)`) needs a
working GenVM to compute the schema and fails on Windows / some CI with
"Failed to get schema from all clients" — the portfolio-documented GenLayer
tooling limitation. The live contract is proven via the CLI (`genlayer call`)
and the frontend genlayer-js client, both of which read it correctly. The
integration suite runs where gltest can provision a GenVM (Linux + runtime,
local Studio); it is CI-skipped by default until then.

## Phase 12 — production integration

### Live E2E proof — the whole primitive on-chain (2026-08-12)

A short-window **test instance** (`0x011476b18CA30aD38c2c94bbfE2c777adcE9d6f2`,
600s challenge window) carried the complete lifecycle end-to-end in one sitting,
so the time-gated dispute round is demonstrable live. The main deploy keeps the
production 72h window and stays pristine.

**Agreement #1 — “Harborview Tower — Milestone 3 (E2E)”.** Anyone can verify by
reading the contract's own authoritative storage — no trust in this doc required:

| Act | Recorded result |
|---|---|
| create + accept | 0.5 GEN escrowed; sources frozen at the payee's assent |
| evaluate → eval #1 (INITIAL) | **SATISFIED @ 100**, not provisional (certified registry) → ARMED |
| challenge → dispute FILED | **1.0 GEN** bond held; the lender's audit-note exhibit snapshotted at filing |
| reassess → eval #2 (REASSESSMENT) | **SATISFIED @ 100 → UPHELD** (verdict unchanged) → bond forfeits to payee · tx `0x35f383b9…716c71` |
| settle → settlement | **FULL_RELEASE** — payee **0.4975** · keeper **0.0025** · payer **0** · policy v1 · tx `0x2c2940ea…60d83c` |

Final state: `state SETTLED · dispute RESOLVED`. **Conservation exact**
(0.4975 + 0.0025 + 0 = 0.5000). Test-instance ledger flat afterward (escrow 0,
bonds 0, settled_total 0.5). Reproduce with the CLI or genlayer-js:

```text
genlayer call 0x011476b18CA30aD38c2c94bbfE2c777adcE9d6f2 get_agreement   --args '[1]'
genlayer call 0x011476b18CA30aD38c2c94bbfE2c777adcE9d6f2 get_evaluation  --args '[1]'   # INITIAL SATISFIED@100
genlayer call 0x011476b18CA30aD38c2c94bbfE2c777adcE9d6f2 get_evaluation  --args '[2]'   # REASSESSMENT SATISFIED@100
```

> The dispute machinery behaved exactly as designed: the second panel judged the
> **recorded certified dossier** (not a refetch), upheld the original verdict, and
> the bond went to the counterparty who was dragged through the challenge. UPHELD
> is the honest outcome — the challenge leaned on a *preliminary* audit note, but
> the record on file was the *issued* certificate. Uncertainty would have refunded
> the bond (INCONCLUSIVE); a real reversal would have paid pro-rata on the
> corrected bucket. All three paths are in the test suite.

**Engineering note (StudioNet):** close consensus writes by SUBMIT + poll on-chain
state (`get_agreement` predicate), never by `waitForTransactionReceipt` — the
receipt-waiter returns the tx hash and then throws `fetch failed` / an HTML error
page under RPC pressure, and a naive receipt walker can miss a nondet revert. A
nondet `reassess` reverts on no-consensus (S5 fail-safe) leaving the dispute
FILED; just re-fire — state-polling detects true resolution past read-lag.

### Hosting — Vercel (GitHub-connected) + Firebase realtime mirror

**1 · GitHub.** GroundTruth is a standalone repo (its own `.git`, no secrets
tracked — `web/.env.local` and `contract/.env` are gitignored, verified). Remote
is preset to `https://github.com/Hemmy1417/GroundTruth.git`.
- Create an **empty** repo `Hemmy1417/GroundTruth` (no README / .gitignore / license — avoids a first-push conflict).
- `git push -u origin main`.

**2 · Vercel import.** New Project → Import `Hemmy1417/GroundTruth`.
- **Root Directory: `web/`** — critical; the Next app is not at the repo root.
- Framework preset **Next.js** (auto); build `next build`; output auto.

**3 · Environment variables** (Vercel → Settings → Environment Variables; set
before the first build — `NEXT_PUBLIC_*` are baked in at build time):

| Var | Value | Needed for |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x5D35a58B2e5e131F837D70Fe0CcC8901772435A9` | **required** (the live main contract) |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | `https://studio.genlayer.com/api` | has default |
| `NEXT_PUBLIC_GENLAYER_CHAIN_ID` | `61999` | has default |
| `GENLAYER_RPC_URL` | `https://studio.genlayer.com/api` | server proxy; has default |
| `SESSION_SECRET` | 32+ random hex bytes | SIWE session cookies (else stateless) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web-app config | realtime mirror |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your project id | realtime mirror |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web-app config | realtime mirror |
| `FIREBASE_SERVICE_ACCOUNT_B64` | base64 of service-account JSON | mirror writes (Admin SDK) |
| `DEMO_ADMIN_TOKEN` | any long random string | reserved for future demo-admin gating — **not currently enforced** (demo acts are read-only static content switched by a public `?act` param); safe to omit |

```bash
# SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# FIREBASE_SERVICE_ACCOUNT_B64 (one line)
node -e "console.log(Buffer.from(require('fs').readFileSync('sa.json')).toString('base64'))"
```

**4 · Firebase project (realtime mirror).**
- Create a Firebase project → add a **Web App** → copy `apiKey`/`projectId`/`appId` into the `NEXT_PUBLIC_FIREBASE_*` vars.
- Firestore → create database (production mode).
- Publish the rules in [`firestore.rules`](../firestore.rules) (Console → Firestore → Rules → paste → Publish, or `firebase deploy --only firestore:rules`). They allow public reads on the mirror, zero client writes.
- Project Settings → **Service accounts** → *Generate new private key* → base64-encode it (command above) → `FIREBASE_SERVICE_ACCOUNT_B64`.
- Runtime: the client fire-and-forgets `/api/reconcile` after each confirmed write; the Admin SDK mirrors chain → Firestore; the dispute room and agreement file live-refresh via `onSnapshot`. With Firebase unset the app still runs — it just polls instead of live-refreshing.

**5 · Post-deploy smoke.**
- Open the deployed URL → `/agreements` reads with no “Not configured” badge.
- Connect a wallet → create a small agreement → confirm the tx-toast lifecycle (signing → confirming → reconciling → done) and that the docket updates.
- With Firebase on: a second browser live-refreshes the agreement file with no manual reload.
