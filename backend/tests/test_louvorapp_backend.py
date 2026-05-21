"""Backend API tests for LouvorApp - Worship Ministry Management."""
import os
import uuid
import pytest
import requests

BASE_URL = "https://worship-hub-100.preview.emergentagent.com/api"

# Unique suffix for test isolation
SUFFIX = uuid.uuid4().hex[:8]


# ============= Fixtures =============
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def demo_token(s):
    r = s.post(f"{BASE_URL}/auth/login", json={"email": "demo@louvor.app", "password": "demo123"})
    assert r.status_code == 200, f"Demo login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def leader_a(s):
    """Create a fresh leader/ministry for multi-tenant isolation tests."""
    payload = {
        "name": f"TEST Leader A {SUFFIX}",
        "email": f"test_leader_a_{SUFFIX}@louvor.app",
        "password": "secret123",
        "ministry_name": f"TEST Ministry A {SUFFIX}",
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email"] = payload["email"]
    return data


@pytest.fixture(scope="session")
def leader_b(s):
    payload = {
        "name": f"TEST Leader B {SUFFIX}",
        "email": f"test_leader_b_{SUFFIX}@louvor.app",
        "password": "secret123",
        "ministry_name": f"TEST Ministry B {SUFFIX}",
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email"] = payload["email"]
    return data


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ============= Health =============
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{BASE_URL}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ============= Auth =============
class TestAuth:
    def test_signup_creates_leader_with_invite_code(self, leader_a):
        assert leader_a["user"]["role"] == "leader"
        assert leader_a["ministry"]["invite_code"]
        assert len(leader_a["ministry"]["invite_code"]) == 6
        assert leader_a["token"]

    def test_signup_with_invite_code_creates_member(self, s, leader_a):
        invite = leader_a["ministry"]["invite_code"]
        payload = {
            "name": f"TEST Member {SUFFIX}",
            "email": f"test_member_{SUFFIX}@louvor.app",
            "password": "secret123",
            "invite_code": invite,
        }
        r = s.post(f"{BASE_URL}/auth/signup", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "member"
        assert body["user"]["ministry_id"] == leader_a["ministry"]["id"]

    def test_signup_duplicate_email_returns_400(self, s, leader_a):
        payload = {
            "name": "Dup",
            "email": leader_a["email"],
            "password": "secret123",
            "ministry_name": "X",
        }
        r = s.post(f"{BASE_URL}/auth/signup", json=payload)
        assert r.status_code == 400

    def test_signup_invalid_invite_code_returns_400(self, s):
        r = s.post(f"{BASE_URL}/auth/signup", json={
            "name": f"TEST Bad {SUFFIX}",
            "email": f"test_bad_{SUFFIX}@louvor.app",
            "password": "secret123",
            "invite_code": "ZZZZZZ",
        })
        assert r.status_code == 400

    def test_login_success(self, s, leader_a):
        r = s.post(f"{BASE_URL}/auth/login", json={"email": leader_a["email"], "password": "secret123"})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_wrong_password_401(self, s, leader_a):
        r = s.post(f"{BASE_URL}/auth/login", json={"email": leader_a["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me_returns_user(self, s, leader_a):
        r = s.get(f"{BASE_URL}/auth/me", headers=auth(leader_a["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == leader_a["email"]

    def test_me_without_token_401(self, s):
        r = s.get(f"{BASE_URL}/auth/me")
        assert r.status_code == 401

    def test_update_me(self, s, leader_a):
        r = s.put(
            f"{BASE_URL}/auth/me",
            headers=auth(leader_a["token"]),
            json={"name": "TEST Updated Name", "phone": "11999999999", "instruments": ["guitar", "vocal"]},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "TEST Updated Name"
        assert body["phone"] == "11999999999"
        assert "guitar" in body["instruments"]
        # Verify persistence
        r2 = s.get(f"{BASE_URL}/auth/me", headers=auth(leader_a["token"]))
        assert r2.json()["phone"] == "11999999999"


# ============= Ministry =============
class TestMinistry:
    def test_get_ministry(self, s, leader_a):
        r = s.get(f"{BASE_URL}/ministry", headers=auth(leader_a["token"]))
        assert r.status_code == 200
        assert r.json()["id"] == leader_a["ministry"]["id"]

    def test_list_members(self, s, leader_a):
        r = s.get(f"{BASE_URL}/ministry/members", headers=auth(leader_a["token"]))
        assert r.status_code == 200
        members = r.json()
        assert isinstance(members, list)
        emails = [m["email"] for m in members]
        assert leader_a["email"] in emails

    def test_ministry_requires_auth(self, s):
        r = s.get(f"{BASE_URL}/ministry")
        assert r.status_code == 401


# ============= Songs =============
class TestSongs:
    def test_song_crud_and_persistence(self, s, leader_a):
        h = auth(leader_a["token"])
        # Create
        payload = {
            "title": "TEST Maranata",
            "artist": "Casa Worship",
            "key": "G",
            "bpm": 72,
            "lyrics": "Vem Senhor Jesus",
            "tags": ["adoração"],
        }
        r = s.post(f"{BASE_URL}/songs", json=payload, headers=h)
        assert r.status_code == 200, r.text
        song = r.json()
        sid = song["id"]
        assert song["title"] == "TEST Maranata"
        assert song["ministry_id"] == leader_a["ministry"]["id"]

        # Get
        r = s.get(f"{BASE_URL}/songs/{sid}", headers=h)
        assert r.status_code == 200
        assert r.json()["key"] == "G"

        # List sorted by title
        s.post(f"{BASE_URL}/songs", json={"title": "TEST Aleluia", "key": "C"}, headers=h)
        r = s.get(f"{BASE_URL}/songs", headers=h)
        assert r.status_code == 200
        titles = [x["title"] for x in r.json()]
        test_titles = [t for t in titles if t.startswith("TEST")]
        assert test_titles == sorted(test_titles)

        # Update
        r = s.put(f"{BASE_URL}/songs/{sid}", json={**payload, "key": "A"}, headers=h)
        assert r.status_code == 200
        assert r.json()["key"] == "A"

        # Delete
        r = s.delete(f"{BASE_URL}/songs/{sid}", headers=h)
        assert r.status_code == 200
        r = s.get(f"{BASE_URL}/songs/{sid}", headers=h)
        assert r.status_code == 404


# ============= Scales =============
class TestScales:
    def test_scale_crud(self, s, leader_a):
        h = auth(leader_a["token"])
        # Need a member assignment - use leader itself
        payload = {
            "title": "TEST Culto Domingo",
            "date": "2026-12-25",
            "time": "19:30",
            "location": "Templo Central",
            "song_ids": [],
            "assignments": [
                {"user_id": "u1", "user_name": "TEST Leader A", "instrument": "vocal"}
            ],
        }
        r = s.post(f"{BASE_URL}/scales", json=payload, headers=h)
        assert r.status_code == 200, r.text
        scale = r.json()
        sid = scale["id"]
        assert scale["created_by"]
        assert scale["ministry_id"] == leader_a["ministry"]["id"]

        # List
        r = s.get(f"{BASE_URL}/scales", headers=h)
        assert r.status_code == 200
        assert any(x["id"] == sid for x in r.json())

        # Get one
        r = s.get(f"{BASE_URL}/scales/{sid}", headers=h)
        assert r.status_code == 200

        # Delete
        r = s.delete(f"{BASE_URL}/scales/{sid}", headers=h)
        assert r.status_code == 200
        r = s.get(f"{BASE_URL}/scales/{sid}", headers=h)
        assert r.status_code == 404


# ============= Announcements =============
class TestAnnouncements:
    def test_announcement_flow(self, s, leader_a):
        h = auth(leader_a["token"])
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST Aviso", "message": "Ensaio sábado"},
            headers=h,
        )
        assert r.status_code == 200, r.text
        ann = r.json()
        assert ann["author_id"]
        assert ann["author_name"]
        aid = ann["id"]

        # List sorted desc - create another and verify newer is first
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST Aviso 2", "message": "Outro"},
            headers=h,
        )
        assert r.status_code == 200
        r = s.get(f"{BASE_URL}/announcements", headers=h)
        assert r.status_code == 200
        items = r.json()
        test_items = [i for i in items if i["title"].startswith("TEST")]
        assert len(test_items) >= 2
        assert test_items[0]["created_at"] >= test_items[1]["created_at"]

        # Delete
        r = s.delete(f"{BASE_URL}/announcements/{aid}", headers=h)
        assert r.status_code == 200


# ============= Stats =============
class TestStats:
    def test_stats_returns_counters(self, s, leader_a):
        r = s.get(f"{BASE_URL}/stats", headers=auth(leader_a["token"]))
        assert r.status_code == 200
        data = r.json()
        for k in ("total_members", "total_songs", "upcoming_scales", "total_announcements"):
            assert k in data
            assert isinstance(data[k], int)


# ============= Multi-tenant Isolation =============
class TestMultiTenantIsolation:
    def test_leader_b_cannot_see_leader_a_songs(self, s, leader_a, leader_b):
        # A creates a song
        r = s.post(
            f"{BASE_URL}/songs",
            json={"title": f"TEST Isolation {SUFFIX}", "key": "D"},
            headers=auth(leader_a["token"]),
        )
        assert r.status_code == 200
        a_song_id = r.json()["id"]

        # B lists songs - should not include A's
        r = s.get(f"{BASE_URL}/songs", headers=auth(leader_b["token"]))
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert a_song_id not in ids

        # B tries to GET A's song directly - 404
        r = s.get(f"{BASE_URL}/songs/{a_song_id}", headers=auth(leader_b["token"]))
        assert r.status_code == 404

        # B tries to DELETE A's song - 404
        r = s.delete(f"{BASE_URL}/songs/{a_song_id}", headers=auth(leader_b["token"]))
        assert r.status_code == 404

    def test_members_list_isolated(self, s, leader_a, leader_b):
        r = s.get(f"{BASE_URL}/ministry/members", headers=auth(leader_b["token"]))
        assert r.status_code == 200
        emails = [m["email"] for m in r.json()]
        assert leader_a["email"] not in emails


# ============= Auth Required =============
class TestAuthRequired:
    @pytest.mark.parametrize("path", [
        "/auth/me", "/ministry", "/ministry/members", "/songs", "/scales",
        "/announcements", "/stats",
    ])
    def test_protected_routes_401(self, s, path):
        r = s.get(f"{BASE_URL}{path}")
        assert r.status_code == 401
