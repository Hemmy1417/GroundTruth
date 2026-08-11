import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "slow: full-consensus integration tests (deploy + judged writes); "
        "run explicitly — they cost minutes and live LLM rounds",
    )
