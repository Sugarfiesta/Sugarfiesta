"""Sugar backend tests: auth, profile verify, WebSocket matching."""
import os
import time
import uuid
import base64
import json
import asyncio

import pytest
import requests
import websockets

# Load frontend .env explicitly (public URL used by the app)
FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(FRONTEND_ENV):
    with open(FRONTEND_ENV) as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                os.environ["EXPO_PUBLIC_BACKEND_URL"] = line.split("=", 1)[1].strip().strip('"')

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("http://", "ws://").replace("https://", "wss://") + "/api/ws"


def _uniq(prefix="test"):
    return f"test.{prefix}.{uuid.uuid4().hex[:8]}@example.com"


# ---------- Auth: signup ----------
class TestSignup:
    def test_signup_success(self):
        email = _uniq("signup")
        r = requests.post(f"{API}/auth/signup", json={
            "email": email, "password": "secret123", "name": "Alice T", "gender": "female",
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and isinstance(data["token"], str)
        assert data["user"]["email"] == email.lower()
        assert data["user"]["name"] == "Alice T"
        assert data["user"]["gender"] == "female"
        assert data["user"]["verified"] is False
        assert data["user"]["has_selfie"] is False
        # verify persistence via /me
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert me.status_code == 200
        assert me.json()["id"] == data["user"]["id"]

    def test_signup_duplicate_email_409(self):
        email = _uniq("dup")
        p = {"email": email, "password": "secret123", "name": "Dup", "gender": "male"}
        r1 = requests.post(f"{API}/auth/signup", json=p, timeout=10)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/auth/signup", json=p, timeout=10)
        assert r2.status_code == 409, r2.text

    def test_signup_short_password_400(self):
        r = requests.post(f"{API}/auth/signup", json={
            "email": _uniq("short"), "password": "abc", "name": "S", "gender": "other"
        }, timeout=10)
        assert r.status_code == 400, r.text


# ---------- Auth: login ----------
class TestLogin:
    def test_login_success_and_invalid(self):
        # seeded user
        r = requests.post(f"{API}/auth/login", json={"email": "lisa@sugar.app", "password": "secret123"}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["email"] == "lisa@sugar.app"
        assert data["user"]["verified"] is True

        r2 = requests.post(f"{API}/auth/login", json={"email": "lisa@sugar.app", "password": "wrongpass"}, timeout=10)
        assert r2.status_code == 401


# ---------- /auth/me ----------
class TestMe:
    def test_me_missing_token(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"}, timeout=10)
        assert r.status_code == 401


# ---------- Profile verify ----------
class TestVerify:
    def _new_user(self):
        email = _uniq("verify")
        r = requests.post(f"{API}/auth/signup", json={
            "email": email, "password": "secret123", "name": "Verif", "gender": "female"
        }, timeout=10)
        assert r.status_code == 200
        return r.json()["token"]

    def test_verify_sets_flags(self):
        token = self._new_user()
        # 200+ base64 chars
        b64 = base64.b64encode(b"x" * 500).decode()
        selfie = f"data:image/jpeg;base64,{b64}"
        r = requests.post(f"{API}/profile/verify", json={"selfie": selfie},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["verified"] is True
        assert u["has_selfie"] is True
        # persistence via /me
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10).json()
        assert me["verified"] is True and me["has_selfie"] is True

    def test_verify_short_selfie_400(self):
        token = self._new_user()
        r = requests.post(f"{API}/profile/verify", json={"selfie": "data:image/jpeg;base64,short"},
                          headers={"Authorization": f"Bearer {token}"}, timeout=10)
        assert r.status_code == 400


# ---------- WebSocket matching ----------
def _get_token(email, password="secret123"):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _signup_get_token(prefix):
    email = _uniq(prefix)
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": "secret123", "name": prefix.title(), "gender": "female"
    }, timeout=10)
    assert r.status_code == 200
    return r.json()["token"]


async def _recv(ws, timeout=6.0):
    return json.loads(await asyncio.wait_for(ws.recv(), timeout=timeout))


@pytest.mark.asyncio
async def test_ws_bot_fallback():
    token = _get_token("lisa@sugar.app")
    async with websockets.connect(f"{WS_BASE}?token={token}") as ws:
        await ws.send(json.dumps({"type": "find"}))
        m1 = await _recv(ws)
        assert m1["type"] == "searching"
        # bot after ~4s
        m2 = await _recv(ws, timeout=8.0)
        assert m2["type"] == "matched"
        assert m2["partner"]["is_bot"] is True
        assert "name" in m2["partner"]


@pytest.mark.asyncio
async def test_ws_invalid_token_closes():
    with pytest.raises(Exception):
        async with websockets.connect(f"{WS_BASE}?token=bad") as ws:
            await asyncio.wait_for(ws.recv(), timeout=5)


@pytest.mark.asyncio
async def test_ws_stop_teardown():
    token = _signup_get_token("stop")
    async with websockets.connect(f"{WS_BASE}?token={token}") as ws:
        await ws.send(json.dumps({"type": "find"}))
        assert (await _recv(ws))["type"] == "searching"
        # matched (bot) or partner - wait
        m = await _recv(ws, timeout=8.0)
        assert m["type"] == "matched"
        await ws.send(json.dumps({"type": "stop"}))
        m2 = await _recv(ws, timeout=5.0)
        assert m2["type"] == "stopped"


@pytest.mark.asyncio
async def test_ws_real_pair_and_next():
    # Two users connect and both send find within 4s -> real match
    t1 = _signup_get_token("pairA")
    t2 = _signup_get_token("pairB")
    async with websockets.connect(f"{WS_BASE}?token={t1}") as ws1, \
               websockets.connect(f"{WS_BASE}?token={t2}") as ws2:
        await ws1.send(json.dumps({"type": "find"}))
        assert (await _recv(ws1))["type"] == "searching"
        # Immediately send find for user2 before bot timer expires
        await ws2.send(json.dumps({"type": "find"}))
        # user2 gets searching then matched
        s2 = await _recv(ws2)
        assert s2["type"] == "searching"
        m2 = await _recv(ws2, timeout=5)
        assert m2["type"] == "matched"
        assert m2["partner"]["is_bot"] is False
        # user1 receives matched
        m1 = await _recv(ws1, timeout=5)
        assert m1["type"] == "matched"
        assert m1["partner"]["is_bot"] is False

        # user1 sends next -> partner (user2) gets partner_left
        await ws1.send(json.dumps({"type": "next"}))
        pl = await _recv(ws2, timeout=5)
        assert pl["type"] == "partner_left"
        # user2 gets searching then re-matches (bot fallback or waiting)
        s2b = await _recv(ws2, timeout=6)
        assert s2b["type"] == "searching"
        # user1 sees searching after next
        s1 = await _recv(ws1, timeout=5)
        assert s1["type"] == "searching"
