"""Shared machinery for GroundTruth direct tests.

Direct mode runs the LEADER function by default, but it CAN drive the
contract's real validator closures: `direct_vm.run_validator(leader_result=…)`
replays a captured validator against any payload, which is how the dossier
tests prove a forged evidence array is rejected. This file used to claim
validator equivalence was "integration territory" — that was wrong, and the
belief is what left the leader-authored-dossier path untested.

What direct mode proves: every deterministic rule, every state transition,
every authorization gate, every window, the exact way agreed judgments map to
money, and — via run_validator — what validators will and will not accept.

Mocks ACCUMULATE — re-registering a pattern does not replace the earlier
answer. Clear first (mock_clock does), then re-register source mocks.
"""

import json


CONTRACT = "groundtruth.py"
GEN = 10 ** 18
AMOUNT = 3 * GEN
BOND = 1 * GEN
COOLDOWN = 3600
CHALLENGE_WINDOW = 72 * 3600
DISPUTE_TERMINAL = 7 * 86400
DEADLINE_GRACE = 72 * 3600
KEEPER_BPS = 50

T0 = 1_786_000_000                  # ~2026-08; sane epoch for every window
DEADLINE = T0 + 30 * 86400          # a month out

SRC_PROGRESS = "https://progress.gt-example.com/harborview"
SRC_REGISTRY = "https://registry.gt-example.com/harborview"
SOURCES_JSON = json.dumps([SRC_PROGRESS, SRC_REGISTRY])

BODY_60 = "Progress report: structural completion assessed at 60 percent."
BODY_95 = "Progress report: structural completion assessed at 95 percent; inspection note received."
BODY_100 = "Registry: CERTIFIED — final structural inspection passed."


def addr_hex(a) -> str:
    """Fixture addresses are raw 20 bytes in this harness; the contract API
    (like the frontend) speaks 0x-hex strings."""
    if isinstance(a, (bytes, bytearray)):
        return "0x" + a.hex()
    return str(a).lower()


def judgment(verdict="SATISFIED", bucket=95, sufficient=True,
             confidence="HIGH", reason="Finding recorded."):
    return json.dumps({
        "verdict": verdict,
        "completion_bucket": bucket,
        "evidence_sufficient": sufficient,
        "confidence": confidence,
        "reason": reason,
    })


def mock_clock(vm, epoch: int, chain_lag: int = 1250):
    """Usable wall clock; chain floor trails by MORE than the divergence
    tolerance on purpose (explorer lag is unbounded; floor is one-way)."""
    vm.clear_mocks()
    vm.mock_web(r".*cdn-cgi/trace.*",
                {"status": 200, "body": f"fl=1\nh=x\nts={epoch}.000\n"})
    import datetime as dt
    iso = dt.datetime.fromtimestamp(epoch - chain_lag, dt.timezone.utc) \
        .strftime("%Y-%m-%dT%H:%M:%S.000000Z")
    vm.mock_web(r".*blockscout.*",
                {"status": 200, "body": json.dumps([{"height": 1, "timestamp": iso}])})


def mock_sources(vm, body: str = BODY_95):
    vm.mock_web(r".*gt-example\.com.*", {"status": 200, "body": body})


def mock_judgment(vm, **kw):
    # initial round only — its bundle never contains the RECORDED DOSSIER header
    vm.mock_llm(r"(?s)^(?!.*RECORDED DOSSIER).*GROUNDTRUTH MILESTONE EVALUATION.*",
                judgment(**kw))


def mock_reassessment(vm, **kw):
    vm.mock_llm(r"(?s).*RECORDED DOSSIER.*", judgment(**kw))


def stats(c):
    return json.loads(c.get_stats())


def agreement_view(c, aid):
    return json.loads(c.get_agreement(aid))


def eval_view(c, eid):
    return json.loads(c.get_evaluation(eid))


def evidence_view(c, eid):
    return json.loads(c.get_evidence(eid))


def deployed(direct_vm, direct_deploy, direct_owner, epoch=T0):
    mock_clock(direct_vm, epoch)
    direct_vm.sender = direct_owner
    direct_vm.value = 0
    return direct_deploy(CONTRACT, COOLDOWN)


def created(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob,
            epoch=T0, amount=AMOUNT, threshold=9000, floor=6000,
            deadline=DEADLINE, sources_json=SOURCES_JSON, tag="Harborview Tower"):
    """Deployed + agreement created (alice pays, bob is payee) → PROPOSED."""
    c = deployed(direct_vm, direct_deploy, direct_owner, epoch)
    direct_vm.sender = direct_alice
    direct_vm.value = amount
    out = json.loads(c.create_agreement(
        addr_hex(direct_bob), "Harborview Tower — structural completion",
        "Has Harborview Tower reached certified structural completion?",
        "structural completion percentage", threshold, floor, deadline,
        sources_json, tag,
    ))
    direct_vm.value = 0
    return c, out["agreement_id"]


def accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob, **kw):
    """Created + payee assent → FUNDED."""
    c, aid = created(direct_vm, direct_deploy, direct_owner, direct_alice,
                     direct_bob, **kw)
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    c.accept_agreement(aid)
    return c, aid


def evaluated(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob,
              body=BODY_95, epoch=T0 + 7200, **judgment_kw):
    """Accepted + one evaluation at `epoch` with the given judgment."""
    c, aid = accepted(direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob)
    mock_clock(direct_vm, epoch)
    mock_sources(direct_vm, body)
    mock_judgment(direct_vm, **judgment_kw)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    out = json.loads(c.evaluate(aid))
    return c, aid, out
