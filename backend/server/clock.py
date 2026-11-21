"""Naive-UTC clock helper.

The database stores naive UTC timestamps (see Submissions/schemas.py), so this
returns the current UTC time WITHOUT tzinfo — same semantics as the deprecated
datetime.utcnow(), without the deprecation warning on Python 3.12+.
"""
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
