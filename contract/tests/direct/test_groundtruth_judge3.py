"""Focused coverage for the third judge letter:

    "the stored dispute dossier is still leader-authored rather than
     consensus-bound, and an evidence-insufficient NOT_SATISFIED result can
     still move funds. Please bind recorded evidence to validator checks,
     force insufficient judgments to remain inconclusive, and add focused
     tests for those paths."

Two money paths that had no test at all:

  SUFFICIENCY — evidence_sufficient gated only SATISFIED, so a panel could
  report NOT_SATISFIED while declaring the evidence insufficient, arm, and
  settle: pro-rata paying a payee on a level the evidence cannot establish,
  an upheld dispute forfeiting the challenger's bond over an admittedly
  unfounded finding, and a reassessment refunding before the deadline.

  DOSSIER — the judgment was consensus-checked but the evidence rows stored
  beside it were whatever the leader returned, so a dishonest leader could
  agree on the verdict and still write a fabricated URL, digest and excerpt
  into the record a dispute panel later reads.

The dossier tests drive the contract's real validator closures with
`direct_vm.run_validator`, which the rest of the suite never used — the old
conftest docstring wrongly claimed direct mode could not reach them.
"""

import hashlib
import json
import pytest

from .conftest import (
    GEN, AMOUNT, BOND, KEEPER_BPS, T0, DEADLINE, BODY_95,
    SRC_PROGRESS, SRC_REGISTRY,
    judgment, mock_clock, mock_sources, mock_judgment, mock_reassessment,
    stats, agreement_view, eval_view, evidence_view,
    accepted, evaluated,
)

T_EVAL = T0 + 7200


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


# ── sufficiency: an unsupported finding must never move money ────────────────

def test_insufficient_not_satisfied_is_forced_inconclusive(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """THE fund-safety bug. A panel that reports NOT_SATISFIED while calling
    its own evidence insufficient has established nothing — that is
    INCONCLUSIVE, and INCONCLUSIVE never settles."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="NOT_SATISFIED", bucket=40,
                            sufficient=False)
    assert out["verdict"] == "INCONCLUSIVE"
    ev = eval_view(c, out["evaluation_id"])
    assert ev["judgment"]["verdict"] == "INCONCLUSIVE"
    assert ev["judgment"]["completion_bucket"] == 0          # nothing was established
    # it did not arm, so there is nothing to settle
    a = agreement_view(c, aid)
    assert a["state"] == "FUNDED"
    assert a["dispute"]["state"] != "OPEN" or int(a["dispute"]["window_ends"]) == 0
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        c.settle(aid)
    assert stats(c)["escrow_held_atto"] == str(AMOUNT)   # every wei still held


def test_insufficient_not_satisfied_cannot_pro_rata_the_payee(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """The misdirected-value case the letter points at: with a pro-rata floor
    configured, an unsupported NOT_SATISFIED used to pay the PAYEE a fraction
    of the escrow on a completion level the evidence could not support."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="NOT_SATISFIED", bucket=60,
                            sufficient=False)
    assert out["verdict"] == "INCONCLUSIVE"
    mock_clock(direct_vm, DEADLINE + 60)         # even past the deadline
    direct_vm.sender = direct_bob
    # the coerced INCONCLUSIVE never armed, so settle is refused at the state
    # gate — the escrow is simply never reachable on an unsupported finding
    with pytest.raises(Exception, match="nothing to settle"):
        c.settle(aid)
    st = stats(c)
    assert st["escrow_held_atto"] == str(AMOUNT)
    assert st["settled_total_atto"] == "0"


def test_insufficient_reassessment_cannot_reverse_or_punish(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """The same gate on the second panel: an unsupported reassessment leaves
    the original verdict standing and returns the bond — uncertainty must
    never forfeit the challenger's stake."""
    c, aid, first = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                              direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "The certificate is not on record.", "[]")
    direct_vm.value = 0
    mock_reassessment(direct_vm, verdict="NOT_SATISFIED", bucket=40, sufficient=False)
    direct_vm.sender = direct_bob
    out = json.loads(c.reassess(aid))
    # coerced to INCONCLUSIVE -> original stands, bond home to the challenger
    assert out["outcome"] == "INCONCLUSIVE_ORIGINAL_STANDS"
    a = agreement_view(c, aid)
    assert a["latest_eval_id"] == first["evaluation_id"]   # original still rules
    assert stats(c)["bonds_held_atto"] == "0"


def test_satisfied_without_sufficient_evidence_still_reverts(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """The positive verdict keeps its harder treatment: claiming satisfaction
    on insufficient evidence is a self-contradiction, i.e. model error, and
    reverts retryably rather than being quietly downgraded."""
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, T_EVAL)
    mock_sources(direct_vm, BODY_95)
    mock_judgment(direct_vm, verdict="SATISFIED", bucket=95, sufficient=False)
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        c.evaluate(aid)
    assert agreement_view(c, aid)["state"] == "FUNDED"


def test_settle_refuses_an_insufficient_record_written_by_an_older_policy(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Defense in depth at the money boundary. Validation now coerces, so no
    live path can produce a conclusive-but-insufficient record — which is
    exactly why this guard needs its own test: unreachable code is deleted
    code. A record shaped like the pre-fix contract must still not settle."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    # simulate a record written before sufficiency gated every verdict
    c.evaluations[out["evaluation_id"]].sufficient = False
    mock_clock(direct_vm, T_EVAL + 72 * 3600 + 60)      # past the challenge window
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="insufficient"):
        c.settle(aid)
    assert stats(c)["escrow_held_atto"] == str(AMOUNT)


# ── dossier: the record itself is consensus-bound ────────────────────────────

def _leader_payload(c, direct_vm):
    """Run one evaluation round and return the leader's captured output so a
    test can tamper with it and re-run the real validator."""
    return direct_vm.captured_leader_result if hasattr(
        direct_vm, "captured_leader_result") else None


def test_validator_accepts_an_honest_dossier(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Control. If this fails, every rejection test below is vacuous."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    ev = eval_view(c, out["evaluation_id"])
    rows = [evidence_view(c, eid) for eid in ev["evidence_ids"]]
    honest = {
        "gate": "JUDGED",
        "evidence": [
            {"url": r["url"], "status": r["status"], "sha256": r["sha256"],
             "size": r["size"], "excerpt": r["excerpt"], "fetched_at": r["fetched_at"]}
            for r in rows
        ],
        "judgment": json.loads(judgment(verdict="SATISFIED", bucket=95)),
    }
    assert direct_vm.run_validator(leader_result=honest) is True


@pytest.mark.parametrize("mutate,why", [
    (lambda ev: [dict(ev[0], url="https://attacker.example/forged")] + ev[1:],
     "a source no validator fetched"),
    (lambda ev: ev[:-1],
     "a row silently dropped from the record"),
    (lambda ev: ev + [dict(ev[0], url="https://attacker.example/extra")],
     "a row invented and appended"),
    (lambda ev: [dict(ev[0], excerpt="TOTALLY FABRICATED DOSSIER TEXT")] + ev[1:],
     "an excerpt its own digest does not cover"),
    (lambda ev: [dict(ev[0], sha256="0" * 64)] + ev[1:],
     "a digest that covers nothing"),
    (lambda ev: list(reversed(ev)),
     "rows reordered so a URL wears another's record"),
])
def test_validator_rejects_a_forged_dossier(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, mutate, why):
    """Each mutation is something an honest validator can independently
    disprove by re-fetching. Before this fix every one of them passed, because
    the validator compared only the verdict."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    ev = eval_view(c, out["evaluation_id"])
    rows = [evidence_view(c, eid) for eid in ev["evidence_ids"]]
    base = [
        {"url": r["url"], "status": r["status"], "sha256": r["sha256"],
         "size": r["size"], "excerpt": r["excerpt"], "fetched_at": r["fetched_at"]}
        for r in rows
    ]
    forged = {
        "gate": "JUDGED",
        "evidence": mutate(base),
        "judgment": json.loads(judgment(verdict="SATISFIED", bucket=95)),
    }
    assert direct_vm.run_validator(leader_result=forged) is False, why


def test_validator_rejects_a_forged_challenge_snapshot(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """Challenge exhibits become the record the second panel judges, so the
    snapshot round is bound the same way."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    mock_sources(direct_vm, "Audit note: certificate pending.")
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "Certificate is pending.",
                json.dumps(["https://audit.gt-example.com/note"]))
    direct_vm.value = 0
    rows = [evidence_view(c, int(eid)) for eid in c.agreements[aid].d_evidence_ids]
    base = [
        {"url": r["url"], "status": r["status"], "sha256": r["sha256"],
         "size": r["size"], "excerpt": r["excerpt"], "fetched_at": r["fetched_at"]}
        for r in rows
    ]
    assert direct_vm.run_validator(leader_result=base) is True          # control
    forged = [dict(base[0], url="https://attacker.example/exhibit")]
    assert direct_vm.run_validator(leader_result=forged) is False


# ── the digest is re-verifiable, and re-verified ─────────────────────────────

def test_recorded_digest_covers_the_recorded_bytes(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """A digest over bytes that are never stored can never be checked by
    anyone. Every recorded row must hash to its own stored excerpt."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    ev = eval_view(c, out["evaluation_id"])
    for eid in ev["evidence_ids"]:
        r = evidence_view(c, eid)
        if r["status"] == "OK":
            assert r["sha256"] == _sha(r["excerpt"])


def test_reassess_refuses_a_tampered_record(
        direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob):
    """S14 integrity gate: if the stored excerpt no longer matches the digest
    written when it was recorded, the second panel does not read it."""
    c, aid, out = evaluated(direct_vm, direct_deploy, direct_owner, direct_alice,
                            direct_bob, verdict="SATISFIED", bucket=95)
    mock_clock(direct_vm, T_EVAL + 3600)
    direct_vm.sender = direct_alice
    direct_vm.value = BOND
    c.challenge(aid, "The certificate is not on record.", "[]")
    direct_vm.value = 0
    # tamper with the stored record behind the contract's back
    ev = eval_view(c, out["evaluation_id"])
    eid = ev["evidence_ids"][0]
    c.evidence[eid].excerpt = "swapped after the fact"
    mock_reassessment(direct_vm, verdict="NOT_SATISFIED", bucket=40)
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="integrity check"):
        c.reassess(aid)
