"""Backend tests for Sugar new feature expansion: discover, swipe, matches, DM, subscription, paywall."""
import os
import json
import uuid
import asyncio
import base64

import pytest
import requests
import websockets

FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(FRONTEND_ENV):
    with open(FRONTEND_ENV) as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                os.environ["EXPO_PUBLIC_BACKEND_URL"] = line.split("=", 1)[1].strip().strip('"')

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("http://", "ws://").replace("https://", "wss://") + "/api/ws"


def _login(email="lisa@sugar.app", password="secret123"):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def _new_user(prefix="feat", gender="female"):
    email = f"test.{prefix}.{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "secret123", "name": prefix.title(), "gender": gender
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


# ------------------- Subscription -------------------
class TestSubscription:
    def test_get_subscription_returns_tiers(self):
        tok, _ = _login()
        r = requests.get(f"{API}/subscription", headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "tier" in data and "tiers" in data
        tiers = data["tiers"]
        assert len(tiers) == 4
        ids = [t["id"] for t in tiers]
        assert ids == ["free", "plus", "gold", "vip"]
        prices = {t["id"]: t["price"] for t in tiers}
        assert prices["free"] == 0.0
        assert prices["plus"] == 4.99
        assert prices["gold"] == 7.99
        assert prices["vip"] == 15.99

    def test_subscribe_and_reset(self):
        tok, _ = _new_user("sub")
        # subscribe to plus
        r = requests.post(f"{API}/subscription", json={"tier": "plus"}, headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["tier"] == "plus"
        assert r.json()["tier_until"] is not None
        # verify persisted
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["tier"] == "plus"
        # invalid tier
        rbad = requests.post(f"{API}/subscription", json={"tier": "platinum"}, headers=_headers(tok), timeout=10)
        assert rbad.status_code == 400
        # reset to free
        rf = requests.post(f"{API}/subscription", json={"tier": "free"}, headers=_headers(tok), timeout=10)
        assert rf.status_code == 200
        assert rf.json()["tier"] == "free"
        assert rf.json()["tier_until"] is None


# ------------------- Discover -------------------
class TestDiscover:
    def test_discover_free_has_demo_cards_and_no_filter(self):
        tok, _ = _login()
        # ensure free tier for baseline
        requests.post(f"{API}/subscription", json={"tier": "free"}, headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["can_filter"] is False
        cards = data["cards"]
        assert isinstance(cards, list)
        # lisa preference is male -> should include only male demos
        demo_cards = [c for c in cards if c["id"].startswith("demo-")]
        assert len(demo_cards) > 0
        for c in demo_cards:
            assert c["gender"] == "male"
            assert "photo" in c and c["photo"]
            assert "name" in c and "age" in c and "country" in c and "bio" in c

    def test_discover_gold_can_filter_by_country(self):
        tok, _ = _login()
        requests.post(f"{API}/subscription", json={"tier": "gold"}, headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover?country=IT", headers=_headers(tok), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["can_filter"] is True
        for c in data["cards"]:
            assert c["country"].upper() == "IT"
        # reset
        requests.post(f"{API}/subscription", json={"tier": "free"}, headers=_headers(tok), timeout=10)

    def test_discover_free_ignores_country_param(self):
        tok, _ = _login()
        requests.post(f"{API}/subscription", json={"tier": "free"}, headers=_headers(tok), timeout=10)
        r = requests.get(f"{API}/discover?country=IT", headers=_headers(tok), timeout=15)
        data = r.json()
        assert data["can_filter"] is False
        # should still return non-IT demos (male pref)
        countries = {c["country"] for c in data["cards"] if c["id"].startswith("demo-")}
        assert len(countries) >= 1


# ------------------- Swipe / Match -------------------
class TestSwipeMatch:
    def test_like_demo_always_matches(self):
        tok, _ = _new_user("swipe", gender="female")
        # set preference to male so demos are visible (default is everyone though)
        r = requests.post(f"{API}/swipe", json={"target_id": "demo-2", "action": "like"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["matched"] is True
        assert "match" in data
        m = data["match"]
        assert "id" in m
        assert "partner" in m
        assert m["partner"]["id"] == "demo-2"
        assert m["partner"]["name"] == "Marco"
        assert m["partner"].get("photo")

    def test_heart_demo_also_matches(self):
        tok, _ = _new_user("heart", gender="female")
        r = requests.post(f"{API}/swipe", json={"target_id": "demo-4", "action": "heart"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["matched"] is True
        assert d["match"]["partner"]["id"] == "demo-4"

    def test_pass_does_not_match(self):
        tok, _ = _new_user("pass", gender="female")
        r = requests.post(f"{API}/swipe", json={"target_id": "demo-6", "action": "pass"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 200
        assert r.json()["matched"] is False

    def test_invalid_action(self):
        tok, _ = _new_user("badact")
        r = requests.post(f"{API}/swipe", json={"target_id": "demo-1", "action": "wink"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400


# ------------------- Matches list + DM -------------------
class TestMatchesAndDM:
    def test_list_matches_and_send_dm_with_bot_reply(self):
        tok, _ = _new_user("dm", gender="female")
        s = requests.post(f"{API}/swipe", json={"target_id": "demo-8", "action": "like"},
                          headers=_headers(tok), timeout=10)
        assert s.status_code == 200
        match_id = s.json()["match"]["id"]

        # list matches
        lm = requests.get(f"{API}/matches", headers=_headers(tok), timeout=10)
        assert lm.status_code == 200
        ids = [m["id"] for m in lm.json()["matches"]]
        assert match_id in ids
        found = next(m for m in lm.json()["matches"] if m["id"] == match_id)
        assert found["partner"]["name"] == "Leon"

        # match detail (empty initially)
        d = requests.get(f"{API}/matches/{match_id}", headers=_headers(tok), timeout=10)
        assert d.status_code == 200
        assert d.json()["messages"] == []

        # send message -> demo auto-reply
        msg = requests.post(f"{API}/matches/{match_id}/messages", json={"text": "Hallo Leon!"},
                            headers=_headers(tok), timeout=15)
        assert msg.status_code == 200, msg.text
        body = msg.json()
        assert body["message"]["text"] == "Hallo Leon!"
        assert body["reply"] is not None
        assert body["reply"]["sender"] == "demo-8"

        # persisted in detail
        d2 = requests.get(f"{API}/matches/{match_id}", headers=_headers(tok), timeout=10)
        msgs = d2.json()["messages"]
        assert len(msgs) == 2
        texts = [m["text"] for m in msgs]
        assert "Hallo Leon!" in texts

    def test_match_detail_404(self):
        tok, _ = _new_user("nomatch")
        r = requests.get(f"{API}/matches/nonexistent-id", headers=_headers(tok), timeout=10)
        assert r.status_code == 404

    def test_send_empty_message_400(self):
        tok, _ = _new_user("empty")
        s = requests.post(f"{API}/swipe", json={"target_id": "demo-2", "action": "like"},
                          headers=_headers(tok), timeout=10)
        mid = s.json()["match"]["id"]
        r = requests.post(f"{API}/matches/{mid}/messages", json={"text": "   "},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400


# ------------------- WebSocket paywall -------------------
@pytest.mark.asyncio
async def test_ws_free_tier_gets_paywall_on_find():
    tok, _ = _new_user("pw")
    # user is free tier by default
    async with websockets.connect(f"{WS_BASE}?token={tok}") as ws:
        await ws.send(json.dumps({"type": "find"}))
        raw = await asyncio.wait_for(ws.recv(), timeout=5)
        msg = json.loads(raw)
        assert msg["type"] == "paywall"


@pytest.mark.asyncio
async def test_ws_plus_tier_can_find():
    tok, _ = _new_user("pluswf")
    # upgrade to plus
    r = requests.post(f"{API}/subscription", json={"tier": "plus"}, headers=_headers(tok), timeout=10)
    assert r.status_code == 200
    async with websockets.connect(f"{WS_BASE}?token={tok}") as ws:
        await ws.send(json.dumps({"type": "find"}))
        raw = await asyncio.wait_for(ws.recv(), timeout=5)
        msg = json.loads(raw)
        assert msg["type"] == "searching"


# ------------------- Profile update -------------------
class TestProfileUpdate:
    def test_patch_profile_fields(self):
        tok, _ = _new_user("prof")
        payload = {"name": "Neu Name", "bio": "kurz", "age": 27, "country": "de",
                   "photos": ["https://example.com/a.jpg"]}
        r = requests.patch(f"{API}/profile", json=payload, headers=_headers(tok), timeout=10)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["name"] == "Neu Name"
        assert u["bio"] == "kurz"
        assert u["age"] == 27
        assert u["country"] == "DE"
        assert u["photos"] == ["https://example.com/a.jpg"]
