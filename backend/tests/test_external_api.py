"""Backend tests for External API (X-API-Key) and api-key rotation.

Covers:
- GET /api/ministry returns api_key (backfill)
- POST /api/ministry/api-key/rotate (leader-only)
- /api/external/* endpoints with X-API-Key
- Multi-tenant isolation by API key
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get(
    "EXTERNAL_API_BASE",
    "https://worship-hub-100.preview.emergentagent.com/api",
)

SUFFIX = uuid.uuid4().hex[:8]


# ============= Fixtures =============
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _signup_leader(s, label: str):
    payload = {
        "name": f"TEST Leader {label} {SUFFIX}",
        "email": f"test_ext_{label.lower()}_{SUFFIX}@louvor.app",
        "password": "secret123",
        "ministry_name": f"TEST Ext Ministry {label} {SUFFIX}",
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email"] = payload["email"]
    return data


@pytest.fixture(scope="module")
def leader_a(s):
    return _signup_leader(s, "A")


@pytest.fixture(scope="module")
def leader_b(s):
    return _signup_leader(s, "B")


@pytest.fixture(scope="module")
def member_a(s, leader_a):
    invite = leader_a["ministry"]["invite_code"]
    payload = {
        "name": f"TEST Member A {SUFFIX}",
        "email": f"test_ext_member_a_{SUFFIX}@louvor.app",
        "password": "secret123",
        "invite_code": invite,
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email"] = payload["email"]
    return data


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _get_api_key(s, leader: dict) -> str:
    """Fetch current api_key via GET /ministry (will backfill if missing)."""
    r = s.get(f"{BASE_URL}/ministry", headers=auth(leader["token"]))
    assert r.status_code == 200, r.text
    body = r.json()
    assert "api_key" in body and body["api_key"], f"GET /ministry missing api_key: {body}"
    assert body["api_key"].startswith("lvr_"), f"api_key format invalid: {body['api_key']}"
    return body["api_key"]


# ============= GET /api/ministry returns api_key (with backfill) =============
class TestMinistryApiKeyField:
    def test_get_ministry_returns_api_key(self, s, leader_a):
        key = _get_api_key(s, leader_a)
        assert key.startswith("lvr_")
        assert len(key) > 10

    def test_get_ministry_api_key_stable_across_calls(self, s, leader_a):
        k1 = _get_api_key(s, leader_a)
        k2 = _get_api_key(s, leader_a)
        assert k1 == k2, "api_key should not change between GET /ministry calls"


# ============= Rotation endpoint =============
class TestRotateApiKey:
    def test_rotate_requires_jwt(self, s):
        r = s.post(f"{BASE_URL}/ministry/api-key/rotate")
        assert r.status_code == 401

    def test_rotate_member_forbidden(self, s, member_a):
        r = s.post(f"{BASE_URL}/ministry/api-key/rotate", headers=auth(member_a["token"]))
        assert r.status_code == 403

    def test_rotate_leader_returns_new_key_and_invalidates_old(self, s, leader_a):
        old_key = _get_api_key(s, leader_a)

        # Old key works on external endpoint
        r0 = s.get(f"{BASE_URL}/external/ministry", headers={"X-API-Key": old_key})
        assert r0.status_code == 200

        # Rotate
        r = s.post(f"{BASE_URL}/ministry/api-key/rotate", headers=auth(leader_a["token"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "api_key" in body
        new_key = body["api_key"]
        assert new_key.startswith("lvr_")
        assert new_key != old_key

        # GET /ministry now returns the new key
        r2 = s.get(f"{BASE_URL}/ministry", headers=auth(leader_a["token"]))
        assert r2.status_code == 200
        assert r2.json()["api_key"] == new_key

        # Old key must NOT work anymore
        r3 = s.get(f"{BASE_URL}/external/ministry", headers={"X-API-Key": old_key})
        assert r3.status_code == 401, f"Old key should be invalid, got {r3.status_code}: {r3.text}"

        # New key works
        r4 = s.get(f"{BASE_URL}/external/ministry", headers={"X-API-Key": new_key})
        assert r4.status_code == 200


# ============= External /ministry endpoint =============
class TestExternalMinistry:
    def test_missing_header_returns_401(self, s):
        r = s.get(f"{BASE_URL}/external/ministry")
        assert r.status_code == 401
        assert "Missing X-API-Key" in r.text or "Missing X-API-Key header" in r.json().get("detail", "")

    def test_invalid_key_returns_401(self, s):
        r = s.get(f"{BASE_URL}/external/ministry", headers={"X-API-Key": "lvr_invalid_xxxx"})
        assert r.status_code == 401
        assert "Invalid API key" in r.json().get("detail", "")

    def test_valid_key_returns_id_and_name(self, s, leader_b):
        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/ministry", headers={"X-API-Key": key})
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == leader_b["ministry"]["id"]
        assert body["name"] == leader_b["ministry"]["name"]


# ============= External /songs endpoint =============
class TestExternalSongs:
    def test_songs_with_bpm_and_key(self, s, leader_b):
        h = auth(leader_b["token"])
        # Seed two songs
        s.post(f"{BASE_URL}/songs", json={
            "title": f"TEST Ext Song 1 {SUFFIX}", "key": "G", "bpm": 80,
            "youtube_url": "https://youtu.be/abc",
        }, headers=h)
        s.post(f"{BASE_URL}/songs", json={
            "title": f"TEST Ext Song 2 {SUFFIX}", "key": "D", "bpm": 120,
            "youtube_url": "https://youtu.be/def",
        }, headers=h)

        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/songs", headers={"X-API-Key": key})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ministry_id"] == leader_b["ministry"]["id"]
        assert isinstance(body["count"], int) and body["count"] >= 2
        assert isinstance(body["songs"], list)
        # Each song has expected fields
        sample = body["songs"][0]
        for k in ("id", "title", "key", "bpm", "youtube_url"):
            assert k in sample, f"Missing field {k} in external song: {sample}"

    def test_songs_missing_header_401(self, s):
        r = s.get(f"{BASE_URL}/external/songs")
        assert r.status_code == 401


# ============= External /scales endpoint =============
class TestExternalScales:
    @pytest.fixture(scope="class")
    def seeded(self, s, leader_b):
        """Create 3 songs and 3 scales (1 past, 2 future) for leader_b."""
        h = auth(leader_b["token"])
        song_ids = []
        for i, (title, k, bpm) in enumerate([
            (f"TEST SCALE-SONG A {SUFFIX}", "E", 70),
            (f"TEST SCALE-SONG B {SUFFIX}", "F", 90),
            (f"TEST SCALE-SONG C {SUFFIX}", "G", 110),
        ]):
            r = s.post(f"{BASE_URL}/songs", json={
                "title": title, "key": k, "bpm": bpm,
            }, headers=h)
            assert r.status_code == 200
            song_ids.append(r.json()["id"])

        today = datetime.now(timezone.utc).date()
        past_date = (today - timedelta(days=10)).isoformat()
        future_date_1 = (today + timedelta(days=5)).isoformat()
        future_date_2 = (today + timedelta(days=20)).isoformat()

        scales_created = []
        # Past scale - reversed order: C, A, B
        r = s.post(f"{BASE_URL}/scales", json={
            "title": f"TEST PAST Scale {SUFFIX}",
            "date": past_date,
            "song_ids": [song_ids[2], song_ids[0], song_ids[1]],
            "assignments": [],
        }, headers=h)
        assert r.status_code == 200
        scales_created.append(r.json())

        # Future scale 1: B, C
        r = s.post(f"{BASE_URL}/scales", json={
            "title": f"TEST FUTURE-1 Scale {SUFFIX}",
            "date": future_date_1,
            "song_ids": [song_ids[1], song_ids[2]],
            "assignments": [],
        }, headers=h)
        assert r.status_code == 200
        scales_created.append(r.json())

        # Future scale 2: A
        r = s.post(f"{BASE_URL}/scales", json={
            "title": f"TEST FUTURE-2 Scale {SUFFIX}",
            "date": future_date_2,
            "song_ids": [song_ids[0]],
            "assignments": [],
        }, headers=h)
        assert r.status_code == 200
        scales_created.append(r.json())

        return {
            "song_ids": song_ids,
            "scales": scales_created,
            "past_date": past_date,
            "future_dates": [future_date_1, future_date_2],
        }

    def test_scales_upcoming_true_returns_only_future(self, s, leader_b, seeded):
        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/scales?upcoming=true", headers={"X-API-Key": key})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ministry_id"] == leader_b["ministry"]["id"]
        # Past scale must NOT be present; future ones must be
        ids = [sc["id"] for sc in body["scales"]]
        assert seeded["scales"][0]["id"] not in ids, "Past scale leaked into upcoming=true"
        assert seeded["scales"][1]["id"] in ids
        assert seeded["scales"][2]["id"] in ids

    def test_scales_upcoming_false_returns_all(self, s, leader_b, seeded):
        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/scales?upcoming=false", headers={"X-API-Key": key})
        assert r.status_code == 200, r.text
        body = r.json()
        ids = [sc["id"] for sc in body["scales"]]
        for sc in seeded["scales"]:
            assert sc["id"] in ids, f"Scale {sc['id']} missing when upcoming=false"

    def test_scales_songs_hydrated_with_bpm_and_order(self, s, leader_b, seeded):
        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/scales?upcoming=false", headers={"X-API-Key": key})
        assert r.status_code == 200
        body = r.json()
        # Find past scale in response (order was C, A, B)
        past = next(sc for sc in body["scales"] if sc["id"] == seeded["scales"][0]["id"])
        assert len(past["songs"]) == 3
        # Verify order matches song_ids
        expected_order = [seeded["song_ids"][2], seeded["song_ids"][0], seeded["song_ids"][1]]
        assert [sg["id"] for sg in past["songs"]] == expected_order, \
            f"Order mismatch: got {[sg['id'] for sg in past['songs']]}, expected {expected_order}"
        # BPM present
        for sg in past["songs"]:
            assert "bpm" in sg
            assert sg["bpm"] is not None

    def test_scales_limit_param(self, s, leader_b, seeded):
        key = _get_api_key(s, leader_b)
        r = s.get(f"{BASE_URL}/external/scales?upcoming=false&limit=2", headers={"X-API-Key": key})
        assert r.status_code == 200
        body = r.json()
        assert len(body["scales"]) <= 2
        assert body["count"] == len(body["scales"])

    def test_scale_detail_returns_hydrated_setlist(self, s, leader_b, seeded):
        key = _get_api_key(s, leader_b)
        scale_id = seeded["scales"][1]["id"]  # future-1: B, C
        r = s.get(f"{BASE_URL}/external/scales/{scale_id}", headers={"X-API-Key": key})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"] == scale_id
        expected_order = [seeded["song_ids"][1], seeded["song_ids"][2]]
        assert [sg["id"] for sg in body["songs"]] == expected_order
        for sg in body["songs"]:
            assert "bpm" in sg and sg["bpm"] is not None
            assert "key" in sg

    def test_scale_detail_404_when_not_in_ministry(self, s, leader_a, leader_b, seeded):
        """Use leader_a's API key to try to fetch leader_b's scale -> 404."""
        key_a = _get_api_key(s, leader_a)
        scale_id_b = seeded["scales"][1]["id"]
        r = s.get(f"{BASE_URL}/external/scales/{scale_id_b}", headers={"X-API-Key": key_a})
        assert r.status_code == 404, f"Expected 404 cross-ministry, got {r.status_code}: {r.text}"


# ============= Multi-tenant isolation by API key =============
class TestExternalIsolation:
    def test_key_a_does_not_see_ministry_b_songs(self, s, leader_a, leader_b):
        # Ensure A has at least one song too
        s.post(f"{BASE_URL}/songs", json={
            "title": f"TEST ISO-A {SUFFIX}", "key": "C", "bpm": 60,
        }, headers=auth(leader_a["token"]))

        key_a = _get_api_key(s, leader_a)
        key_b = _get_api_key(s, leader_b)

        # external/songs A
        ra = s.get(f"{BASE_URL}/external/songs", headers={"X-API-Key": key_a})
        rb = s.get(f"{BASE_URL}/external/songs", headers={"X-API-Key": key_b})
        assert ra.status_code == 200 and rb.status_code == 200

        ids_a = {sg["id"] for sg in ra.json()["songs"]}
        ids_b = {sg["id"] for sg in rb.json()["songs"]}
        assert ids_a.isdisjoint(ids_b), \
            f"Song id leak between ministries: overlap={ids_a & ids_b}"

        # ministry_id field
        assert ra.json()["ministry_id"] == leader_a["ministry"]["id"]
        assert rb.json()["ministry_id"] == leader_b["ministry"]["id"]

    def test_key_a_does_not_see_ministry_b_scales(self, s, leader_a, leader_b):
        key_a = _get_api_key(s, leader_a)
        ra = s.get(f"{BASE_URL}/external/scales?upcoming=false", headers={"X-API-Key": key_a})
        assert ra.status_code == 200
        # All returned scales must belong to A (none of B's scales)
        # We can verify by checking ministry_id field
        assert ra.json()["ministry_id"] == leader_a["ministry"]["id"]


# ============= Regression: existing endpoints still work =============
class TestRegression:
    def test_demo_login_still_works(self, s):
        r = s.post(f"{BASE_URL}/auth/login", json={
            "email": "demo@louvor.app", "password": "demo123",
        })
        # Demo user might not exist in every env - skip if so
        if r.status_code != 200:
            pytest.skip(f"Demo account unavailable: {r.status_code}")
        body = r.json()
        assert "token" in body and "user" in body and "ministry" in body

    def test_protected_endpoints_still_require_auth(self, s):
        for path in ("/auth/me", "/ministry", "/songs", "/scales", "/announcements", "/stats"):
            r = s.get(f"{BASE_URL}{path}")
            assert r.status_code == 401, f"{path} should be 401, got {r.status_code}"

    def test_songs_crud_still_works(self, s, leader_a):
        h = auth(leader_a["token"])
        r = s.post(f"{BASE_URL}/songs", json={
            "title": f"TEST Regression Song {SUFFIX}", "key": "B", "bpm": 100,
        }, headers=h)
        assert r.status_code == 200
        sid = r.json()["id"]
        r = s.get(f"{BASE_URL}/songs/{sid}", headers=h)
        assert r.status_code == 200
        r = s.delete(f"{BASE_URL}/songs/{sid}", headers=h)
        assert r.status_code == 200

    def test_announcements_still_work(self, s, leader_a):
        h = auth(leader_a["token"])
        r = s.post(f"{BASE_URL}/announcements", json={
            "title": f"TEST Reg Ann {SUFFIX}", "message": "ok",
        }, headers=h)
        assert r.status_code == 200
        aid = r.json()["id"]
        r = s.delete(f"{BASE_URL}/announcements/{aid}", headers=h)
        assert r.status_code == 200
