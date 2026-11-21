"""Reviews and favorites: persistence, validation, ownership."""
from conftest import headers, make_place, STUDENT


def test_review_rating_bounds(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Rate Me", approved=True)
    for bad in (0, 6, -1):
        res = client.post("/api/reviews", json={
            "destination_id": place["id"], "rating": bad, "comment": "nope",
        }, headers=outsider_headers)
        assert res.status_code == 422


def test_review_requires_auth(client, admin_headers):
    place = make_place(client, admin_headers, name="Rate Me", approved=True)
    res = client.post("/api/reviews", json={
        "destination_id": place["id"], "rating": 4, "comment": "nice",
    })
    assert res.status_code == 401


def test_review_updates_average(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Rate Me", approved=True)
    client.post("/api/reviews", json={"destination_id": place["id"], "rating": 4, "comment": "good"}, headers=outsider_headers)
    client.post("/api/reviews", json={"destination_id": place["id"], "rating": 2, "comment": "meh"}, headers=headers(STUDENT))
    refreshed = client.get(f"/api/destinations/{place['id']}").json()
    assert refreshed["rating"] == 3.0


def test_one_review_per_user_per_place(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Rate Me", approved=True)
    body = {"destination_id": place["id"], "rating": 5, "comment": "first"}
    assert client.post("/api/reviews", json=body, headers=outsider_headers).status_code == 201
    res = client.post("/api/reviews", json=body, headers=outsider_headers)
    assert res.status_code == 409
    reviews = client.get(f"/api/destinations/{place['id']}/reviews").json()
    assert len(reviews) == 1


def test_review_missing_destination(client, outsider_headers):
    res = client.post("/api/reviews", json={"destination_id": 99999, "rating": 4, "comment": "x"}, headers=outsider_headers)
    assert res.status_code == 404


def test_favorite_roundtrip(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Save Me", approved=True)
    assert client.get("/api/favorites", headers=outsider_headers).json() == []
    res = client.post("/api/favorites", json={"destination_id": place["id"], "user_email": "ignored@x.com"}, headers=outsider_headers)
    assert res.status_code == 201
    favs = client.get("/api/favorites", headers=outsider_headers).json()
    assert [p["id"] for p in favs] == [place["id"]]
    # duplicate add is idempotent
    client.post("/api/favorites", json={"destination_id": place["id"], "user_email": "x"}, headers=outsider_headers)
    assert len(client.get("/api/favorites", headers=outsider_headers).json()) == 1
    assert client.delete(f"/api/favorites/{place['id']}", headers=outsider_headers).status_code == 200
    assert client.get("/api/favorites", headers=outsider_headers).json() == []


def test_favorite_missing_destination(client, outsider_headers):
    res = client.post("/api/favorites", json={"destination_id": 99999, "user_email": "x"}, headers=outsider_headers)
    assert res.status_code == 404


def test_favorites_are_per_user(client, admin_headers, outsider_headers):
    place = make_place(client, admin_headers, name="Private Fav", approved=True)
    client.post("/api/favorites", json={"destination_id": place["id"], "user_email": "x"}, headers=outsider_headers)
    assert client.get("/api/favorites", headers=headers(STUDENT)).json() == []
