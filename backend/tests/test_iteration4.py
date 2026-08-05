"""Iteration 4 backend tests: optional profile fields (religion/hobby/job), stories, and regression."""
import os
import uuid
import base64

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


def _new_user(prefix="it4", gender="female"):
    email = f"test.{prefix}.{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "secret123", "name": prefix.title(), "gender": gender,
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


# 1x1 PNG then repeated to reach >100 chars for validity, but for stories/photo the LLM will judge.
# We'll build a bigger dummy JPEG-ish base64 (portrait-ish) using bytes-fill.
def _fake_image_data_uri(size_bytes=2048):
    raw = bytes([120] * size_bytes)
    b64 = base64.b64encode(raw).decode()
    return f"data:image/jpeg;base64,{b64}"


# ---------- Feature: Optional profile fields (religion/hobby/job) ----------
class TestOptionalProfileFields:
    def test_patch_and_persist_religion_hobby_job(self):
        tok, _ = _new_user("optf")
        payload = {"religion": "Atheist", "hobby": "Klettern", "job": "Ingenieur"}
        r = requests.patch(f"{API}/profile", json=payload, headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["religion"] == "Atheist"
        assert u["hobby"] == "Klettern"
        assert u["job"] == "Ingenieur"
        # GET /auth/me confirms persistence
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["religion"] == "Atheist"
        assert me["hobby"] == "Klettern"
        assert me["job"] == "Ingenieur"

    def test_clear_fields_via_empty_strings(self):
        tok, _ = _new_user("optc")
        # Set then clear (simulating Skip button which sends empty strings)
        requests.patch(f"{API}/profile", json={"religion": "X", "hobby": "Y", "job": "Z"},
                       headers=_headers(tok), timeout=10)
        r = requests.patch(f"{API}/profile", json={"religion": "", "hobby": "", "job": ""},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["religion"] == "" and u["hobby"] == "" and u["job"] == ""

    def test_optional_fields_truncated_to_60(self):
        tok, _ = _new_user("opttr")
        long = "a" * 200
        r = requests.patch(f"{API}/profile", json={"religion": long, "hobby": long, "job": long},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert len(u["religion"]) == 60
        assert len(u["hobby"]) == 60
        assert len(u["job"]) == 60

    def test_defaults_empty_on_new_user(self):
        tok, u = _new_user("optd")
        assert u.get("religion", "") == ""
        assert u.get("hobby", "") == ""
        assert u.get("job", "") == ""
        assert u.get("stories", []) == []


# ---------- Feature: Story ----------
class TestStory:
    def test_add_story_returns_ok_and_appends(self):
        tok, _ = _new_user("st")
        img = _fake_image_data_uri(2000)
        r = requests.post(f"{API}/profile/story", json={"photo": img},
                          headers=_headers(tok), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["explicit"] is False
        assert "user" in body
        stories = body["user"]["stories"]
        assert isinstance(stories, list)
        assert len(stories) == 1
        # persistence via /auth/me
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert len(me["stories"]) == 1

    def test_add_story_invalid_short(self):
        tok, _ = _new_user("stshort")
        r = requests.post(f"{API}/profile/story", json={"photo": "abc"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400

    def test_story_cap_10(self):
        tok, _ = _new_user("stcap")
        img = _fake_image_data_uri(500)
        for _ in range(12):
            r = requests.post(f"{API}/profile/story", json={"photo": img},
                              headers=_headers(tok), timeout=60)
            assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert len(me["stories"]) == 10


# ---------- Regression ----------
class TestRegression:
    def test_login_lisa_still_works(self):
        r = requests.post(f"{API}/auth/login", json={"email": "lisa@sugar.app", "password": "secret123"}, timeout=15)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == "lisa@sugar.app"
        assert u["verified"] is True

    def test_admin_login_still_works(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@sugar.app", "password": "admin1234"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["is_admin"] is True

    def test_profile_save_name_bio_age_country(self):
        tok, _ = _new_user("reg")
        r = requests.patch(f"{API}/profile", json={
            "name": "Anna", "bio": "Hallo Welt", "age": 25, "country": "de"
        }, headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        u = r.json()
        assert u["name"] == "Anna"
        assert u["age"] == 25
        assert u["country"] == "DE"

    def test_preference_still_works(self):
        tok, _ = _new_user("regpref")
        r = requests.patch(f"{API}/profile/preferences", json={"preference": "male"},
                           headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        assert r.json()["preference"] == "male"

    def test_public_user_shape_includes_new_fields(self):
        tok, _ = _new_user("regshape")
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        for k in ("religion", "hobby", "job", "stories"):
            assert k in me, f"missing key {k} in /auth/me response"
