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
contract `0xF638B81E1470faf36997f2370185254eE284A19F` (v0.2.0, GenLayer
StudioNet). 91 direct tests + 30 web tests green, genvm-lint clean, deployed
bytecode byte-matches source. Full lifecycle proven on-chain — both dispute
branches, a negotiated exit, and a mismatched-evidence refusal — tx hashes in
`docs/DEPLOYMENT.md`.

**v0.2.0 answers a review of v0.1** that found two ways the record could lie:
the stored dossier was whatever the round's leader returned rather than
something validators checked, and an "evidence insufficient" finding could
still move money if it was phrased as NOT_SATISFIED. Both are closed, each
fix is pinned by a test that fails when the fix is removed, and
`docs/DEPLOYMENT.md` records what changed and why every address was replaced.

## Live demo — a real dispute is waiting

Reading needs no wallet. The docket at
[/agreements](https://groundtruth-gen.vercel.app/agreements) currently holds:

| # | State | What you can do |
|---|---|---|
| 1 | **DISPUTED** — 1 GEN bond posted | The dispute room shows the conflict as the second panel will read it: the recorded dossier (building registry, certificate **ISSUED**, `sha256:e3165504…`, judged SATISFIED @ 100) against the challenge exhibit (audit office, countersignature **PENDING**, `sha256:c185f2f8…`). Both were fetched by the contract, not uploaded. **Reassess is permissionless** — connect any funded StudioNet wallet, trigger the second panel yourself, and watch the bond route on-chain by the verdict. |
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
  equivalence) **and on the recorded dossier itself** — row count, each
  source URL in order, whether it was readable, and that every digest covers
  its own stored excerpt. A leader cannot agree on the verdict and still
  write a fabricated record. A pure versioned table computes the split; no
  LLM authors an amount.
- **Sufficiency gates every conclusive verdict, in both directions:** a panel
  that reports NOT_SATISFIED while declaring its own evidence insufficient has
  established nothing, so it is recorded as INCONCLUSIVE and settles nothing.
- **One bonded dispute round** judging the RECORDED dossier — every digest
  re-verified before the second panel reads a byte — plus the challenger's new
  evidence (hashed at filing), then final.
- **Fails safe:** INCONCLUSIVE never settles; early NOT_SATISFIED is
  provisional ("not yet" ≠ "failed"); unreachable evidence is an information
  failure; unresolved disputes have a permissionless terminal escape.

## Development

```bash
# web
cd web && npm install && npm run dev

# contract — BOTH gates, in this order; CI runs the same two and the linter
# rejects things the tests never see (a @staticmethod on a contract method
# is an E022, and no test will tell you)
cd contract && genvm-lint check groundtruth.py --json && pytest tests/direct/ -q
```

Environment: copy `web/.env.example` to `web/.env.local` and fill in the
contract address. Firebase and SIWE session variables are optional — the app
runs chain-direct without them.

---

Prototype of evidence-settled escrow on GenLayer StudioNet. Financial
parameters are experimental — not legal or underwriting standards.
