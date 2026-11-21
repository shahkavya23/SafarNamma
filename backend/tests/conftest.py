"""Shared fixtures for the SafarNamma API test suite.

Runs against a throwaway SQLite file with foreign keys enforced (SQLite ignores
them by default; production Postgres does not, so tests must catch FK mistakes).
Session tokens are minted with the same signer the app uses — no Google round-trip.
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

_TMP = tempfile.mkdtemp(prefix="safarnamma-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["SESSION_SECRET"] = "test-only-secret"
os.environ["ADMIN_EMAILS"] = "admin@test.local"
# Keep Cloudinary calls out of tests: no credentials configured -> deletions skipped.
for var in ("CLOUDINARY_CLOUD_NAME", "CLOUD_NAME", "VITE_CLOUD_NAME",
            "CLOUDINARY_API_KEY", "CLOUD_API_KEY",
            "CLOUDINARY_API_SECRET", "CLOUD_API_SECRET"):
    os.environ.pop(var, None)

from sqlalchemy import event  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

# Register FK enforcement BEFORE main imports/uses the engine, so even the
# connections created during startup (create_all, backfill) get the pragma.
from server import database  # noqa: E402


@event.listens_for(database.engine, "connect")
def _fk_on(dbapi_conn, _record):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


import main  # noqa: E402
from server import auth  # noqa: E402
from server.database import engine  # noqa: E402
from SQLite import models  # noqa: E402


ADMIN = "admin@test.local"
STUDENT = "student@sst.scaler.com"
STUDENT2 = "student2@sst.scaler.com"
OUTSIDER = "outsider@gmail.com"


def headers(email: str) -> dict:
    return {"Authorization": f"Bearer {auth.create_session_token(email)}"}


@pytest.fixture()
def client():
    with TestClient(main.app) as c:
        yield c
    # Wipe rows between tests, children first so FK enforcement stays happy.
    with engine.begin() as conn:
        for table in (
            models.ItineraryStop.__table__,
            models.GroupMember.__table__,
            models.GroupRequest.__table__,
            models.TravelGroup.__table__,
            models.Itinerary.__table__,
            models.Notification.__table__,
            models.Favorite.__table__,
            models.Review.__table__,
            models.Destination.__table__,
            models.User.__table__,
        ):
            conn.execute(table.delete())


@pytest.fixture()
def admin_headers():
    return headers(ADMIN)


@pytest.fixture()
def student_headers():
    return headers(STUDENT)


@pytest.fixture()
def outsider_headers():
    return headers(OUTSIDER)


def make_place(client, hdrs, name="Test Falls", approved=False, **extra):
    payload = {
        "name": name,
        "category": "Nature",
        "description": "A lovely test destination with enough detail.",
        "state": "Karnataka",
        "budget_tier": "low",
        "is_approved": approved,
        **extra,
    }
    res = client.post("/api/destinations", json=payload, headers=hdrs)
    assert res.status_code == 201, res.text
    return res.json()


def make_group(client, hdrs, dest_id=None, **extra):
    from datetime import datetime, timedelta, timezone
    payload = {
        "destination_id": dest_id,
        "custom_destination": None if dest_id else "Test Route",
        "title": "Weekend ride",
        "description": "A test trip",
        "trip_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "meeting_area": "MG Road",
        "max_members": 3,
        "chat_link": "https://chat.whatsapp.com/AbCdEf123",
        **extra,
    }
    res = client.post("/api/groups", json=payload, headers=hdrs)
    assert res.status_code == 201, res.text
    return res.json()
