"""Phase 3 scaffold check — replaced by the real suites in Phase 5.

Proves the direct-mode harness (gltest's pytest11 plugin: direct_vm /
direct_deploy fixtures) runs end to end in this repo, so CI is green from the
first commit and Phase 5 starts from a working test loop rather than
debugging plumbing.
"""


def test_placeholder_contract_deploys(direct_vm, direct_deploy):
    contract = direct_deploy("groundtruth.py")
    assert contract is not None
