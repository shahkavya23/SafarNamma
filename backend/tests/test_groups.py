"""Travel groups: hosting, joining, approval, seats, privacy, ownership rules."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from conftest import OUTSIDER, STUDENT, STUDENT2, headers, make_group, make_place


def test_non_student_cannot_host(client, outsider_headers):
    res = client.post("/api/groups", json={
        "custom_destination": "X", "title": "T", "description": "D",
        "trip_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "meeting_area": "M", "chat_link": "https://chat.whatsapp.com/Abc123",
    }, headers=outsider_headers)
    assert res.status_code == 403


def test_create_group_defaults(client, student_headers, admin_headers):
    place = make_place(client, admin_headers, name="Group Spot", approved=True)
    group = make_group(client, student_headers, dest_id=place["id"])
    assert group["current_members"] == 1
    assert group["status"] == "open"
    assert group["organizer_email"] == STUDENT


def test_chat_link_validation(client, student_headers):
    for bad in ("https://evil.com/chat", "javascript:alert(1)", "https://chat.whatsapp.com.evil.com/x"):
        res = client.post("/api/groups", json={
            "custom_destination": "X", "title": "T", "description": "D",
            "trip_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "meeting_area": "M", "chat_link": bad,
        }, headers=student_headers)
        assert res.status_code == 400, bad


def test_requires_destination_or_custom(client, student_headers):
    res = client.post("/api/groups", json={
        "title": "T", "description": "D",
        "trip_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "meeting_area": "M", "chat_link": "https://chat.whatsapp.com/Abc123",
    }, headers=student_headers)
    assert res.status_code == 400


def test_daily_creation_limit(client, student_headers):
    make_group(client, student_headers)
    make_group(client, student_headers)
    res = client.post("/api/groups", json={
        "custom_destination": "X", "title": "Third", "description": "D",
        "trip_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "meeting_area": "M", "chat_link": "https://chat.whatsapp.com/Abc123",
    }, headers=student_headers)
    assert res.status_code == 400


def test_public_list_hides_email_and_chat(client, student_headers):
    make_group(client, student_headers)
    listing = client.get("/api/groups").json()
    assert len(listing) == 1
    assert listing[0]["chat_link"] is None
    assert listing[0]["organizer_email"] == ""


def test_chat_link_privacy(client, student_headers, admin_headers):
    place = make_place(client, admin_headers, name="Chat Spot", approved=True)
    group = make_group(client, student_headers, dest_id=place["id"])
    # another student who has not joined: no chat link
    other = client.get(f"/api/groups/{group['id']}", headers=headers(STUDENT2)).json()
    assert other["chat_link"] is None
    # organizer sees it
    host = client.get(f"/api/groups/{group['id']}", headers=student_headers).json()
    assert host["chat_link"] == group["chat_link"]


def test_join_and_approval_flow(client, student_headers, admin_headers):
    place = make_place(client, admin_headers, name="Join Spot", approved=True)
    group = make_group(client, student_headers, dest_id=place["id"], max_members=2)
    joiner = headers(STUDENT2)

    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "Joiner", "user_email": STUDENT2},
                      headers=joiner)
    assert res.status_code == 201
    req_id = res.json()["id"]

    # duplicate request rejected
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "Joiner", "user_email": STUDENT2},
                      headers=joiner)
    assert res.status_code == 400

    # only organizer can see requests
    assert client.get(f"/api/groups/{group['id']}/requests", headers=joiner).status_code == 403

    # approve
    res = client.put(f"/api/groups/requests/{req_id}/status?new_status=approved", headers=student_headers)
    assert res.status_code == 200
    g = client.get(f"/api/groups/{group['id']}", headers=student_headers).json()
    assert g["current_members"] == 2
    assert g["status"] == "full"
    # approved member now sees the chat link
    assert client.get(f"/api/groups/{group['id']}", headers=joiner).json()["chat_link"] is not None
    # roster has the member
    members = client.get(f"/api/groups/{group['id']}/members", headers=student_headers).json()
    assert [m["user_email"] for m in members] == [STUDENT2]
    # full group rejects new requests
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "Late", "user_email": OUTSIDER},
                      headers=headers(OUTSIDER))
    assert res.status_code in (400, 403)


def test_organizer_cannot_join_own_group(client, student_headers):
    group = make_group(client, student_headers)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "Host", "user_email": STUDENT},
                      headers=student_headers)
    assert res.status_code == 400


def test_non_organizer_cannot_approve(client, student_headers):
    group = make_group(client, student_headers)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    req_id = res.json()["id"]
    assert client.put(f"/api/groups/requests/{req_id}/status?new_status=approved",
                      headers=headers(STUDENT2)).status_code == 403


def test_reject_approved_member_frees_seat(client, student_headers):
    group = make_group(client, student_headers, max_members=2)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    req_id = res.json()["id"]
    client.put(f"/api/groups/requests/{req_id}/status?new_status=approved", headers=student_headers)
    client.put(f"/api/groups/requests/{req_id}/status?new_status=rejected", headers=student_headers)
    g = client.get(f"/api/groups/{group['id']}", headers=student_headers).json()
    assert g["current_members"] == 1
    assert g["status"] == "open"
    assert client.get(f"/api/groups/{group['id']}", headers=headers(STUDENT2)).json()["chat_link"] is None


def test_remove_member_endpoint(client, student_headers):
    group = make_group(client, student_headers, max_members=2)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    client.put(f"/api/groups/requests/{res.json()['id']}/status?new_status=approved", headers=student_headers)
    members = client.get(f"/api/groups/{group['id']}/members", headers=student_headers).json()
    res = client.delete(f"/api/groups/{group['id']}/members/{members[0]['id']}", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["current_members"] == 1
    assert client.get(f"/api/groups/{group['id']}/members", headers=student_headers).json() == []


def test_concurrent_duplicate_requests_no_double_row(client, student_headers):
    group = make_group(client, student_headers)
    body = {"group_id": group["id"], "user_name": "J", "user_email": STUDENT2}
    hdrs = headers(STUDENT2)

    def fire():
        from fastapi.testclient import TestClient
        import main
        with TestClient(main.app) as c:
            return c.post(f"/api/groups/{group['id']}/requests", json=body, headers=hdrs).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(pool.map(lambda _: fire(), range(2)))
    assert sorted(codes) == [201, 400], codes
    reqs = client.get(f"/api/groups/{group['id']}/requests", headers=student_headers).json()
    assert len(reqs) == 1


def test_patch_ownership_and_cutoff(client, student_headers):
    group = make_group(client, student_headers)
    assert client.patch(f"/api/groups/{group['id']}", json={"title": "Hacked"},
                        headers=headers(STUDENT2)).status_code == 403
    # trip departing in 6 hours: editing locked
    soon = make_group(client, student_headers,
                      trip_date=(datetime.now(timezone.utc) + timedelta(hours=6)).isoformat())
    res = client.patch(f"/api/groups/{soon['id']}", json={"title": "Too late"}, headers=student_headers)
    assert res.status_code == 400
    # normal edit works
    res = client.patch(f"/api/groups/{group['id']}", json={"title": "New title"}, headers=student_headers)
    assert res.status_code == 200
    assert res.json()["title"] == "New title"


def test_delete_cooldown_and_ownership(client, student_headers):
    group = make_group(client, student_headers)
    assert client.delete(f"/api/groups/{group['id']}", headers=headers(STUDENT2)).status_code == 403
    res = client.delete(f"/api/groups/{group['id']}", headers=student_headers)
    assert res.status_code == 400  # 2-hour cooldown


def test_capacity_cannot_shrink_below_members(client, student_headers):
    group = make_group(client, student_headers, max_members=2)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    client.put(f"/api/groups/requests/{res.json()['id']}/status?new_status=approved", headers=student_headers)
    res = client.patch(f"/api/groups/{group['id']}", json={"max_members": 1}, headers=student_headers)
    assert res.status_code in (400, 422)


def test_my_trips_includes_hosted_and_joined(client, student_headers):
    group = make_group(client, student_headers)
    res = client.post(f"/api/groups/{group['id']}/requests",
                      json={"group_id": group["id"], "user_name": "J", "user_email": STUDENT2},
                      headers=headers(STUDENT2))
    client.put(f"/api/groups/requests/{res.json()['id']}/status?new_status=approved", headers=student_headers)
    mine = client.get("/api/me/trips", headers=headers(STUDENT2)).json()
    assert [g["id"] for g in mine] == [group["id"]]
    assert mine[0]["user_request_status"] == "approved"
