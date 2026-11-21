"""Authentication and authorization tests."""
import base64
import hashlib
import hmac
import json
import time

from conftest import ADMIN, OUTSIDER, headers


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def test_health(client):
    assert client.get("/api/health").status_code == 200


def test_protected_endpoint_requires_token(client):
    assert client.get("/api/users/profile").status_code == 401
    assert client.get("/api/favorites").status_code == 401
    assert client.get("/api/notifications").status_code == 401


def test_garbage_token_rejected(client):
    res = client.get("/api/users/profile", headers={"Authorization": "Bearer sn1.not-a-real-token"})
    assert res.status_code == 401


def test_forged_token_rejected(client):
    """A token signed with the wrong key must never authenticate, even for an admin email."""
    payload = _b64(json.dumps({"email": ADMIN, "exp": int(time.time()) + 3600}).encode())
    sig = _b64(hmac.new(b"attacker-key", payload.encode(), hashlib.sha256).digest())
    res = client.get("/api/admin/submissions", headers={"Authorization": f"Bearer sn1.{payload}.{sig}"})
    assert res.status_code == 401


def test_expired_token_rejected(client):
    from server import auth
    payload = auth._b64(json.dumps({"email": OUTSIDER, "exp": int(time.time()) - 10}).encode())
    token = f"sn1.{payload}.{auth._sign(payload)}"
    res = client.get("/api/users/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_invalid_google_credential_rejected(client):
    res = client.post("/api/auth/google", json={"credential": "x" * 40})
    assert res.status_code == 401


def test_admin_endpoints_require_admin(client):
    res = client.get("/api/admin/submissions", headers=headers(OUTSIDER))
    assert res.status_code == 403
    res = client.get("/api/admin/submissions", headers=headers(ADMIN))
    assert res.status_code == 200


def test_session_identity_comes_from_token_not_query(client, outsider_headers):
    """Passing someone else's email in the query string must not impersonate them."""
    res = client.get(f"/api/users/profile?email={ADMIN}", headers=outsider_headers)
    assert res.status_code == 200
    assert res.json()["email"] == OUTSIDER
