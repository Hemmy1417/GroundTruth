"""GroundTruth — Phase 10 security probes.

Attacks the economic invariants directly: can escrow or a bond be paid twice,
stranded, or conserved wrongly across the adversarial paths a normal test
wouldn't chain together? Every test asserts the ledger identity
(escrow_held + bonds_held moves only by exactly what left) and that no path
lets value out twice.
"""

import json

from .conftest import (
    addr_hex,
    GEN, AMOUNT, BOND, CHALLENGE_WINDOW, DISPUTE_TERMINAL, KEEPER_BPS,
    T0, DEADLINE, BODY_60, BODY_95,
    mock_clock, mock_sources, mock_judgment, mock_reassessment,
    stats, agreement_view, evaluated,
)

T_EVAL = T0 + 7200


def _ledger(c):
    s = stats(c)
    return int(s["escrow_held_atto"]), int(s["bonds_held_atto"]), int(s["settled_total_atto"])


# ── escrow can never leave twice ─────────────────────────────────────────────

def test_settle_then_every_other_close_path_refused(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """Once settled, NO path (settle again, expire, cancel, negotiate) can
    move escrow a second time — the state guards close every door."""
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_charlie
    c.settle(aid)
    esc, bond, settled = _ledger(c)
    assert esc == 0 and settled == AMOUNT
    for who, fn in [(direct_charlie, "settle"), (direct_alice, "expire_refund"),
                    (direct_alice, "cancel_proposed")]:
        direct_vm.sender = who
        try:
            getattr(c, fn)(aid)
            raised = False
        except Exception:
            raised = True
        assert raised, f"{fn} should have reverted post-settlement"
    assert _ledger(c) == (0, bond, AMOUNT)   # ledger unmoved by the failed calls


def test_negotiated_close_blocks_later_settle(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    direct_vm.sender = direct_bob
    p = json.loads(c.propose_split(aid, 5000))
    direct_vm.sender = direct_alice
    c.accept_proposal(aid, p["proposal_id"])
    assert _ledger(c)[0] == 0                 # escrow gone via negotiation
    mock_clock(direct_vm, T_EVAL + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_bob
    try:
        c.settle(aid); raised = False
    except Exception:
        raised = True
    assert raised


# ── bond can never be paid twice or stranded ─────────────────────────────────

def test_bond_pays_out_exactly_once_across_reassess_then_settle(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, first = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                              direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "The certificate is not on record.", "[]")
    direct_vm.value = 0
    assert _ledger(c)[1] == BOND
    mock_reassessment(direct_vm, verdict="NOT_SATISFIED", bucket=60)   # REVERSED → bond home
    direct_vm.sender = direct_bob
    c.reassess(aid)
    assert _ledger(c)[1] == 0                  # bond left exactly once
    # a second reassess cannot re-pay it
    try:
        c.reassess(aid); raised = False
    except Exception:
        raised = True
    assert raised
    # settle the corrected verdict; escrow conserves, bonds stay zero.
    # The reversal was pre-deadline and therefore provisional, so the clock
    # has to reach the deadline before anything settles.
    mock_clock(direct_vm, DEADLINE + 60)
    direct_vm.sender = direct_alice
    s = json.loads(c.settle(aid))
    assert int(s["payee_atto"]) + int(s["payer_atto"]) + int(s["keeper_atto"]) == AMOUNT
    assert _ledger(c) == (0, 0, AMOUNT)


def test_stale_escape_then_reassess_cannot_double_refund_bond(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "Fight.", "[]")
    direct_vm.value = 0
    mock_clock(direct_vm, T_EVAL + 3600 + DISPUTE_TERMINAL + 1)
    direct_vm.sender = direct_charlie
    c.resolve_stale_dispute(aid)              # bond refunded once
    assert _ledger(c)[1] == 0
    # reassess after terminal must not run and re-pay
    mock_reassessment(direct_vm, verdict="NOT_SATISFIED", bucket=60)
    direct_vm.sender = direct_bob
    try:
        c.reassess(aid); raised = False
    except Exception:
        raised = True
    assert raised
    assert _ledger(c)[1] == 0


# ── the full adversarial arc conserves to the wei ────────────────────────────

def test_worst_case_arc_conserves(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """create → SATISFIED → challenge (bond in) → UPHELD (bond to payee) →
    settle (escrow out). Track the ledger at every hop; nothing appears or
    vanishes."""
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    assert _ledger(c) == (AMOUNT, 0, 0)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "I dispute this.", "[]")
    direct_vm.value = 0
    assert _ledger(c) == (AMOUNT, BOND, 0)
    mock_reassessment(direct_vm, verdict="SATISFIED", bucket=95)   # UPHELD → bond to bob
    direct_vm.sender = direct_bob
    c.reassess(aid)
    assert _ledger(c) == (AMOUNT, 0, 0)       # bond left; escrow untouched
    direct_vm.sender = direct_charlie
    s = json.loads(c.settle(aid))
    keeper = AMOUNT * KEEPER_BPS // 10_000
    assert s["keeper_atto"] == str(keeper)
    assert int(s["payee_atto"]) + int(s["payer_atto"]) + int(s["keeper_atto"]) == AMOUNT
    assert _ledger(c) == (0, 0, AMOUNT)
