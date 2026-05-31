from services.api_key_service import generate_api_key, hash_api_key, hash_password, verify_password


def test_password_hash_verifies_original_password():
    hashed = hash_password("StrongPassword123")
    assert hashed != "StrongPassword123"
    assert verify_password("StrongPassword123", hashed)
    assert not verify_password("wrong", hashed)


def test_api_key_format_and_hash_do_not_store_plaintext():
    raw = generate_api_key()
    digest = hash_api_key(raw)
    assert raw.startswith("rkb_")
    assert len(raw) == 36
    assert digest != raw
    assert len(digest) == 64
