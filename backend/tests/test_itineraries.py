"""Itineraries: admin CRUD, featured cap, lock/teaser semantics, stop ordering."""
from conftest import STUDENT, headers, make_group, make_place


def _route(client, admin_headers, places, title="Test Route", featured=False):
    res = client.post("/api/itineraries", json={
        "title": title, "description": "A route for testing purposes",
        "stops": [{"destination_id": p["id"], "order_index": i + 1} for i, p in enumerate(places)],
    }, headers=admin_headers)
    assert res.status_code == 201, res.text
    it = res.json()
    if featured:
        res = client.put(f"/api/itineraries/{it['id']}", json={"is_featured": True}, headers=admin_headers)
        assert res.status_code == 200, res.text
        it = res.json()
    return it


def test_itinerary_create_requires_admin(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Stop A", approved=True)
    res = client.post("/api/itineraries", json={
        "title": "Nope", "description": "Should fail",
        "stops": [{"destination_id": place["id"], "order_index": 1}],
    }, headers=outsider_headers)
    assert res.status_code == 403


def test_list_requires_auth(client):
    assert client.get("/api/itineraries").status_code == 401


def test_locked_route_is_teaser_for_regular_user(client, admin_headers, student_headers):
    places = [make_place(client, admin_headers, name=f"Stop {i}", approved=True) for i in range(3)]
    it = _route(client, admin_headers, places)
    res = client.get(f"/api/itineraries/{it['id']}", headers=student_headers).json()
    assert res["is_locked"] is True
    assert res["stops"] == []
    assert res["stop_count"] == 3
    assert res["route_preview"] == [p["name"] for p in places]
    # admin sees everything
    admin_view = client.get(f"/api/itineraries/{it['id']}", headers=admin_headers).json()
    assert admin_view["is_locked"] is False
    assert len(admin_view["stops"]) == 3


def test_featured_route_open_to_all(client, admin_headers, student_headers):
    places = [make_place(client, admin_headers, name=f"Free {i}", approved=True) for i in range(2)]
    it = _route(client, admin_headers, places, title="Free Route", featured=True)
    res = client.get(f"/api/itineraries/{it['id']}", headers=student_headers).json()
    assert res["is_locked"] is False
    assert len(res["stops"]) == 2


def test_featured_cap_is_three(client, admin_headers):
    place = make_place(client, admin_headers, name="Cap Stop", approved=True)
    for i in range(3):
        _route(client, admin_headers, [place], title=f"Featured {i}", featured=True)
    fourth = _route(client, admin_headers, [place], title="Featured 3")
    res = client.put(f"/api/itineraries/{fourth['id']}", json={"is_featured": True}, headers=admin_headers)
    assert res.status_code == 400


def test_hosting_trip_unlocks_route(client, admin_headers, student_headers):
    place = make_place(client, admin_headers, name="Unlock Stop", approved=True)
    it = _route(client, admin_headers, [place])
    assert client.get(f"/api/itineraries/{it['id']}", headers=student_headers).json()["is_locked"] is True
    make_group(client, student_headers, dest_id=place["id"], itinerary_id=it["id"])
    assert client.get(f"/api/itineraries/{it['id']}", headers=student_headers).json()["is_locked"] is False


def test_stop_conflict_modes(client, admin_headers):
    places = [make_place(client, admin_headers, name=f"Conflict {i}", approved=True) for i in range(3)]
    it = _route(client, admin_headers, places[:2])
    # no conflict mode -> 409
    res = client.post(f"/api/itineraries/{it['id']}/stops",
                      json={"destination_id": places[2]["id"], "order_index": 1}, headers=admin_headers)
    assert res.status_code == 409
    # shift -> contiguous renumbering
    res = client.post(f"/api/itineraries/{it['id']}/stops",
                      json={"destination_id": places[2]["id"], "order_index": 1, "conflict_mode": "shift"},
                      headers=admin_headers)
    assert res.status_code == 201
    detail = client.get(f"/api/itineraries/{it['id']}", headers=admin_headers).json()
    assert [s["order_index"] for s in detail["stops"]] == [1, 2, 3]
    assert detail["stops"][0]["destination_id"] == places[2]["id"]
    # replace -> swaps destination at position 2
    res = client.post(f"/api/itineraries/{it['id']}/stops",
                      json={"destination_id": places[0]["id"], "order_index": 2, "conflict_mode": "replace"},
                      headers=admin_headers)
    assert res.status_code == 201
    detail = client.get(f"/api/itineraries/{it['id']}", headers=admin_headers).json()
    assert len(detail["stops"]) == 3
    assert detail["stops"][1]["destination_id"] == places[0]["id"]


def test_delete_stop_resequences(client, admin_headers):
    places = [make_place(client, admin_headers, name=f"Seq {i}", approved=True) for i in range(3)]
    it = _route(client, admin_headers, places)
    stop_id = it["stops"][0]["id"]
    assert client.delete(f"/api/itineraries/stops/{stop_id}", headers=admin_headers).status_code == 200
    detail = client.get(f"/api/itineraries/{it['id']}", headers=admin_headers).json()
    assert [s["order_index"] for s in detail["stops"]] == [1, 2]


def test_delete_itinerary_keeps_groups(client, admin_headers, student_headers):
    """Groups that referenced the route must survive with itinerary_id cleared (Postgres FK safety)."""
    place = make_place(client, admin_headers, name="Doomed Route Stop", approved=True)
    it = _route(client, admin_headers, [place])
    group = make_group(client, student_headers, dest_id=place["id"], itinerary_id=it["id"])
    res = client.delete(f"/api/itineraries/{it['id']}", headers=admin_headers)
    assert res.status_code == 200
    g = client.get(f"/api/groups/{group['id']}", headers=student_headers).json()
    assert g["itinerary_id"] is None


def test_update_stop_fields(client, admin_headers):
    place = make_place(client, admin_headers, name="Note Stop", approved=True)
    it = _route(client, admin_headers, [place])
    stop_id = it["stops"][0]["id"]
    res = client.patch(f"/api/itineraries/stops/{stop_id}",
                       json={"transport_mode": "Walk", "note": "Bring water"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["transport_mode"] == "Walk"
    assert res.json()["note"] == "Bring water"
