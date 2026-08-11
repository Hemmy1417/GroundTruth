"""GroundTruth — core lifecycle suite.

Covers: creation validation, assent/cancel, the timing rule (early SATISFIED
arms, early NOT_SATISFIED is provisional, deadline flips it conclusive),
INCONCLUSIVE/no-evidence safety, cooldown, settle rules + keeper bounty +
wei conservation, expiry, and the negotiation slot (split / extension,
id-checked acceptance).
"""

import json
import pytest

from .conftest import (
    addr_hex,
    GEN, AMOUNT, BOND, COOLDOWN, CHALLENGE_WINDOW, DEADLINE_GRACE, KEEPER_BPS,
    T0, DEADLINE, SRC_PROGRESS, SRC_REGISTRY, SOURCES_JSON,
    BODY_60, BODY_95, BODY_100,
    judgment, mock_clock, mock_sources, mock_judgment, mock_reassessment,
    stats, agreement_view, eval_view, evidence_view,
    deployed, created, accepted, evaluated,
)


# ── creation ─────────────────────────────────────────────────────────────────

def test_create_holds_escrow_and_starts_proposed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    a = agreement_view(c, aid)
    assert a["state"] == "PROPOSED"
    assert a["amount_atto"] == str(AMOUNT)
    assert a["threshold_bps"] == 9000 and a["floor_bps"] == 6000
    assert a["project_tag"] == "Harborview Tower"
    assert stats(c)["escrow_held_atto"] == str(AMOUNT)


@pytest.mark.parametrize("kw,msg", [
    ({"amount": 0}, "escrow value required"),
    ({"threshold": 40}, "threshold"),
    ({"threshold": 9050}, "threshold"),
    ({"floor": 9500}, "floor"),
    ({"deadline": T0 + 60}, "deadline"),
    ({"sources_json": "[]"}, "sources required"),
    ({"sources_json": json.dumps(["javascript:alert(1)"])}, "invalid source url"),
    ({"sources_json": json.dumps([f"https://s{i}.example" for i in range(9)])}, "sources required"),
])
def test_create_rejects_bad_input(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, kw, msg):
    with direct_vm.expect_revert(msg):
        created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, **kw)


def test_create_rejects_self_dealing(direct_vm, direct_deploy, direct_owner, direct_alice):
    c = deployed(direct_vm, direct_deploy, direct_owner)
    direct_vm.sender = direct_alice
    direct_vm.value = AMOUNT
    with direct_vm.expect_revert("payer and payee must differ"):
        c.create_agreement(addr_hex(direct_alice), "T-title", "Q-question ten chars?",
                           "metric-x", 9000, 0, DEADLINE, SOURCES_JSON, "")


# ── assent + cancel ──────────────────────────────────────────────────────────

def test_only_payee_accepts_and_only_payer_cancels(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("payee only"):
        c.accept_agreement(aid)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("payee only"):
        c.accept_agreement(aid)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("payer only"):
        c.cancel_proposed(aid)
    c.accept_agreement(aid)
    assert agreement_view(c, aid)["state"] == "FUNDED"
    # once accepted, cancel path is gone
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only an unaccepted agreement"):
        c.cancel_proposed(aid)


def test_cancel_refunds_fully_no_keeper_cut(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    c.cancel_proposed(aid)
    a = agreement_view(c, aid)
    assert a["state"] == "CANCELLED"
    assert a["settlement"]["rule"] == "CANCELLED_REFUND"
    assert a["settlement"]["payer_atto"] == str(AMOUNT)
    assert a["settlement"]["keeper_atto"] == "0"
    assert stats(c)["escrow_held_atto"] == "0"


def test_unaccepted_agreement_cannot_evaluate(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_sources(direct_vm)
    mock_judgment(direct_vm)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not evaluable"):
        c.evaluate(aid)


# ── the timing rule (S1) ─────────────────────────────────────────────────────

def test_early_satisfied_arms_the_challenge_window(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    assert out["verdict"] == "SATISFIED" and out["provisional"] is False
    a = agreement_view(c, aid)
    assert a["state"] == "ARMED"
    assert a["dispute"]["state"] == "OPEN"
    assert a["dispute"]["window_ends"] == T0 + 7200 + CHALLENGE_WINDOW


def test_early_not_satisfied_is_provisional_and_moves_nothing(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, body=BODY_60,
                            verdict="NOT_SATISFIED", bucket=60)
    assert out["provisional"] is True
    a = agreement_view(c, aid)
    assert a["state"] == "FUNDED"           # nothing armed, nothing settles
    assert a["dispute"]["state"] == "NONE"
    ev = eval_view(c, out["evaluation_id"])
    assert ev["provisional"] is True


def test_not_satisfied_after_deadline_is_conclusive(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    late = DEADLINE + 3600
    mock_clock(direct_vm, late)
    mock_sources(direct_vm, BODY_60)
    mock_judgment(direct_vm, verdict="NOT_SATISFIED", bucket=60)
    direct_vm.sender = direct_alice
    out = json.loads(c.evaluate(aid))
    assert out["provisional"] is False
    assert agreement_view(c, aid)["state"] == "ARMED"


def test_inconclusive_moves_nothing_and_is_retryable(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="INCONCLUSIVE", bucket=0,
                            sufficient=False)
    a = agreement_view(c, aid)
    assert a["state"] == "FUNDED"
    # cooldown elapses → retry works
    mock_clock(direct_vm, T0 + 7200 + COOLDOWN + 10)
    mock_sources(direct_vm, BODY_95)
    mock_judgment(direct_vm, verdict="SATISFIED", bucket=95)
    direct_vm.sender = direct_alice
    out2 = json.loads(c.evaluate(aid))
    assert out2["verdict"] == "SATISFIED"
    assert agreement_view(c, aid)["state"] == "ARMED"


def test_all_sources_dark_records_inconclusive_not_a_finding(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, T0 + 7200)   # clock mocked; source mocks absent → dark
    mock_judgment(direct_vm)
    direct_vm.sender = direct_alice
    out = json.loads(c.evaluate(aid))
    assert out["verdict"] == "INCONCLUSIVE"
    a = agreement_view(c, aid)
    assert a["state"] == "FUNDED"
    ev = eval_view(c, out["evaluation_id"])
    rows = [evidence_view(c, i) for i in ev["evidence_ids"]]
    assert all(r["status"] == "UNREACHABLE" for r in rows)
    assert all(r["sha256"] == "" for r in rows)


def test_cooldown_gates_reevaluation(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, body=BODY_60,
                          verdict="NOT_SATISFIED", bucket=60)
    mock_clock(direct_vm, T0 + 7200 + 60)   # only a minute later
    mock_sources(direct_vm, BODY_60)
    mock_judgment(direct_vm, verdict="NOT_SATISFIED", bucket=60)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("cooldown"):
        c.evaluate(aid)


# ── settle (the deterministic ending) ────────────────────────────────────────

def test_settle_full_release_pays_keeper_and_conserves(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    # strictly after the window (S15)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("window still open"):
        c.settle(aid)
    mock_clock(direct_vm, T0 + 7200 + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_charlie   # any keeper may close it
    s = json.loads(c.settle(aid))
    keeper = AMOUNT * KEEPER_BPS // 10_000
    assert s["rule"] == "FULL_RELEASE"
    assert s["keeper_atto"] == str(keeper)
    assert s["payee_atto"] == str(AMOUNT - keeper)
    a = agreement_view(c, aid)
    assert a["state"] == "SETTLED"
    assert int(s["payee_atto"]) + int(s["payer_atto"]) + int(s["keeper_atto"]) == AMOUNT
    assert stats(c)["escrow_held_atto"] == "0"
    assert stats(c)["settled_total_atto"] == str(AMOUNT)


def test_settle_pro_rata_at_deadline_miss_above_floor(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    late = DEADLINE + 3600
    mock_clock(direct_vm, late)
    mock_sources(direct_vm, BODY_60)
    mock_judgment(direct_vm, verdict="NOT_SATISFIED", bucket=60)
    direct_vm.sender = direct_alice
    c.evaluate(aid)
    mock_clock(direct_vm, late + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_alice
    s = json.loads(c.settle(aid))
    keeper = AMOUNT * KEEPER_BPS // 10_000
    pool = AMOUNT - keeper
    assert s["rule"] == "PRO_RATA"
    assert s["payee_atto"] == str(pool * 6000 // 10_000)
    assert int(s["payee_atto"]) + int(s["payer_atto"]) + int(s["keeper_atto"]) == AMOUNT


def test_settle_refund_below_floor(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    late = DEADLINE + 3600
    mock_clock(direct_vm, late)
    mock_sources(direct_vm, BODY_60)
    mock_judgment(direct_vm, verdict="NOT_SATISFIED", bucket=40)
    direct_vm.sender = direct_alice
    c.evaluate(aid)
    mock_clock(direct_vm, late + CHALLENGE_WINDOW + 1)
    direct_vm.sender = direct_bob
    s = json.loads(c.settle(aid))
    assert s["rule"] == "REFUND"
    assert s["payee_atto"] == "0"


def test_settle_refuses_on_provisional_or_inconclusive(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, body=BODY_60,
                          verdict="NOT_SATISFIED", bucket=60)   # provisional
    mock_clock(direct_vm, T0 + 7200 + CHALLENGE_WINDOW + 10)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("nothing to settle"):
        c.settle(aid)


# ── expiry (S17-adjacent: escrow is never trapped) ───────────────────────────

def test_expire_refund_after_deadline_grace(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, DEADLINE + 100)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("grace still running"):
        c.expire_refund(aid)
    mock_clock(direct_vm, DEADLINE + DEADLINE_GRACE + 1)
    s = json.loads(c.expire_refund(aid))
    assert s["state"] == "EXPIRED"
    a = agreement_view(c, aid)
    assert a["settlement"]["rule"] == "EXPIRED_REFUND"
    keeper = AMOUNT * KEEPER_BPS // 10_000
    assert a["settlement"]["payer_atto"] == str(AMOUNT - keeper)
    assert a["settlement"]["keeper_atto"] == str(keeper)
    assert stats(c)["escrow_held_atto"] == "0"


def test_expire_refuses_when_armed(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, _ = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                          direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, DEADLINE + DEADLINE_GRACE + 1)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only an active un-armed"):
        c.expire_refund(aid)


# ── negotiation ──────────────────────────────────────────────────────────────

def test_split_proposal_counterparty_accepts_and_settles(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob                       # payee proposes 70/30
    p = json.loads(c.propose_split(aid, 7000))
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("counterparty must accept"):
        c.accept_proposal(aid, p["proposal_id"])
    direct_vm.sender = direct_alice
    s = json.loads(c.accept_proposal(aid, p["proposal_id"]))
    assert s["accepted"] == "SPLIT"
    assert s["payee_atto"] == str(AMOUNT * 7000 // 10_000)
    a = agreement_view(c, aid)
    assert a["state"] == "SETTLED"
    assert a["settlement"]["rule"] == "NEGOTIATED"
    assert a["settlement"]["keeper_atto"] == "0"        # self-serve close
    assert stats(c)["escrow_held_atto"] == "0"


def test_replaced_proposal_cannot_be_accepted_by_stale_id(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    p1 = json.loads(c.propose_split(aid, 9000))
    direct_vm.sender = direct_bob
    json.loads(c.propose_split(aid, 1000))              # bait-and-switch attempt
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("proposal id mismatch"):
        c.accept_proposal(aid, p1["proposal_id"])


def test_extension_moves_deadline_both_consent_only(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, direct_charlie):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("parties only"):
        c.propose_extension(aid, DEADLINE + 86400)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("must be later"):
        c.propose_extension(aid, DEADLINE - 1)
    p = json.loads(c.propose_extension(aid, DEADLINE + 14 * 86400))
    direct_vm.sender = direct_alice
    out = json.loads(c.accept_proposal(aid, p["proposal_id"]))
    assert out["deadline"] == DEADLINE + 14 * 86400
    assert agreement_view(c, aid)["deadline"] == DEADLINE + 14 * 86400


def test_withdraw_proposal_is_proposer_only(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    c.propose_split(aid, 5000)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only the proposer"):
        c.withdraw_proposal(aid)
    direct_vm.sender = direct_bob
    c.withdraw_proposal(aid)
    assert agreement_view(c, aid)["proposal"]["kind"] == "NONE"


# ── views ────────────────────────────────────────────────────────────────────

def test_views_shapes_and_party_index(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    cfg = json.loads(c.get_config())
    assert cfg["keeper_bounty_bps"] == KEEPER_BPS
    assert cfg["challenge_bond_atto"] == str(BOND)
    lst = json.loads(c.list_agreements(0, 10))
    assert lst["total"] == 1 and lst["agreements"][0]["id"] == aid
    mine = json.loads(c.get_agreements_for(addr_hex(direct_alice), 0, 10))
    assert mine["agreement_ids"] == [aid]
    theirs = json.loads(c.get_agreements_for(addr_hex(direct_bob), 0, 10))
    assert theirs["agreement_ids"] == [aid]
    ev = eval_view(c, out["evaluation_id"])
    assert ev["judgment"]["verdict"] == "SATISFIED"
    assert ev["judgment"]["completion_bucket"] == 95
    rows = [evidence_view(c, i) for i in ev["evidence_ids"]]
    assert {r["url"] for r in rows} == {SRC_PROGRESS, SRC_REGISTRY}
    assert all(len(r["sha256"]) == 64 for r in rows)
