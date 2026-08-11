"""GroundTruth — dispute suite: the bonded challenge round, the recorded
dossier, bond economics, the S15 boundary, and the S17 terminal escape.
"""

import json
import pytest

from .conftest import (
    addr_hex,
    GEN, AMOUNT, BOND, CHALLENGE_WINDOW, DISPUTE_TERMINAL, KEEPER_BPS,
    T0, DEADLINE, BODY_60, BODY_95,
    mock_clock, mock_sources, mock_judgment, mock_reassessment,
    stats, agreement_view, eval_view, evidence_view,
    accepted, evaluated,
)

SRC_AUDIT = "https://audit.gt-example.com/note"
T_EVAL = T0 + 7200


def armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """SATISFIED@95 armed at T_EVAL — the payer will want to fight it."""
    return evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                     direct_bob, verdict="SATISFIED", bucket=95)


def file_challenge(c, vm, who, aid, epoch=T_EVAL + 3600,
                   statement="The inspection note was preliminary; certification is not on record.",
                   sources=None, audit_body="AUDIT: certificate PENDING; milestone not satisfied."):
    mock_clock(vm, epoch)
    if sources is None:
        sources = [SRC_AUDIT]
    if sources:
        vm.mock_web(r".*audit\.gt-example\.com.*", {"status": 200, "body": audit_body})
    vm.sender = who
    vm.value = BOND
    out = json.loads(c.challenge(aid, statement, json.dumps(sources)))
    vm.value = 0
    return out


# ── filing ───────────────────────────────────────────────────────────────────

def test_challenge_files_with_bond_and_snapshots_evidence(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    out = file_challenge(c, direct_vm, direct_alice, aid)
    assert out["state"] == "DISPUTED"
    assert out["challenge_evidence"] == 1
    a = agreement_view(c, aid)
    assert a["dispute"]["state"] == "FILED"
    assert a["dispute"]["challenger"] == addr_hex(direct_alice)
    assert a["dispute"]["bond_atto"] == str(BOND)
    assert a["dispute"]["terminal_at"] == T_EVAL + 3600 + DISPUTE_TERMINAL
    assert stats(c)["bonds_held_atto"] == str(BOND)
    # the exhibit was snapshotted at filing — hash bound
    ev_ids = [i for i in range(1, int(stats(c)["evidence"]) + 1)
              if evidence_view(c, i)["kind"] == "CHALLENGE"]
    assert len(ev_ids) == 1
    ex = evidence_view(c, ev_ids[0])
    assert ex["url"] == SRC_AUDIT and len(ex["sha256"]) == 64


def test_challenge_gates(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, T_EVAL + 3600)
    # stranger
    direct_vm.sender = direct_charlie
    direct_vm.value = BOND
    with direct_vm.expect_revert("parties only"):
        c.challenge(aid, "I object", "[]")
    # wrong bond
    direct_vm.sender = direct_alice
    direct_vm.value = BOND // 2
    with direct_vm.expect_revert("bond must be exactly"):
        c.challenge(aid, "I object", "[]")
    # empty statement
    direct_vm.value = BOND
    with direct_vm.expect_revert("statement required"):
        c.challenge(aid, "   ", "[]")
    direct_vm.value = 0


def test_challenge_strictly_inside_window_settle_strictly_after(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """S15: the same clock comparison, negated — no instant where both work."""
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    edge = T_EVAL + CHALLENGE_WINDOW
    # at the edge: challenge is CLOSED
    mock_clock(direct_vm, edge)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    with direct_vm.expect_revert("window closed"):
        c.challenge(aid, "too late", "[]")
    direct_vm.value = 0
    # and settle is OPEN at the same instant
    s = json.loads(c.settle(aid))
    assert s["rule"] == "FULL_RELEASE"


# ── reassessment outcomes ────────────────────────────────────────────────────

def test_reversed_refunds_bond_and_corrected_verdict_settles(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, first = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid)
    mock_reassessment(direct_vm, verdict="NOT_SATISFIED", bucket=60)
    direct_vm.sender = direct_bob
    out = json.loads(c.reassess(aid))
    assert out["outcome"] == "REVERSED"
    a = agreement_view(c, aid)
    assert a["dispute"]["state"] == "RESOLVED"
    assert a["latest_eval_id"] == out["reassessment_eval_id"]   # corrected verdict rules
    assert stats(c)["bonds_held_atto"] == "0"                   # bond went home
    # settle now runs on the corrected NOT_SATISFIED@60 → PRO_RATA
    direct_vm.sender = direct_alice
    s = json.loads(c.settle(aid))
    assert s["rule"] == "PRO_RATA"
    keeper = AMOUNT * KEEPER_BPS // 10_000
    assert int(s["payee_atto"]) == (AMOUNT - keeper) * 6000 // 10_000
    assert int(s["payee_atto"]) + int(s["payer_atto"]) + int(s["keeper_atto"]) == AMOUNT


def test_upheld_forfeits_bond_to_counterparty(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, first = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid)
    mock_reassessment(direct_vm, verdict="SATISFIED", bucket=95)   # unchanged
    direct_vm.sender = direct_alice
    out = json.loads(c.reassess(aid))
    assert out["outcome"] == "UPHELD"
    a = agreement_view(c, aid)
    assert a["latest_eval_id"] == first["evaluation_id"]   # original verdict stands
    assert stats(c)["bonds_held_atto"] == "0"              # forfeited to counterparty (sent)
    direct_vm.sender = direct_bob
    s = json.loads(c.settle(aid))
    assert s["rule"] == "FULL_RELEASE"


def test_inconclusive_reassessment_original_stands_bond_refunded(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Uncertainty never punishes (S5): the second panel failing to decide
    does not forfeit the challenger's bond, and the original verdict rules."""
    c, aid, first = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid)
    mock_reassessment(direct_vm, verdict="INCONCLUSIVE", bucket=0, sufficient=False)
    direct_vm.sender = direct_bob
    out = json.loads(c.reassess(aid))
    assert out["outcome"] == "INCONCLUSIVE_ORIGINAL_STANDS"
    a = agreement_view(c, aid)
    assert a["latest_eval_id"] == first["evaluation_id"]
    assert stats(c)["bonds_held_atto"] == "0"
    direct_vm.sender = direct_alice
    s = json.loads(c.settle(aid))
    assert s["rule"] == "FULL_RELEASE"


def test_second_panel_reads_the_recorded_dossier(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """S14: the reassessment prompt embeds the RECORDED excerpts + the filed
    exhibit + the statement. The mock only matches when all three markers are
    present — if the dossier assembly ever breaks, no mock matches and the
    round fails instead of silently judging thin air."""
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid,
                   audit_body="AUDIT NOTE: certification is PENDING.")
    direct_vm.mock_llm(
        r"(?s)(?=.*RECORDED DOSSIER)(?=.*structural completion assessed at 95)"
        r"(?=.*AUDIT NOTE: certification is PENDING)(?=.*preliminary).*",
        json.dumps({"verdict": "NOT_SATISFIED", "completion_bucket": 60,
                    "evidence_sufficient": True, "confidence": "HIGH",
                    "reason": "certificate pending"}),
    )
    direct_vm.sender = direct_bob
    out = json.loads(c.reassess(aid))
    assert out["outcome"] == "REVERSED"


def test_reassess_and_stale_gates(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no dispute filed"):
        c.reassess(aid)
    file_challenge(c, direct_vm, direct_alice, aid)
    # double challenge
    mock_clock(direct_vm, T_EVAL + 7200)
    direct_vm.sender = direct_bob
    direct_vm.value = BOND
    with direct_vm.expect_revert("no open challenge window"):
        c.challenge(aid, "me too", "[]")
    direct_vm.value = 0
    # stale escape too early
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("terminal window still open"):
        c.resolve_stale_dispute(aid)


def test_stale_dispute_terminal_escape(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    """S17: reassessment never ran — after the terminal window ANY caller
    ends it; original verdict stands; bond refunded."""
    c, aid, first = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid)
    mock_clock(direct_vm, T_EVAL + 3600 + DISPUTE_TERMINAL + 1)
    direct_vm.sender = direct_charlie          # a stranger may free the funds
    out = json.loads(c.resolve_stale_dispute(aid))
    assert out["dispute"] == "TERMINAL"
    assert stats(c)["bonds_held_atto"] == "0"
    a = agreement_view(c, aid)
    assert a["latest_eval_id"] == first["evaluation_id"]
    direct_vm.sender = direct_bob
    s = json.loads(c.settle(aid))
    assert s["rule"] == "FULL_RELEASE"
    # nothing left behind
    assert stats(c)["escrow_held_atto"] == "0"


def test_negotiated_split_during_dispute_refunds_bond(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Settling out of court mid-dispute sends the bond home — nobody is
    punished for a fight both sides chose to end."""
    c, aid, _ = armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    file_challenge(c, direct_vm, direct_alice, aid)
    direct_vm.sender = direct_alice
    p = json.loads(c.propose_split(aid, 5000))
    direct_vm.sender = direct_bob
    s = json.loads(c.accept_proposal(aid, p["proposal_id"]))
    assert s["accepted"] == "SPLIT"
    a = agreement_view(c, aid)
    assert a["state"] == "SETTLED"
    assert a["settlement"]["rule"] == "NEGOTIATED"
    assert a["dispute"]["state"] == "TERMINAL"
    assert stats(c)["bonds_held_atto"] == "0"
    assert stats(c)["escrow_held_atto"] == "0"
