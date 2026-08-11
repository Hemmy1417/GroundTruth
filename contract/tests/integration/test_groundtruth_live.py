"""Integration tests against a LIVE deployed GroundTruth (StudioNet).

Default tests ATTACH to the deployed address (read-only, CI-safe, no
new-deploy indexing lag). Set GROUNDTRUTH_CONTRACT_ADDRESS in contract/.env
(written at Phase 11 deployment). The @slow tests run full consensus rounds —
deploy + judged writes — and are excluded from CI by default.

Known env constraint (portfolio-documented): gltest's schema derivation needs
a working GenVM; on Windows + some CI networks that path 404s. When attach
fails on schema, the CLI (`genlayer call`) remains the fallback verification.
"""

import json
import os

import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

ADDRESS = os.environ.get("GROUNDTRUTH_CONTRACT_ADDRESS", "")

pytestmark = pytest.mark.skipif(
    not ADDRESS, reason="GROUNDTRUTH_CONTRACT_ADDRESS not set (deploys at Phase 11)"
)


@pytest.fixture(scope="module")
def live():
    factory = get_contract_factory("GroundTruth")
    return factory.build_contract(contract_address=ADDRESS)


def test_config_reads_and_matches_protocol(live):
    cfg = json.loads(live.get_config(args=[]).call())
    assert cfg["policy_version"] == 1
    assert cfg["challenge_window_seconds"] == 72 * 3600
    assert cfg["dispute_terminal_seconds"] == 7 * 86400
    assert cfg["keeper_bounty_bps"] == 50
    assert cfg["challenge_bond_atto"] == str(10 ** 18)
    assert cfg["max_sources"] == 4


def test_stats_shape_and_accounting_sanity(live):
    st = json.loads(live.get_stats(args=[]).call())
    for k in ("agreements", "evaluations", "evidence",
              "escrow_held_atto", "bonds_held_atto", "settled_total_atto"):
        assert k in st
    assert int(st["escrow_held_atto"]) >= 0
    assert int(st["bonds_held_atto"]) >= 0


def test_agreement_views_are_internally_consistent(live):
    st = json.loads(live.get_stats(args=[]).call())
    if st["agreements"] == 0:
        pytest.skip("no agreements on the live contract yet")
    a = json.loads(live.get_agreement(args=[1]).call())
    assert a["id"] == 1
    assert a["state"] in ("PROPOSED", "FUNDED", "ARMED", "DISPUTED",
                          "SETTLED", "EXPIRED", "CANCELLED")
    for ev_id in a["evaluation_ids"]:
        ev = json.loads(live.get_evaluation(args=[ev_id]).call())
        assert ev["agreement_id"] == 1
        assert ev["judgment"]["verdict"] in ("SATISFIED", "NOT_SATISFIED", "INCONCLUSIVE")
        assert ev["judgment"]["completion_bucket"] % 5 == 0


@pytest.mark.slow
def test_full_consensus_round_create_and_evaluate():
    """Deploy a fresh instance and run one REAL judged evaluation through
    consensus. Minutes, real LLM rounds — run explicitly before deployment."""
    factory = get_contract_factory("GroundTruth")
    contract = factory.deploy(args=[60])

    res = contract.create_agreement(
        args=["0x" + "22" * 20, "Live check agreement",
              "Does https://example.com describe example domain usage?",
              "descriptive completeness", 10_000, 0,
              4_102_444_800,  # 2100 — far future
              json.dumps(["https://example.com/"]), "integration"],
        value=10 ** 16,
    ).transact()
    assert tx_execution_succeeded(res)

    res2 = contract.evaluate(args=[1]).transact()
    assert tx_execution_succeeded(res2)
    ev = json.loads(contract.get_evaluation(args=[1]).call())
    assert ev["judgment"]["verdict"] in ("SATISFIED", "NOT_SATISFIED", "INCONCLUSIVE")
