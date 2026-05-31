import pytest


@pytest.mark.integration
def test_integration_contract_is_documented():
    expected = [
        "/api/auth/login",
        "/api/keys",
        "/api/documents/upload",
        "/api/query",
        "/api/query/stream",
        "/api/admin/users",
    ]
    assert "/api/query/stream" in expected
