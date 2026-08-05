"""Backend tests for Sugar iteration 3 safety features:
- photo moderation (POST /api/profile/photo, /profile/verify)
- admin: GET /api/admin/reports, POST /api/admin/reports/{id}/resolve (dismiss|ban)
- report also blocks (reported user login 403 after ban)
- non-admin -> 403 on admin endpoints
Also runs a regression check on lisa login + subscription + swipe.
"""
import base64
import io
import os
import uuid

import pytest
import requests
from PIL import Image, ImageDraw

FRONTEND_ENV = "/app/frontend/.env"
if os.path.exists(FRONTEND_ENV):
    with open(FRONTEND_ENV) as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                os.environ["EXPO_PUBLIC_BACKEND_URL"] = line.split("=", 1)[1].strip().strip('"')

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


# --------- helpers ---------
def _login(email, password):
    return requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def _new_user(prefix="safe", gender="female"):
    email = f"test.{prefix}.{uuid.uuid4().hex[:8]}@example.com"
    pwd = "secret123"
    r = requests.post(f"{API}/auth/signup", json={
        "email": email, "password": pwd, "name": prefix.title(), "gender": gender
    }, timeout=15)
    assert r.status_code == 200, r.text
    return email, pwd, r.json()["token"], r.json()["user"]


def _make_portrait_jpeg_b64():
    """Generate a real portrait-like JPEG with visual features (edges, shapes, colors)."""
    img = Image.new("RGB", (256, 320), color=(220, 200, 180))
    d = ImageDraw.Draw(img)
    # background gradient-ish
    for y in range(320):
        c = 200 - int(y * 0.2)
        d.line([(0, y), (256, y)], fill=(230, c, c - 20))
    # face (skin tone circle)
    d.ellipse([70, 60, 186, 200], fill=(232, 190, 160), outline=(140, 90, 60), width=3)
    # eyes
    d.ellipse([95, 110, 115, 130], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
    d.ellipse([141, 110, 161, 130], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
    d.ellipse([101, 115, 109, 125], fill=(30, 30, 60))
    d.ellipse([147, 115, 155, 125], fill=(30, 30, 60))
    # nose
    d.polygon([(128, 135), (120, 160), (136, 160)], outline=(140, 90, 60))
    # mouth
    d.arc([108, 155, 148, 185], start=0, end=180, fill=(150, 50, 50), width=3)
    # shirt
    d.rectangle([40, 210, 216, 320], fill=(70, 90, 180), outline=(30, 40, 90), width=2)
    # some texture noise
    import random
    r = random.Random(42)
    for _ in range(400):
        x, y = r.randint(0, 255), r.randint(0, 319)
        d.point((x, y), fill=(r.randint(0, 255), r.randint(0, 255), r.randint(0, 255)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


PORTRAIT_JPEG_B64 = _make_portrait_jpeg_b64()


# ============ Photo Moderation ============
class TestPhotoModeration:
    def test_safe_portrait_photo_is_accepted(self):
        _, _, tok, _ = _new_user("phsafe")
        r = requests.post(f"{API}/profile/photo",
                          json={"photo": PORTRAIT_JPEG_B64},
                          headers=_headers(tok), timeout=90)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True, f"expected ok=True, body={body}"
        assert body.get("explicit") is False
        assert "user" in body
        assert body["user"]["photos"], "photo not persisted on user"
        # verify persistence via /auth/me
        me = requests.get(f"{API}/auth/me", headers=_headers(tok), timeout=10).json()
        assert me["photos"], "photo not persisted on GET /auth/me"

    def test_invalid_short_photo_returns_400(self):
        _, _, tok, _ = _new_user("phbad")
        r = requests.post(f"{API}/profile/photo",
                          json={"photo": "short"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400

    def test_verify_accepts_safe_selfie(self):
        _, _, tok, _ = _new_user("verfy")
        r = requests.post(f"{API}/profile/verify",
                          json={"selfie": PORTRAIT_JPEG_B64},
                          headers=_headers(tok), timeout=90)
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["verified"] is True

    def test_verify_rejects_short_selfie(self):
        _, _, tok, _ = _new_user("verfybad")
        r = requests.post(f"{API}/profile/verify",
                          json={"selfie": "x"},
                          headers=_headers(tok), timeout=10)
        assert r.status_code == 400


# ============ Admin ============
class TestAdmin:
    def test_admin_login_and_flag(self):
        r = _login("admin@sugar.app", "admin1234")
        assert r.status_code == 200, r.text
        assert r.json()["user"]["is_admin"] is True

    def test_non_admin_403_on_admin_endpoints(self):
        _, _, tok, _ = _new_user("na")
        r = requests.get(f"{API}/admin/reports", headers=_headers(tok), timeout=10)
        assert r.status_code == 403
        r2 = requests.post(f"{API}/admin/reports/whatever/resolve",
                           json={"action": "dismiss"},
                           headers=_headers(tok), timeout=10)
        assert r2.status_code == 403

    def test_report_then_admin_ban_makes_reported_user_login_403(self):
        # Reporter
        _, _, rep_tok, _ = _new_user("reporter")
        # Target (will be banned)
        tgt_email, tgt_pw, tgt_tok, tgt_user = _new_user("target")
        # baseline login still works
        assert _login(tgt_email, tgt_pw).status_code == 200

        # Reporter files a report
        rep = requests.post(f"{API}/report",
                            json={"reported_id": tgt_user["id"], "reason": "test-ban"},
                            headers=_headers(rep_tok), timeout=10)
        assert rep.status_code == 200, rep.text

        # Admin logs in and lists reports
        adm = _login("admin@sugar.app", "admin1234")
        assert adm.status_code == 200
        adm_tok = adm.json()["token"]
        lst = requests.get(f"{API}/admin/reports", headers=_headers(adm_tok), timeout=10)
        assert lst.status_code == 200
        reports = lst.json()["reports"]
        mine = [r for r in reports if r.get("reported_id") == tgt_user["id"]]
        assert mine, "report not found in admin list"
        rid = mine[0]["id"]

        # Ban via resolve
        res = requests.post(f"{API}/admin/reports/{rid}/resolve",
                            json={"action": "ban"},
                            headers=_headers(adm_tok), timeout=15)
        assert res.status_code == 200, res.text
        assert res.json()["ok"] is True
        assert res.json()["banned"] is True

        # Reported user login now 403
        login_after = _login(tgt_email, tgt_pw)
        assert login_after.status_code == 403, f"expected 403 after ban, got {login_after.status_code}"

    def test_admin_dismiss_marks_resolved(self):
        _, _, rep_tok, _ = _new_user("rep2")
        _, _, _, tgt_user = _new_user("tgt2")
        rep = requests.post(f"{API}/report",
                            json={"reported_id": tgt_user["id"], "reason": "test-dismiss"},
                            headers=_headers(rep_tok), timeout=10)
        assert rep.status_code == 200
        adm_tok = _login("admin@sugar.app", "admin1234").json()["token"]
        lst = requests.get(f"{API}/admin/reports", headers=_headers(adm_tok), timeout=10).json()
        mine = [r for r in lst["reports"] if r.get("reported_id") == tgt_user["id"]]
        assert mine
        rid = mine[0]["id"]
        res = requests.post(f"{API}/admin/reports/{rid}/resolve",
                            json={"action": "dismiss"},
                            headers=_headers(adm_tok), timeout=10)
        assert res.status_code == 200
        assert res.json()["ok"] is True
        assert res.json()["banned"] is False
        # after resolve, list should show status resolved
        lst2 = requests.get(f"{API}/admin/reports", headers=_headers(adm_tok), timeout=10).json()
        found = [r for r in lst2["reports"] if r["id"] == rid]
        assert found and found[0].get("status") == "resolved"


# ============ Regression ============
class TestRegression:
    def test_lisa_login_and_subscribe_and_swipe(self):
        r = _login("lisa@sugar.app", "secret123")
        assert r.status_code == 200, r.text
        tok = r.json()["token"]
        # discover works
        d = requests.get(f"{API}/discover", headers=_headers(tok), timeout=15)
        assert d.status_code == 200
        # swipe like on demo (auto-match)
        s = requests.post(f"{API}/swipe", json={"target_id": "demo-2", "action": "like"},
                          headers=_headers(tok), timeout=10)
        assert s.status_code == 200
        assert s.json()["matched"] is True
        # subscription upgrade + reset
        u = requests.post(f"{API}/subscription", json={"tier": "plus"}, headers=_headers(tok), timeout=10)
        assert u.status_code == 200
        assert u.json()["tier"] == "plus"
        requests.post(f"{API}/subscription", json={"tier": "free"}, headers=_headers(tok), timeout=10)
