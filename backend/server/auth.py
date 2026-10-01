"""
Server-side authentication.

Login flow: the frontend sends the Google ID token it got from Google Sign-In to
POST /api/auth/google. We verify it with Google, then hand back our own signed
session token. Every protected endpoint reads the caller's identity from that
token, never from an email the client typed into a query string or body.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "726734847336-buqe2f9gr52p1dap3ha1ng6poqpj4oln.apps.googleusercontent.com",
)

# Anyone can sign in; trips (viewing, joining, hosting) are for SST students only
STUDENT_EMAIL_DOMAIN = "@sst.scaler.com"

_DEFAULT_ADMINS = (
    "shahkavya2307@gmail.com,"
    "kavya.25bcs10125@sst.scaler.com,"
    "pratishtha.26bcs10247@sst.scaler.com,"
    "bhavya.26bcs10191@sst.scaler.com,"
    "angan.25bcs10027@sst.scaler.com"
)
ADMIN_EMAILS = {
    e.strip().lower() for e in os.getenv("ADMIN_EMAILS", _DEFAULT_ADMINS).split(",") if e.strip()
}

SESSION_TTL_SECONDS = 7 * 24 * 60 * 60
TOKEN_PREFIX = "sn1."

# Set SESSION_SECRET in the host's environment. Without it we derive a stable
# secret from DATABASE_URL (which already holds the DB password), so tokens
# survive restarts and are shared across workers.
_secret_source = os.getenv("SESSION_SECRET") or ("safarnamma-session:" + os.getenv("DATABASE_URL", "local-dev"))
_SECRET = hashlib.sha256(_secret_source.encode()).digest()


def is_admin_email(email: str) -> bool:
    return email.strip().lower() in ADMIN_EMAILS


def is_student_email(email: str) -> bool:
    return email.strip().lower().endswith(STUDENT_EMAIL_DOMAIN) or is_admin_email(email)


@dataclass
class CurrentUser:
    email: str
    is_admin: bool
    is_student: bool


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _sign(payload: str) -> str:
    return _b64(hmac.new(_SECRET, payload.encode(), hashlib.sha256).digest())


def create_session_token(email: str) -> str:
    payload = _b64(json.dumps({"email": email.lower(), "exp": int(time.time()) + SESSION_TTL_SECONDS}).encode())
    return f"{TOKEN_PREFIX}{payload}.{_sign(payload)}"


def _read_session_token(token: str) -> Optional[str]:
    if not token.startswith(TOKEN_PREFIX):
        return None
    try:
        payload, sig = token[len(TOKEN_PREFIX):].split(".", 1)
        if not hmac.compare_digest(sig, _sign(payload)):
            return None
        data = json.loads(_unb64(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data.get("email")
    except (ValueError, json.JSONDecodeError):
        return None


def verify_google_credential(credential: str) -> str:
    """Verifies a Google ID token and returns the (lower-cased) email in it."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        info = id_token.verify_oauth2_token(credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google sign-in. Please try again.")

    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your Google email is not verified.")
    return email


def _user_from_header(authorization: Optional[str]) -> Optional[CurrentUser]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    email = _read_session_token(authorization[7:].strip())
    if not email:
        return None
    return CurrentUser(email=email, is_admin=is_admin_email(email), is_student=is_student_email(email))


def get_optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[CurrentUser]:
    return _user_from_header(authorization)


def get_current_user(authorization: Optional[str] = Header(default=None)) -> CurrentUser:
    user = _user_from_header(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def require_student(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trips are only open to SST students. Sign in with your @sst.scaler.com email.",
        )
    return user
