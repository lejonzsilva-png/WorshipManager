"""Backend tests for the permission system (leader/member roles + edit_* perms).

Covers all points listed in the review_request:
  - signup creates leader with all 3 perms via to_public_user
  - signup with invite_code creates member with permissions=[]
  - GET /auth/me exposes permissions field
  - 403 for members without perms on POST/PUT/DELETE songs|scales|announcements
  - 200 for members granted the specific perm
  - announcement author can delete own; not other's
  - non-leader cannot PUT /ministry/members/{id} nor rotate api-key
  - leader can promote/demote, set permissions, last-leader protection,
    invalid perm names, self-demotion when another leader exists.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "EXTERNAL_API_BASE",
    "https://escala-louvor.preview.emergentagent.com",
).rstrip("/") + "/api"

SUFFIX = uuid.uuid4().hex[:8]
PERMS = {"edit_scales", "edit_songs", "edit_announcements"}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ============= Shared fixtures =============
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def leader(s):
    """Leader who creates a new ministry."""
    payload = {
        "name": f"TEST Perm Leader {SUFFIX}",
        "email": f"test_perm_leader_{SUFFIX}@louvor.app",
        "password": "secret123",
        "ministry_name": f"TEST Perm Ministry {SUFFIX}",
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email_used"] = payload["email"]
    return data


@pytest.fixture(scope="module")
def member(s, leader):
    """Member joining via invite_code -> permissions=[]."""
    payload = {
        "name": f"TEST Perm Member {SUFFIX}",
        "email": f"test_perm_member_{SUFFIX}@louvor.app",
        "password": "secret123",
        "invite_code": leader["ministry"]["invite_code"],
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    data["email_used"] = payload["email"]
    return data


@pytest.fixture(scope="module")
def member2(s, leader):
    """Second member for various flows (author/delete tests, promotion)."""
    payload = {
        "name": f"TEST Perm Member2 {SUFFIX}",
        "email": f"test_perm_member2_{SUFFIX}@louvor.app",
        "password": "secret123",
        "invite_code": leader["ministry"]["invite_code"],
    }
    r = s.post(f"{BASE_URL}/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    data["password"] = payload["password"]
    return data


# ============= Signup / role / permissions exposure =============
class TestSignupRolesPermissions:
    def test_leader_signup_has_all_perms(self, leader):
        u = leader["user"]
        assert u["role"] == "leader"
        assert set(u.get("permissions", [])) == PERMS, u

    def test_member_signup_has_empty_perms(self, member):
        u = member["user"]
        assert u["role"] == "member"
        assert u.get("permissions") == []

    def test_me_exposes_permissions_field(self, s, leader, member):
        r = s.get(f"{BASE_URL}/auth/me", headers=auth(leader["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "permissions" in body
        assert set(body["permissions"]) == PERMS

        r = s.get(f"{BASE_URL}/auth/me", headers=auth(member["token"]))
        assert r.status_code == 200
        body = r.json()
        assert "permissions" in body
        assert body["permissions"] == []


# ============= Member WITHOUT perms => 403 on write ops =============
class TestMemberWithoutPermsBlocked:
    @pytest.fixture(scope="class")
    def leader_song(self, s, leader):
        # Pre-create a song & scale & announcement (as leader) so the member can attempt PUT/DELETE on them
        r = s.post(
            f"{BASE_URL}/songs",
            json={"title": f"TEST Perm Song {SUFFIX}", "key": "G", "bpm": 80},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        return r.json()

    @pytest.fixture(scope="class")
    def leader_scale(self, s, leader):
        r = s.post(
            f"{BASE_URL}/scales",
            json={
                "title": f"TEST Perm Scale {SUFFIX}",
                "date": "2026-12-31",
                "song_ids": [],
                "assignments": [],
            },
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        return r.json()

    @pytest.fixture(scope="class")
    def leader_announcement(self, s, leader):
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": f"TEST Perm Ann {SUFFIX}", "message": "Bloqueado p/ member"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        return r.json()

    def test_member_post_song_forbidden(self, s, member):
        r = s.post(
            f"{BASE_URL}/songs",
            json={"title": "TEST NoPerm Song"},
            headers=auth(member["token"]),
        )
        assert r.status_code == 403, r.text

    def test_member_post_scale_forbidden(self, s, member):
        r = s.post(
            f"{BASE_URL}/scales",
            json={"title": "TEST NoPerm Scale", "date": "2026-12-30", "song_ids": [], "assignments": []},
            headers=auth(member["token"]),
        )
        assert r.status_code == 403

    def test_member_post_announcement_forbidden(self, s, member):
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST NoPerm Ann", "message": "blocked"},
            headers=auth(member["token"]),
        )
        assert r.status_code == 403

    def test_member_delete_song_forbidden(self, s, member, leader_song):
        r = s.delete(f"{BASE_URL}/songs/{leader_song['id']}", headers=auth(member["token"]))
        assert r.status_code == 403

    def test_member_put_scale_forbidden(self, s, member, leader_scale):
        r = s.put(
            f"{BASE_URL}/scales/{leader_scale['id']}",
            json={
                "title": "TEST Hack", "date": "2026-12-31",
                "song_ids": [], "assignments": [],
            },
            headers=auth(member["token"]),
        )
        assert r.status_code == 403


# ============= Leader admin (PUT /ministry/members/{id}) =============
class TestLeaderMemberAdmin:
    def test_member_cannot_update_other_member(self, s, member, member2):
        # member tries to alter member2 - should be 403 even if they had perms
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"permissions": ["edit_songs"]},
            headers=auth(member["token"]),
        )
        assert r.status_code == 403

    def test_member_cannot_rotate_api_key(self, s, member):
        r = s.post(f"{BASE_URL}/ministry/api-key/rotate", headers=auth(member["token"]))
        assert r.status_code == 403

    def test_leader_grants_edit_songs(self, s, leader, member):
        r = s.put(
            f"{BASE_URL}/ministry/members/{member['user']['id']}",
            json={"permissions": ["edit_songs"]},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["permissions"] == ["edit_songs"]
        assert body["role"] == "member"

    def test_invalid_permission_name_400(self, s, leader, member):
        r = s.put(
            f"{BASE_URL}/ministry/members/{member['user']['id']}",
            json={"permissions": ["edit_songs", "delete_universe"]},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 400
        assert "Permiss" in r.text or "invalid" in r.text.lower()

    def test_member_with_edit_songs_can_post_song(self, s, leader, member):
        # Re-issue token (in case state changed) - use original token; perms checked on the user doc
        r = s.post(
            f"{BASE_URL}/songs",
            json={"title": f"TEST Member-Song {SUFFIX}", "key": "C"},
            headers=auth(member["token"]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["title"] == f"TEST Member-Song {SUFFIX}"

    def test_leader_grants_edit_scales(self, s, leader, member):
        r = s.put(
            f"{BASE_URL}/ministry/members/{member['user']['id']}",
            json={"permissions": ["edit_scales"]},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        assert set(r.json()["permissions"]) == {"edit_scales"}

    def test_member_with_edit_scales_can_put_scale(self, s, leader, member):
        # Create a scale as leader, then member updates it
        r = s.post(
            f"{BASE_URL}/scales",
            json={"title": "TEST Member-Scale base", "date": "2026-11-30", "song_ids": [], "assignments": []},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        sid = r.json()["id"]
        r = s.put(
            f"{BASE_URL}/scales/{sid}",
            json={"title": "TEST Member-Scale updated", "date": "2026-11-30",
                  "song_ids": [], "assignments": []},
            headers=auth(member["token"]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["title"] == "TEST Member-Scale updated"

    def test_leader_grants_edit_announcements(self, s, leader, member):
        r = s.put(
            f"{BASE_URL}/ministry/members/{member['user']['id']}",
            json={"permissions": ["edit_announcements"]},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        assert r.json()["permissions"] == ["edit_announcements"]

    def test_member_with_edit_announcements_can_post(self, s, member):
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST Member-Ann", "message": "ok"},
            headers=auth(member["token"]),
        )
        assert r.status_code == 200, r.text


# ============= Announcement author-can-delete-own =============
class TestAnnouncementAuthorDelete:
    def test_author_without_perm_can_delete_own(self, s, leader, member, member2):
        # Reset member2 perms to []
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"permissions": []},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        # Temporarily grant member2 edit_announcements so they can create
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"permissions": ["edit_announcements"]},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        # member2 creates their own announcement
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST Own", "message": "mine"},
            headers=auth(member2["token"]),
        )
        assert r.status_code == 200
        own_id = r.json()["id"]
        # Revoke perm
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"permissions": []},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        # Author (now without perm) still deletes own
        r = s.delete(f"{BASE_URL}/announcements/{own_id}", headers=auth(member2["token"]))
        assert r.status_code == 200, r.text

    def test_non_author_without_perm_cannot_delete(self, s, leader, member, member2):
        # Leader creates an announcement; member2 (no edit_announcements) tries to delete
        r = s.post(
            f"{BASE_URL}/announcements",
            json={"title": "TEST OtherAuthor", "message": "leader's"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        ann_id = r.json()["id"]
        # Ensure member2 has no perms
        s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"permissions": []},
            headers=auth(leader["token"]),
        )
        r = s.delete(f"{BASE_URL}/announcements/{ann_id}", headers=auth(member2["token"]))
        assert r.status_code == 403, r.text


# ============= Promotion / Demotion =============
class TestPromotionDemotion:
    def test_leader_promotes_member_to_leader(self, s, leader, member2):
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"role": "leader"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["role"] == "leader"
        # Promoted member must expose all perms via to_public_user
        assert set(body["permissions"]) == PERMS

        # Sanity: /auth/me from member2 now returns leader
        r = s.get(f"{BASE_URL}/auth/me", headers=auth(member2["token"]))
        assert r.status_code == 200
        assert r.json()["role"] == "leader"
        assert set(r.json()["permissions"]) == PERMS

    def test_single_leader_cannot_self_demote(self, s, leader, member2):
        """First demote member2 back to member, then leader (last one) should fail self-demote."""
        # member2 (now leader) demotes themselves while another leader still exists -> allowed
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"role": "member"},
            headers=auth(member2["token"]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "member"

        # Now `leader` is the only leader; self-demote must fail with 400
        r = s.put(
            f"{BASE_URL}/ministry/members/{leader['user']['id']}",
            json={"role": "member"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 400, r.text
        assert "líder" in r.text.lower() or "leader" in r.text.lower()

    def test_leader_can_self_demote_when_another_leader_exists(self, s, leader, member2):
        # Promote member2 to leader so we have 2 leaders
        r = s.put(
            f"{BASE_URL}/ministry/members/{member2['user']['id']}",
            json={"role": "leader"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200
        # Now `leader` self-demotes (member2 is the other leader)
        r = s.put(
            f"{BASE_URL}/ministry/members/{leader['user']['id']}",
            json={"role": "member"},
            headers=auth(leader["token"]),
        )
        assert r.status_code == 200, r.text
        assert r.json()["role"] == "member"
        # Restore leadership for any further tests
        r = s.put(
            f"{BASE_URL}/ministry/members/{leader['user']['id']}",
            json={"role": "leader"},
            headers=auth(member2["token"]),
        )
        assert r.status_code == 200


# ============= Regression - core flows still work =============
class TestRegression:
    def test_login_demo_still_works(self, s):
        r = s.post(f"{BASE_URL}/auth/login", json={"email": "demo@louvor.app", "password": "demo123"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "leader"
        assert set(body["user"]["permissions"]) == PERMS

    def test_external_api_still_works(self, s, leader):
        # fetch api key
        r = s.get(f"{BASE_URL}/ministry", headers=auth(leader["token"]))
        assert r.status_code == 200
        api_key = r.json().get("api_key")
        assert api_key
        base = BASE_URL.rsplit("/api", 1)[0]
        r = s.get(f"{base}/api/external/ministry", headers={"X-API-Key": api_key})
        assert r.status_code == 200
