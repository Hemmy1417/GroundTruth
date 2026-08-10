# GroundTruth — UX (Phase 2)

The product is one object (the Agreement) and one lifecycle. The UX job is to
make five things legible in under 30 seconds: what was agreed, what the
evidence says, what the validators concluded, what the money did, and how to
fight it. Every screen serves one of those.

---

## 1. Design identity — "site documents"

Construction / project finance, so the interface reads like **engineering
documentation**: calm paper surfaces, graphite ink, one deliberate accent —
**safety orange** — used only for what demands attention (the threshold
marker, the live challenge window, destructive actions). Distinct from every
sibling build (Sentinel's HP blue, ClaimSense's ticket stock, Gazette's WIRED).

**Tokens (the only vocabulary):**

```
--paper:        #faf9f6   canvas (warm, not clinical)
--sheet:        #ffffff   cards / raised surfaces
--grid:         #ececе7   hairlines, survey-grid lines
--grid-strong:  #d6d4cc
--ink:          #21211d   primary text (warm graphite)
--ink-soft:     #4a4a44
--annotate:     #85847c   captions, technical annotations
--accent:       #e8500a   safety orange — threshold, live windows, alerts
--accent-soft:  #fde8dc
--verify:       #1f6f43   verified/settled green (deep, not neon)
--verify-soft:  #e2f0e8
--hold:         #8c8c85   uncertainty gray (INCONCLUSIVE is never red)
--refund:       #8a4b0a   refund amber-brown (distinct from failure red)
--dispute:      #7a2233   dispute oxblood
--dispute-soft: #f5e3e7
```

**Type:** Archivo (display/headers — engineering-drawing confidence),
Inter (body), IBM Plex Mono (every number, hash, address, timestamp —
tabular). Measurements-first typography: big mono numerals for amounts,
buckets, countdowns.

**Motifs:** a faint survey-grid background on bands (1px `--grid` lines,
32px pitch); section headers styled like drawing title-blocks (eyebrow +
rule); sha256 stamps rendered as specimen labels. Restraint rule: the grid
motif appears on bands only, never behind data tables.

**Surfaces:** cards 12px radius, 1px `--grid` border, no drop shadows
(flat documentation feel); raised only for modals. Buttons 44px, 4px radius,
uppercase mono-tracked labels. Inputs 44px, 4px radius, `--grid-strong`
border → `--ink` on focus.

## 2. Page map

```
/                       Landing — the pitch + live demo agreement teaser
/agreements             The Docket — all agreements (public), mine highlighted
/new                    Milestone Builder — the signature creation wizard
/agreements/[id]        Agreement File — THE page (everything about one agreement)
/settings               Wallet, network, contract, demo control (owner-gated)
```

Five routes. The Agreement File carries the product; no page exists that a
judge doesn't need.

## 3. User journeys

**J1 — Define & fund (payer).** `/new` wizard → review → one wallet signature
(create = fund, single tx) → land on the Agreement File in FUNDED with the
condition rendered as a document.

**J2 — Evaluate (anyone).** Agreement File → REQUEST EVALUATION → tx
lifecycle toast (signing → confirming → validators judging → reconciling) →
verdict card + consensus panel appear; gauge needle moves to the judged
bucket.

**J3 — Early completion (payee happy path).** SATISFIED before deadline →
ARMED with orange countdown → anyone settles after the window → SettlementCard
shows the fired table row + real split with tx hashes.

**J4 — Dispute (the losing party).** ARMED → CHALLENGE (bond + statement +
optional new sources, one payable tx) → DisputeRoom: recorded dossier vs
challenge evidence side by side → RE-EVALUATE → final verdict → settle.

**J5 — Observer/judge (no wallet).** Open any agreement from the Docket —
fully readable without connecting: condition, gauge, evidence hashes,
judgments, consensus, settlement. Transparency is the product; the wallet
gates only actions.

**J6 — Provisional early miss.** NOT_SATISFIED before deadline → gray
PROVISIONAL banner: "not yet satisfied — nothing settles before the
deadline"; gauge shows the would-pay preview bands without moving money.

## 4. The Agreement File (core page anatomy)

```
┌ Title block: name · parties (payer ⇄ payee) · state chip · escrow amount ┐
│ CompletionGauge — the signature component                                │
│ LifecycleRail — FUNDED → EVALUATED → ARMED → … with tx hashes           │
├──────────────────────────────┬───────────────────────────────────────────┤
│ Evidence Registry            │ Latest Judgment + ConsensusPanel          │
│ (per-eval source rows:       │ (verdict, bucket, sufficiency — pinned;   │
│  url · sha256 · fetched_at · │  confidence/reason — ADVISORY badge)      │
│  status · excerpt drawer)    │ SettlementCard or would-pay preview       │
├──────────────────────────────┴───────────────────────────────────────────┤
│ DisputeRoom (when armed/disputed): countdown · bond · dossier vs new     │
│ evidence · statement · re-evaluation outcome                             │
└───────────────────────────────────────────────────────────────────────────┘
```

## 5. Signature components

**CompletionGauge** — the threshold-native idea made visible. A horizontal
0–100 scale with three zones painted under it: refund zone (0→floor,
`--refund` tint), pro-rata zone (floor→threshold, gradient), full-release
zone (threshold→100, `--verify` tint). Markers: floor (△), threshold (▲ in
accent orange). The judged bucket is a bold needle with the mono value; under
it, the deterministic payout readout: "AT 60%: payee 1.80 GEN · payer 1.20
GEN refund". Unjudged = needle absent, zones visible (the deal's shape is
legible before any judgment).

**MilestoneBuilder** (`/new`) — a 4-step wizard that performs the product's
thesis: vague event in, structured contract out. Left: the form. Right: a
live **contract preview** rendered as an engineering document that fills in
as you type.
  1. *Condition* — title, the question, metric, deadline (date picker → epoch).
  2. *Money* — amount, payee address, threshold slider + optional partial
     floor slider (the CompletionGauge renders live as you drag — you SEE the
     deal's shape before signing).
  3. *Evidence* — 1–4 source URLs with reachability pre-check (frontend
     convenience only, honestly labeled), a source-nature hint (independent
     registry vs self-published), and the mutual-assent note ("funding
     freezes this list").
  4. *Review & fund* — the assembled document + settlement table + one
     payable signature.

**EvidenceRegistry** — grouped by evaluation round. Each row: status dot ·
url · `sha256:…` specimen stamp · fetched-at · size; expandable drawer shows
the recorded excerpt (exactly what the panel judged) and, for dispute
evidence, a FILED-ON-CHALLENGE tag. The registry never shows content it
cannot hash-bind.

**ConsensusPanel** — adapted from the portfolio's honesty pattern: "agreed
under consensus" list (verdict / bucket / sufficiency), each rendered as a
pinned row; advisory fields (confidence, reason) visually separated under an
ADVISORY — OUTSIDE CONSENSUS badge; a footnote states validator counts are
protocol-internal and never fabricated.

**DisputeRoom** — two-column confrontation: left, the RECORDED dossier
(digest-verified excerpts, hash stamps); right, the challenge (statement
rendered as a filed exhibit, new sources hashed at filing, bond amount).
Between them, the re-evaluation verdict when it lands. Firestore realtime
keeps this page live while transactions confirm — every fact still carries
its chain tx.

**LifecycleRail** — horizontal state rail with wall-clock stamps and tx
links; provisional verdicts appear as hollow nodes (recorded, not binding).

**SettlementCard** — the deterministic ending: the settlement-table row that
fired (highlighted), the split in mono, both transfer txs, and the policy
version. "Consensus judged 95%. This table did the rest."

**TxLifecycle toast** — the portfolio-standard honest write path: signing →
submitted → validators judging (this is the slow, honest step — narrated,
~60–120s) → accepted → reconciling (poll until the view reflects it) → done.
Never claims success before the state change is readable.

## 6. States (all designed, none improvised)

- **Loading:** skeletons shaped like the real components (gauge skeleton =
  gray zones, no needle). Never spinners on data.
- **Empty docket:** "No agreements yet" + NEW AGREEMENT CTA + the demo
  agreement pinned as an example.
- **INCONCLUSIVE:** `--hold` gray, never red. "The panel could not establish
  the completion level from the evidence. Nothing changed. Retry after
  cooldown."
- **PROVISIONAL (early NOT_SATISFIED):** gray banner + would-pay preview;
  explicitly "nothing settles before the deadline".
- **Challenge window live:** accent-orange countdown chip on the File and the
  Docket row.
- **Clock down:** amber banner "consensus clock unavailable — windows fail
  closed; nothing can settle or forfeit until it returns" (honest S13
  surface).
- **EXPIRED / stale-dispute escape:** terminal cards naming the exact rule
  that fired and where the money went.
- **Wallet-less:** every read renders; every action button becomes
  CONNECT TO ACT.

## 7. Navigation & shell

Top bar: wordmark (GROUNDTRUTH in Archivo with an orange baseline rule under
"TRUTH") · Docket · New Agreement · Settings · network chip (STUDIONET) ·
wallet chip. No sidebar — the product is two lists and a file. Footer:
prototype disclaimer (S12: "prototype of evidence-settled escrow on GenLayer
StudioNet; parameters are experimental").

## 8. Accessibility & feel

Focus-visible outlines everywhere; all state color pairs meet 4.5:1 on their
surfaces; countdowns update at 30s cadence (no per-second churn); reduced-
motion respects `prefers-reduced-motion` (gauge needle jumps instead of
animating). Number-dense rows use tabular mono so columns align.
```
