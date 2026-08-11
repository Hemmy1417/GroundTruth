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

## Phase 12 — production integration (next)
Wire the live address into the deployed app, then drive the Harborview demo
(create → accept → evaluate → dispute → settle) end-to-end on-chain, recording
each act's tx for the judges.
