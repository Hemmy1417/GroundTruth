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

Phase 3 (repository scaffold). Architecture and UX are specified and
judge-standard-hardened; the contract lands in Phase 5.

| | |
|---|---|
| Contract | `contract/groundtruth.py` — GenLayer intelligent contract (Phase 5) |
| Web | `web/` — Next.js App Router · Vercel · wallet auth (EIP-6963 + SIWE) |
| Read-model | Firestore, written only by server routes reconciling from chain |
| Docs | `docs/ARCHITECTURE.md` (incl. S1–S17 compliance matrix) · `docs/UX.md` |

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
contract address (after Phase 11 deployment) and Firebase credentials.

---

Prototype of evidence-settled escrow on GenLayer StudioNet. Financial
parameters are experimental — not legal or underwriting standards.
