"""GroundTruth — Phase 9 hostile-caller sweep.

Attacks the surfaces the earlier suites don't: negotiation edges, state-
machine cross-paths (wrong-state calls on every method), the provisional ×
expiry interplay, and challenge-evidence failure shapes.
"""

import json
import pytest

from .conftest import (
    addr_hex,
    GEN, AMOUNT, BOND, COOLDOWN, CHALLENGE_WINDOW, DEADLINE_GRACE, KEEPER_BPS,
    T0, DEADLINE, SRC_PROGRESS, SOURCES_JSON, BODY_60, BODY_95,
    judgment, mock_clock, mock_sources, mock_judgment, mock_reassessment,
    stats, agreement_view, eval_view, evidence_view,
    deployed, created, accepted, evaluated,
)

T_EVAL = T0 + 7200


# ── negotiation edges ────────────────────────────────────────────────────────

def test_stranger_cannot_touch_proposals(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    p = json.loads(c.propose_split(aid, 5000))
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("parties only"):
        c.accept_proposal(aid, p["proposal_id"])
    with direct_vm.expect_revert("parties only"):
        c.withdraw_proposal(aid)
    with direct_vm.expect_revert("parties only"):
        c.propose_split(aid, 9999)


def test_split_bps_bounds(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("payee_bps"):
        c.propose_split(aid, 10_001)
    with direct_vm.expect_revert("payee_bps"):
        c.propose_split(aid, -1)


def test_no_negotiation_before_assent_or_after_settlement(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("nothing to negotiate"):
        c.propose_split(aid, 5000)
    # settle via negotiation, then try again
    direct_vm.sender = direct_bob
    c.accept_agreement(aid)
    direct_vm.sender = direct_bob
    p = json.loads(c.propose_split(aid, 5000))
    direct_vm.sender = direct_alice
    c.accept_proposal(aid, p["proposal_id"])
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("nothing to negotiate"):
        c.propose_split(aid, 9000)


def test_accepted_extension_dies_if_state_moved_on(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Propose an extension in FUNDED, let the state advance to ARMED, then
    try to accept the stale extension — the FUNDED guard refuses it."""
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    p = json.loads(c.propose_extension(aid, DEADLINE + 14 * 86400))
    # state moves: a conclusive SATISFIED arms the agreement
    mock_clock(direct_vm, T_EVAL)
    mock_sources(direct_vm, BODY_95)
    mock_judgment(direct_vm, verdict="SATISFIED", bucket=95)
    direct_vm.sender = direct_alice
    c.evaluate(aid)
    with direct_vm.expect_revert("extension no longer applicable"):
        c.accept_proposal(aid, p["proposal_id"])


# ── wrong-state calls on every method ────────────────────────────────────────

def test_wrong_state_calls_all_refuse(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)   # ARMED
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not evaluable"):
        c.evaluate(aid)                       # no evaluate while armed
    with direct_vm.expect_revert("no dispute filed"):
        c.reassess(aid)
    with direct_vm.expect_revert("no dispute pending"):
        c.resolve_stale_dispute(aid)
    with direct_vm.expect_revert("only an unaccepted agreement"):
        c.cancel_proposed(aid)
    with direct_vm.expect_revert("only an active un-armed"):
        c.expire_refund(aid)
    with direct_vm.expect_revert("not awaiting assent"):
        c.accept_agreement(aid)


def test_challenge_needs_an_open_window(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, T_EVAL)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    with direct_vm.expect_revert("no open challenge window"):
        c.challenge(aid, "premature", "[]")   # FUNDED, nothing to challenge
    direct_vm.value = 0


def test_settle_is_single_shot(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_alice
    c.settle(aid)
    with direct_vm.expect_revert("nothing to settle"):
        c.settle(aid)
    assert stats(c)["escrow_held_atto"] == "0"   # exactly once


def test_zero_address_payee_rejected(direct_vm, direct_deploy, direct_owner, direct_alice):
    c = deployed(direct_vm, direct_deploy, direct_owner)
    direct_vm.sender = direct_alice
    direct_vm.value = AMOUNT
    with direct_vm.expect_revert("invalid payee address"):
        c.create_agreement("0x" + "0" * 40, "T-title", "Q-question ten chars?",
                           "metric-x", 9000, 0, DEADLINE, SOURCES_JSON, "")
    direct_vm.value = 0


def test_challenge_source_flood_rejected(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    flood = json.dumps([f"https://s{i}.example" for i in range(9)])
    with direct_vm.expect_revert("at most"):
        c.challenge(aid, "flood attempt", flood)
    direct_vm.value = 0


# ── provisional × expiry interplay ───────────────────────────────────────────

def test_provisional_agreement_expires_cleanly(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """A provisional miss is recorded, the deadline passes with no further
    evaluation — the agreement expires and refunds; the provisional verdict
    never became money."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, body=BODY_60,
                            verdict="NOT_SATISFIED", bucket=60)
    assert out["provisional"] is True
    mock_clock(direct_vm, DEADLINE + DEADLINE_GRACE + 1)
    direct_vm.sender = direct_charlie
    s = json.loads(c.expire_refund(aid))
    assert s["state"] == "EXPIRED"
    a = agreement_view(c, aid)
    keeper = AMOUNT * KEEPER_BPS // 10_000
    assert a["settlement"]["payer_atto"] == str(AMOUNT - keeper)
    assert stats(c)["escrow_held_atto"] == "0"


# ── challenge-evidence failure shapes ────────────────────────────────────────

def test_unreachable_challenge_exhibit_recorded_not_fatal(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """A challenger citing a dead URL still files: the exhibit is recorded
    UNREACHABLE (an information failure), the statement still carries the
    argument, and the reassessment proceeds on the recorded dossier."""
    c, aid, first = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                              direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    mock_sources(direct_vm, BODY_95)   # registered sources still answer
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    out = json.loads(c.challenge(aid, "The note was preliminary.",
                                 json.dumps(["https://dead.example.com/note"])))
    direct_vm.value = 0
    assert out["challenge_evidence"] == 1
    ex_ids = [i for i in range(1, int(stats(c)["evidence"]) + 1)
              if evidence_view(c, i)["kind"] == "CHALLENGE"]
    assert evidence_view(c, ex_ids[0])["status"] == "UNREACHABLE"
    assert evidence_view(c, ex_ids[0])["sha256"] == ""
    mock_reassessment(direct_vm, verdict="SATISFIED", bucket=95)
    direct_vm.sender = direct_bob
    r = json.loads(c.reassess(aid))
    assert r["outcome"] == "UPHELD"


def test_reassessment_incoherence_reverts_dispute_stays_open(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """S16 applies to the SECOND panel too: an incoherent reassessment
    reverts, the dispute stays FILED (retryable), the bond stays held —
    and the terminal escape still exists as the way out."""
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "Fight.", "[]")
    direct_vm.value = 0
    mock_reassessment(direct_vm, verdict="SATISFIED", bucket=95, sufficient=False)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("LLM"):
        c.reassess(aid)
    a = agreement_view(c, aid)
    assert a["dispute"]["state"] == "FILED"          # retryable, not stuck
    assert stats(c)["bonds_held_atto"] == str(BOND)  # bond safe
