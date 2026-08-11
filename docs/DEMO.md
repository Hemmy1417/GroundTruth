# GroundTruth — Demo Runbook

**Flagship: Harborview Tower — Milestone 3.** A payer escrows 3 GEN against
certified structural completion: release at **90%**, pro-rata floor **60%**,
deadline ~30 days out. Three acts walk the whole primitive: provisional
judgment → satisfied-then-challenged → certified settlement.

## Honesty statement (say it out loud in any live demo)

The evidence pages are served by the app itself and addressed by act
(`?act=1|2|3`) — a live demo cannot wait for a real tower to be built.
**Everything else is production machinery**: the contract fetches the pages
itself, sanitizes and hashes the exact bytes, independent validators re-run
the judgment under consensus, disputes re-judge the recorded dossier, and the
deterministic table settles real GEN. There is no demo mode in the contract.

## Cast

| Role | Wallet | Needs |
|---|---|---|
| Payer (project owner) | wallet A | ~4 GEN (3 escrow + 1 challenge bond) |
| Payee (contractor) | wallet B | gas only (StudioNet is gasless) |
| Keeper (anyone) | wallet A or C | nothing — earns the settle bounty |

Two browser profiles (or two browsers) make the two-wallet handoff clean.

## Evidence acts (public URLs, served by the deployed app)

| | progress report | inspection registry |
|---|---|---|
| Act 1 | 60% complete, no inspection requested | NO COMPLETION INSPECTION ON RECORD |
| Act 2 | 95%, engineer's note received | PRELIMINARY NOTE — CERTIFICATE PENDING |
| Act 3 | 100%, final inspection passed | CERTIFIED — FINAL INSPECTION PASSED |

Challenger's exhibit (fixed): `/api/demo/harborview/audit` — the lender's
audit note arguing the Act-2 note is preliminary.

## The script

### Act 1 — “not yet” is not “failed” (~5 min)

1. Wallet A → **/demo** → Act 1 → **Recreate this act** (prefills the
   builder) → step through: set wallet B as payee → **Sign & escrow 3 GEN**.
2. Wallet B → open the agreement → **Accept agreement** (assent freezes the
   sources).
3. Anyone → **Request evaluation** (~1–2 min consensus round; the toast
   narrates honestly).
4. **Show:** verdict NOT_SATISFIED @ 60 with the PROVISIONAL badge; the gauge
   needle at 60 in the pro-rata zone; the would-pay readout (≈1.79 GEN)
   *without* any settlement; hash-stamped evidence rows with the recorded
   excerpts.

> The point: an early miss moves nothing. The system knows the difference
> between "not yet" and "failed".

### Act 2 — satisfied, then fought (~10 min)

5. Wallet A → create the Act-2 agreement (Recreate → act 2; payee B; fund) →
   B accepts → anyone evaluates.
6. **Show:** SATISFIED @ 95 → state CHALLENGE WINDOW with the countdown;
   settle is refused inside the window (S15).
7. Wallet A (the payer disputes) → **Challenge verdict** → statement: *“the
   inspection note is preliminary; certification is not on record”* → add the
   audit-note URL as evidence → sign (1 GEN bond).
8. **Show:** the Dispute Room — recorded dossier (left) vs the snapshotted
   exhibit (right), the statement as a filed exhibit, the terminal-escape
   clock.
9. Anyone → **Run reassessment** (~1–2 min).
10. **Show:** the second panel's ruling. Either outcome is a win for the
    demo: REVERSED (bond home, corrected verdict settles pro-rata) or UPHELD
    (bond to the payee, original stands) — narrate whichever happened; the
    bond math is on screen.
11. Settle → **Show:** the SettlementCard: rule, split, keeper bounty, policy
    version.

> The point: verdicts can be fought, the second panel judges the RECORD, and
> uncertainty never punishes.

### Act 3 — certified, settles for real (~5 min)

12. Create the Act-3 agreement → accept → evaluate → SATISFIED @ 100 →
    (optionally negotiate instead: propose a split and accept it with the
    other wallet to show NEGOTIATED settlement).
13. After the window (or via negotiation) → **Settle** with wallet C →
    **Show:** keeper bounty paid to the caller; escrow zero; docket shows the
    project's milestones grouped under “Harborview Tower”.

> The point: settlement is a deterministic table over an agreed number, and
> agreements close themselves — anyone can be the keeper.

## Demo-friendly deployment parameters

Deploy the demo instance with `eval_cooldown_seconds = 300` (constructor
arg). The challenge window (72h) means Act 2's *settle-after-window* step
can't run live in one sitting — the demo shows settle-refused-inside-window
(the honest S15 gate) and uses Act 3 or negotiation for the actual
settlement moment. A separate short-window test instance (60–90s windows)
can demonstrate the time-gated escapes live, exactly as the contract test
suite proves them deterministically.

## If something breaks live

| Symptom | What it means | Say / do |
|---|---|---|
| Evaluation returns INCONCLUSIVE | validators couldn't agree the evidence establishes a level | "Uncertainty is a designed outcome — nothing moved. Retry after cooldown." |
| Tx toast shows a revert message | a contract gate fired (cooldown, window, bond) | read the message aloud — the gates ARE the product |
| Rate-limit banner / slow reads | StudioNet 30 req/min per IP | the proxy coalesces reads; wait the minute out |
| Consensus UNDETERMINED | validators disagreed | "No single model's answer stands — that's the point. Retry." |

## What Phase 11/12 adds

Deployment records (address, txs) land in DEPLOYMENT.md; the live E2E proof
of each act belongs there too, with hashes a judge can open in the explorer.
