"""Destination catalog: moderation visibility, duplicates, validation, admin CRUD."""
from conftest import ADMIN, OUTSIDER, STUDENT, headers, make_place


def test_submission_is_pending_and_hidden_from_public_list(client, outsider_headers):
    place = make_place(client, outsider_headers, name="Hidden Cave")
    assert place["is_approved"] is False
    assert place["submission_status"] == "pending"
    public = client.get("/api/destinations").json()
    assert all(p["id"] != place["id"] for p in public)


def test_unapproved_place_not_readable_by_anonymous(client, outsider_headers):
    place = make_place(client, outsider_headers, name="Pending Peak")
    assert client.get(f"/api/destinations/{place['id']}").status_code == 404


def test_unapproved_place_readable_by_submitter_and_admin(client, outsider_headers, admin_headers):
    place = make_place(client, outsider_headers, name="Pending Peak")
    assert client.get(f"/api/destinations/{place['id']}", headers=outsider_headers).status_code == 200
    assert client.get(f"/api/destinations/{place['id']}", headers=admin_headers).status_code == 200


def test_other_user_cannot_read_unapproved_place(client, outsider_headers):
    place = make_place(client, outsider_headers, name="Pending Peak")
    res = client.get(f"/api/destinations/{place['id']}", headers=headers(STUDENT))
    assert res.status_code == 404


def test_admin_can_publish_directly(client, admin_headers):
    place = make_place(client, admin_headers, name="Published Park", approved=True)
    assert place["is_approved"] is True
    public = client.get("/api/destinations").json()
    assert any(p["id"] == place["id"] for p in public)


def test_non_admin_cannot_self_approve(client, outsider_headers):
    place = make_place(client, outsider_headers, name="Sneaky Spot", approved=True)
    assert place["is_approved"] is False


def test_invalid_category_rejected(client, outsider_headers):
    res = client.post("/api/destinations", json={
        "name": "Bad Category", "category": "Not A Category",
        "description": "x", "budget_tier": "low",
    }, headers=outsider_headers)
    assert res.status_code == 422


def test_duplicate_approved_name_rejected(client, admin_headers, outsider_headers):
    make_place(client, admin_headers, name="Lalbagh Garden", approved=True)
    res = client.post("/api/destinations", json={
        "name": "lalbagh garden", "category": "Nature",
        "description": "dup", "budget_tier": "low",
    }, headers=outsider_headers)
    assert res.status_code == 400


def test_max_two_pending_submissions_per_name(client, outsider_headers):
    make_place(client, outsider_headers, name="Twice Falls")
    make_place(client, outsider_headers, name="Twice Falls")
    res = client.post("/api/destinations", json={
        "name": "Twice Falls", "category": "Nature",
        "description": "third", "budget_tier": "low",
    }, headers=outsider_headers)
    assert res.status_code == 400


def test_coordinate_validation(client, outsider_headers):
    base = {"name": "Coords", "category": "Nature", "description": "x", "budget_tier": "low"}
    assert client.post("/api/destinations", json={**base, "latitude": 12.9}, headers=outsider_headers).status_code == 422
    assert client.post("/api/destinations", json={**base, "latitude": 95.0, "longitude": 77.0}, headers=outsider_headers).status_code == 422
    assert client.post("/api/destinations", json={**base, "latitude": 0.0, "longitude": 0.0}, headers=outsider_headers).status_code == 422


def test_edit_requires_admin(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Edit Me", approved=True)
    payload = {**place, "name": "Edited"}
    assert client.put(f"/api/destinations/{place['id']}", json=payload, headers=outsider_headers).status_code == 403
    res = client.put(f"/api/destinations/{place['id']}", json=payload, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Edited"


def test_delete_requires_admin(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Delete Me", approved=True)
    assert client.delete(f"/api/destinations/{place['id']}", headers=outsider_headers).status_code == 403
    assert client.delete(f"/api/destinations/{place['id']}", headers=admin_headers).status_code == 204
    assert client.get(f"/api/destinations/{place['id']}", headers=admin_headers).status_code == 404


def test_delete_place_used_by_itinerary_blocked(client, admin_headers):
    place = make_place(client, admin_headers, name="Route Stop", approved=True)
    res = client.post("/api/itineraries", json={
        "title": "Test Route", "description": "A route for testing",
        "stops": [{"destination_id": place["id"], "order_index": 1}],
    }, headers=admin_headers)
    assert res.status_code == 201
    res = client.delete(f"/api/destinations/{place['id']}", headers=admin_headers)
    assert res.status_code == 409
    # The place and the route both survive
    assert client.get(f"/api/destinations/{place['id']}", headers=admin_headers).status_code == 200


def test_popular_weekend_fallback(client, admin_headers):
    for i in range(4):
        make_place(client, admin_headers, name=f"Weekend {i}", approved=True)
    res = client.get("/api/destinations/popular-weekend")
    assert res.status_code == 200
    assert len(res.json()) == 3


def test_search_and_category_filters(client, admin_headers):
    make_place(client, admin_headers, name="Alpha Falls", approved=True)
    make_place(client, admin_headers, name="Beta Mall", approved=True, category="Mall")
    assert len(client.get("/api/destinations?search=alpha").json()) == 1
    assert len(client.get("/api/destinations?category=Mall").json()) == 1
