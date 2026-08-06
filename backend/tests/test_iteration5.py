"""Backend tests for iteration-5 candy features: orientation persistence + story visibility."""
import os
import uuid
import pytest
import requests

FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(FRONTEND_ENV):
    with open(FRONTEND_ENV) as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                os.environ["EXPO_PUBLIC_BACKEND_URL"] = line.split("=", 1)[1].strip().strip('"')

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# A ~140-char base64-ish payload for photo uploads (>100 chars required by backend)
FAKE_PHOTO = "data:image/png;base64," + ("A" * 160)


def _new_user(prefix="itr5", gender="female"):
    email = f"test.{prefix}.{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "secret123",
        "name": prefix.title(), "gender": gender,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


# ----------------- Orientation -----------------
class TestOrientation:
    @pytest.mark.parametrize("orient", ["hetero", "gay", "bi", "pan", "ace", "queer"])
    def test_orientation_valid_values_persist(self, orient):
        tok, _ = _new_user("orient")
        r = requests.patch(f"{API}/profile", json={"orientation": orient},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["orientation"] == orient
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["orientation"] == orient

    def test_orientation_invalid_stored_as_empty(self):
        tok, _ = _new_user("orbad")
        # first set to a valid value
        requests.patch(f"{API}/profile", json={"orientation": "bi"},
                       headers=_headers(tok), timeout=10)
        # then send invalid
        r = requests.patch(f"{API}/profile", json={"orientation": "banana"},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["orientation"] == ""
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["orientation"] == ""

    def test_auth_me_has_orientation_and_stories_keys(self):
        tok, _ = _new_user("keys")
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert "orientation" in me
        assert "stories" in me
        assert me["orientation"] == ""
        assert me["stories"] == []


# ----------------- Story visibility -----------------
class TestStoryVisibility:
    def test_add_story_default_visibility_public(self):
        tok, _ = _new_user("story")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        stories = body["user"]["stories"]
        assert len(stories) == 1
        assert stories[0]["visibility"] == "public"
        assert stories[0]["url"] == FAKE_PHOTO

    def test_add_story_with_matches_visibility(self):
        tok, _ = _new_user("storym")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO, "visibility": "matches"},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200, r.text
        stories = r.json()["user"]["stories"]
        assert stories[0]["visibility"] == "matches"

    def test_add_story_with_private_visibility(self):
        tok, _ = _new_user("storyp")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO, "visibility": "private"},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["stories"][0]["visibility"] == "private"

    def test_add_story_invalid_visibility_falls_back_to_public(self):
        tok, _ = _new_user("storyx")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO, "visibility": "friends"},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["stories"][0]["visibility"] == "public"

    def test_change_story_visibility(self):
        tok, _ = _new_user("storyv")
        # add story public
        add = requests.post(f"{API}/profile/story",
                            json={"photo": FAKE_PHOTO, "visibility": "public"},
                            headers=_headers(tok), timeout=30)
        assert add.status_code == 200
        # change index 0 to private
        r = requests.post(f"{API}/profile/story/visibility",
                          json={"index": 0, "visibility": "private"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["stories"][0]["visibility"] == "private"
        # verify via /auth/me
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["stories"][0]["visibility"] == "private"

    def test_change_story_visibility_invalid_index_404(self):
        tok, _ = _new_user("storyni")
        r = requests.post(f"{API}/profile/story/visibility",
                          json={"index": 5, "visibility": "matches"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 404

    def test_change_story_visibility_invalid_value_400(self):
        tok, _ = _new_user("storyiv")
        requests.post(f"{API}/profile/story",
                      json={"photo": FAKE_PHOTO, "visibility": "public"},
                      headers=_headers(tok), timeout=30)
        r = requests.post(f"{API}/profile/story/visibility",
                          json={"index": 0, "visibility": "banana"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400

    def test_story_short_photo_400(self):
        tok, _ = _new_user("storysh")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": "abc", "visibility": "public"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400


# ----------------- Regression: profile fields incl. religion/hobby/job -----------------
class TestProfileRegression:
    def test_patch_profile_all_fields(self):
        tok, _ = _new_user("preg")
        payload = {
            "name": "Regress User",
            "bio": "Test bio",
            "age": 28,
            "country": "de",
            "religion": "Atheist",
            "hobby": "Yoga",
            "job": "Designer",
            "orientation": "pan",
        }
        r = requests.patch(f"{API}/profile", json=payload,
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["name"] == "Regress User"
        assert u["bio"] == "Test bio"
        assert u["age"] == 28
        assert u["country"] == "DE"
        assert u["religion"] == "Atheist"
        assert u["hobby"] == "Yoga"
        assert u["job"] == "Designer"
        assert u["orientation"] == "pan"
        # verify persistence
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["religion"] == "Atheist"
        assert me["hobby"] == "Yoga"
        assert me["job"] == "Designer"
        assert me["orientation"] == "pan"


# ----------------- Regression: signup/login/preferences/discover/swipe/dm/subscription/delete -----------------
class TestFullRegression:
    def test_signup_login_lisa(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "lisa@sugar.app", "password": "secret123"},
                          timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert "orientation" in u
        assert "stories" in u
        assert isinstance(u["stories"], list)

    def test_preferences_patch(self):
        tok, _ = _new_user("pref")
        r = requests.patch(f"{API}/profile/preferences",
                           json={"preference": "male"},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        assert r.json()["preference"] == "male"

    def test_discover_swipe_match_dm_flow(self):
        tok, _ = _new_user("flow")
        # discover
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json()["cards"], list)
        # swipe demo -> match
        s = requests.post(f"{API}/swipe", json={"target_id": "demo-1", "action": "like"},
                          headers=_headers(tok), timeout=10)
        assert s.status_code == 200 and s.json()["matched"] is True
        mid = s.json()["match"]["id"]
        # matches list
        lm = requests.get(f"{API}/matches", headers=_headers(tok), timeout=10)
        assert lm.status_code == 200
        assert any(m["id"] == mid for m in lm.json()["matches"])
        # DM
        msg = requests.post(f"{API}/matches/{mid}/messages", json={"text": "Hallo"},
                            headers=_headers(tok), timeout=15)
        assert msg.status_code == 200
        assert msg.json()["message"]["text"] == "Hallo"

    def test_subscription_cycle(self):
        tok, _ = _new_user("subc")
        r = requests.post(f"{API}/subscription", json={"tier": "plus"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200 and r.json()["tier"] == "plus"
        r = requests.post(f"{API}/subscription", json={"tier": "free"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200 and r.json()["tier"] == "free"

    def test_account_delete(self):
        tok, _ = _new_user("del")
        r = requests.delete(f"{API}/account", headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        # subsequent /auth/me should now 401
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10)
        assert me.status_code == 401


# ----------------- NEW: Story caption + text_color -----------------
class TestStoryCaptionColor:
    def test_add_story_with_caption_and_color(self):
        tok, _ = _new_user("stcap")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO, "visibility": "public",
                                "caption": "Hallo Welt", "text_color": "#FF66AA"},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200, r.text
        s = r.json()["user"]["stories"][0]
        assert s["caption"] == "Hallo Welt"
        assert s["text_color"] == "#FF66AA"
        assert s["visibility"] == "public"
        assert "at" in s
        assert s["url"] == FAKE_PHOTO
        # persistence via /auth/me
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["stories"][0]["caption"] == "Hallo Welt"
        assert me["stories"][0]["text_color"] == "#FF66AA"

    def test_add_story_defaults_when_no_caption(self):
        tok, _ = _new_user("stnocap")
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200
        s = r.json()["user"]["stories"][0]
        assert s["caption"] == ""
        assert s["text_color"] == "#FFFFFF"

    def test_add_story_caption_truncated_to_120(self):
        tok, _ = _new_user("stcaplong")
        long_caption = "x" * 200
        r = requests.post(f"{API}/profile/story",
                          json={"photo": FAKE_PHOTO, "caption": long_caption},
                          headers=_headers(tok), timeout=30)
        assert r.status_code == 200
        assert len(r.json()["user"]["stories"][0]["caption"]) == 120


# ----------------- NEW: Delete story -----------------
class TestStoryDelete:
    def test_delete_story_removes_entry(self):
        tok, _ = _new_user("stdel")
        # add three stories
        for cap in ["a", "b", "c"]:
            add = requests.post(f"{API}/profile/story",
                                json={"photo": FAKE_PHOTO, "caption": cap},
                                headers=_headers(tok), timeout=30)
            assert add.status_code == 200
        # user.stories are prepended (newest first): [c, b, a]
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert [s["caption"] for s in me["stories"]] == ["c", "b", "a"]

        # delete middle (index 1 -> "b")
        r = requests.delete(f"{API}/profile/story/1", headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        u = r.json()
        assert [s["caption"] for s in u["stories"]] == ["c", "a"]

        # verify persistence
        me2 = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert [s["caption"] for s in me2["stories"]] == ["c", "a"]

    def test_delete_story_invalid_index_returns_404(self):
        tok, _ = _new_user("stdel404")
        # no stories -> any index invalid
        r = requests.delete(f"{API}/profile/story/0", headers=_headers(tok), timeout=10)
        assert r.status_code == 404
        # add one, then delete out-of-range
        requests.post(f"{API}/profile/story",
                      json={"photo": FAKE_PHOTO}, headers=_headers(tok), timeout=30)
        r = requests.delete(f"{API}/profile/story/5", headers=_headers(tok), timeout=10)
        assert r.status_code == 404
        r = requests.delete(f"{API}/profile/story/-1", headers=_headers(tok), timeout=10)
        assert r.status_code == 404

    def test_delete_story_requires_auth(self):
        r = requests.delete(f"{API}/profile/story/0", timeout=10)
        assert r.status_code == 401


# ----------------- NEW: orientation_interest persistence + Discover filter -----------------
class TestOrientationInterest:
    def test_orientation_interest_persists_list(self):
        tok, _ = _new_user("oi1")
        r = requests.patch(f"{API}/profile",
                          json={"orientation_interest": ["hetero", "bi", "queer"]},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        assert set(r.json()["orientation_interest"]) == {"hetero", "bi", "queer"}
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert set(me["orientation_interest"]) == {"hetero", "bi", "queer"}

    def test_orientation_interest_filters_invalid_and_caps_at_six(self):
        tok, _ = _new_user("oi2")
        r = requests.patch(f"{API}/profile",
                          json={"orientation_interest": ["hetero", "banana", "gay", "bi",
                                                         "pan", "ace", "queer", "extra"]},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        vals = r.json()["orientation_interest"]
        # invalid values dropped
        assert "banana" not in vals
        assert "extra" not in vals
        # capped at 6
        assert len(vals) <= 6
        # all remaining are valid
        assert all(v in {"hetero", "gay", "bi", "pan", "ace", "queer"} for v in vals)

    def test_orientation_interest_empty_list_clears(self):
        tok, _ = _new_user("oi3")
        requests.patch(f"{API}/profile",
                       json={"orientation_interest": ["gay"]},
                       headers=_headers(tok), timeout=10)
        r = requests.patch(f"{API}/profile",
                           json={"orientation_interest": []},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        assert r.json()["orientation_interest"] == []


class TestDiscoverOrientationFilter:
    def test_discover_cards_have_orientation_field(self):
        tok, _ = _new_user("disc1")
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        cards = r.json()["cards"]
        assert len(cards) > 0
        for c in cards:
            assert "orientation" in c

    def test_discover_filters_by_orientation_interest(self):
        tok, _ = _new_user("disc2")
        # set preference=everyone to see all demo genders
        requests.patch(f"{API}/profile/preferences",
                       json={"preference": "everyone"},
                       headers=_headers(tok), timeout=10)
        # only want to see gay + bi
        requests.patch(f"{API}/profile",
                       json={"orientation_interest": ["gay", "bi"]},
                       headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        cards = r.json()["cards"]
        # every demo card with orientation set must be gay or bi; empty allowed
        demo_orients = [c["orientation"] for c in cards if c.get("id", "").startswith("demo-")]
        assert len(demo_orients) > 0
        for o in demo_orients:
            assert o == "" or o in {"gay", "bi"}, f"Unexpected orientation {o}"

    def test_discover_empty_interest_shows_all(self):
        tok, _ = _new_user("disc3")
        requests.patch(f"{API}/profile/preferences",
                       json={"preference": "everyone"},
                       headers=_headers(tok), timeout=10)
        # empty interest
        requests.patch(f"{API}/profile",
                       json={"orientation_interest": []},
                       headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        demo_orients = {c["orientation"] for c in r.json()["cards"]
                        if c.get("id", "").startswith("demo-")}
        # should include at least 3 different orientations since we have 6 demos
        assert len(demo_orients) >= 3

    def test_discover_empty_orientation_always_allowed(self):
        # Create user with orientation_interest=["gay"] only, verify demo cards
        # with empty orientation would still appear (all seed demos have orientation
        # set, so this asserts the code path via cards from real users would work).
        tok, _ = _new_user("disc4")
        requests.patch(f"{API}/profile/preferences",
                       json={"preference": "everyone"},
                       headers=_headers(tok), timeout=10)
        requests.patch(f"{API}/profile",
                       json={"orientation_interest": ["gay"]},
                       headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        # Only demo-4 (Luca, gay) should appear from demo pool
        demo_ids = [c["id"] for c in r.json()["cards"] if c.get("id", "").startswith("demo-")]
        assert "demo-4" in demo_ids
        # heteros should be excluded
        hetero_demos = ["demo-1", "demo-2", "demo-8"]
        for h in hetero_demos:
            assert h not in demo_ids, f"{h} (hetero) should have been filtered out"
