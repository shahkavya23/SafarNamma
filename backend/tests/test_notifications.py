"""Notifications: delivery on workflow events, ownership, read/clear."""
from conftest import STUDENT2, headers, make_group


def test_join_request_notifies_both_sides(client, student_headers):
    group = make_group(client, student_headers)
    client.post(f"/api/groups/{group['id']}/requests",
                json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                headers=headers(STUDENT2))
    host = client.get("/api/notifications", headers=student_headers).json()
    assert any(n["type"] == "group_request_received" for n in host["notifications"])
    joiner = client.get("/api/notifications", headers=headers(STUDENT2)).json()
    assert any(n["type"] == "group_pending" for n in joiner["notifications"])


def test_approval_notifies_joiner(client, student_headers):
    group = make_group(client, student_headers)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    client.put(f"/api/groups/requests/{res.json()['id']}/status?new_status=approved", headers=student_headers)
    joiner = client.get("/api/notifications", headers=headers(STUDENT2)).json()
    assert any(n["type"] == "group_approved" for n in joiner["notifications"])


def test_cannot_touch_others_notifications(client, student_headers):
    group = make_group(client, student_headers)
    client.post(f"/api/groups/{group['id']}/requests",
                json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                headers=headers(STUDENT2))
    joiner_notifs = client.get("/api/notifications", headers=headers(STUDENT2)).json()["notifications"]
    nid = joiner_notifs[0]["id"]
    # host marks joiner's notification read: must be a no-op
    client.put(f"/api/notifications/{nid}/read", headers=student_headers)
    still = client.get("/api/notifications", headers=headers(STUDENT2)).json()["notifications"]
    assert next(n for n in still if n["id"] == nid)["is_read"] is False
    # host deletes joiner's notification: must be a no-op
    client.delete(f"/api/notifications/{nid}", headers=student_headers)
    still = client.get("/api/notifications", headers=headers(STUDENT2)).json()["notifications"]
    assert any(n["id"] == nid for n in still)


def test_mark_read_and_clear_own(client, student_headers):
    group = make_group(client, student_headers)
    client.post(f"/api/groups/{group['id']}/requests",
                json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                headers=headers(STUDENT2))
    joiner_hdrs = headers(STUDENT2)
    notifs = client.get("/api/notifications", headers=joiner_hdrs).json()["notifications"]
    assert client.put(f"/api/notifications/{notifs[0]['id']}/read", headers=joiner_hdrs).status_code == 200
    assert client.put("/api/notifications/read-all", headers=joiner_hdrs).status_code == 200
    assert client.get("/api/notifications", headers=joiner_hdrs).json()["unread_count"] == 0
    assert client.delete("/api/notifications/clear-all", headers=joiner_hdrs).status_code == 200
    assert client.get("/api/notifications", headers=joiner_hdrs).json()["notifications"] == []
    # host's notifications untouched by joiner's clear-all
    assert len(client.get("/api/notifications", headers=student_headers).json()["notifications"]) > 0


def test_presence_ping(client):
    res = client.post("/api/presence", json={"session_id": "test-session-123"})
    assert res.status_code == 200
    assert res.json()["active"] >= 1
