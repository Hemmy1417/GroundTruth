# GroundTruth

**Escrow that settles on verified truth.**

Define a financial agreement around something happening in the real world —
"release 3 GEN when structural completion reaches 90%" — and GroundTruth does
the rest: GenLayer validators fetch and judge the evidence under consensus, a
deterministic versioned table converts the agreed judgment into the payout,
and either party can challenge the verdict with new evidence before it
settles. One primitive: **define → evidence → judgment → consensus →
(dispute → re-judgment) → settlement.**

## Status

**Live: [groundtruth-gen.vercel.app](https://groundtruth-gen.vercel.app)** —
contract `0xc05383b8B70603bA4858c97673D5Cc313196c7AB` (v0.2.0, GenLayer
StudioNet). 90 direct tests + 30 web tests green, genvm-lint clean, deployed
bytecode byte-matches source. Full lifecycle proven on-chain — both dispute
branches, a negotiated exit, and a mismatched-evidence refusal — tx hashes in
`docs/DEPLOYMENT.md`.

## Live demo — a real dispute is waiting

Reading needs no wallet. The docket at
[/agreements](https://groundtruth-gen.vercel.app/agreements) currently holds:

| # | State | What you can do |
|---|---|---|
| 1 | **DISPUTED** — 1 GEN bond posted | Open the dispute room: panel 1's recorded dossier (SATISFIED @ 100), the bonded challenge citing an audit note, both evidence hashes. **Reassess is permissionless** — connect any funded StudioNet wallet and trigger the second panel yourself; the bond routes on-chain by the verdict. |
| 2 | **FUNDED** — awaiting judgment | Press **Request evaluation** and watch a validator panel fetch the registry and rule live. It arms a challenge window you can then contest or settle. |

Or create your own: point a new agreement at a public evidence URL, accept
from the payee wallet, request evaluation. Evidence the panel can't match to
the question returns INCONCLUSIVE and moves nothing — try it.

| | |
|---|---|
| Contract | `contract/groundtruth.py` — GenLayer intelligent contract (13 writes, 7 views) |
| Web | `web/` — Next.js App Router · Vercel · wallet auth (EIP-6963 + SIWE) |
| Read-model | Firestore, written only by server routes reconciling from chain |
| Docs | `ARCHITECTURE` (S1–S17 matrix) · `UX` · `SECURITY` · `DEPLOYMENT` · `DEMO` |

## Design decisions (short version)

- **Threshold-native:** every agreement is a judged completion level (0–100,
  5-point buckets) against a release threshold + optional partial floor;
  binary YES/NO is just threshold = 100.
- **Consensus decides meaning, code decides money:** validators agree on
  `verdict`, `completion_bucket`, `evidence_sufficient` (all pinned in
  equivalence); a pure versioned table computes the split. No LLM authors an
  amount.
- **One bonded dispute round** judging the RECORDED dossier plus the
  challenger's new evidence (hashed at filing), then final.
- **Fails safe:** INCONCLUSIVE never settles; early NOT_SATISFIED is
  provisional ("not yet" ≠ "failed"); unreachable evidence is an information
  failure; unresolved disputes have a permissionless terminal escape.

## Development

```bash
# web
cd web && npm install && npm run dev

# contract checks (Phase 5+)
cd contract && genvm-lint check groundtruth.py --json && pytest tests/direct/ -q
```

Environment: copy `web/.env.example` to `web/.env.local` and fill in the
contract address. Firebase and SIWE session variables are optional — the app
runs chain-direct without them.

---

Prototype of evidence-settled escrow on GenLayer StudioNet. Financial
parameters are experimental — not legal or underwriting standards.
