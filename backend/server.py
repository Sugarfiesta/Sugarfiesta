from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import uuid
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Annotated

import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    _HAS_LLM = True
except Exception:
    _HAS_LLM = False


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'sugar-dev-secret-change-me')
JWT_ALG = 'HS256'
TOKEN_DAYS = 14
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@sugar.app').lower()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("sugar")


async def moderate_image(data_uri: str) -> bool:
    """Return True if the image is EXPLICIT (nudity/sexual). Fails open (False) on error."""
    if not data_uri or not EMERGENT_LLM_KEY or not _HAS_LLM:
        return False
    b64 = data_uri.split(",", 1)[1] if data_uri.startswith("data:") else data_uri
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"mod-{uuid.uuid4()}",
            system_message=(
                "You are a strict image safety classifier for a dating app. "
                "Reply with exactly one word: EXPLICIT if the image contains nudity, exposed "
                "genitals or breasts, or sexual activity; otherwise SAFE."
            ),
        ).with_model("openai", "gpt-5.4")
        resp = await chat.send_message(
            UserMessage(text="Classify this profile photo. Answer only EXPLICIT or SAFE.",
                        file_contents=[ImageContent(image_base64=b64)])
        )
        return str(resp or "").strip().upper().startswith("EXPLICIT")
    except Exception as e:
        logger.info(f"moderation error: {e}")
        return False


# ----------------------------- Models -----------------------------
class SignupBody(BaseModel):
    email: EmailStr
    password: str
    name: str
    gender: str  # "female" | "male" | "other"


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class VerifyBody(BaseModel):
    selfie: str  # base64 data URI


class ProfileBody(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    country: Optional[str] = None
    photos: Optional[List[str]] = None
    religion: Optional[str] = None
    hobby: Optional[str] = None
    job: Optional[str] = None
    orientation: Optional[str] = None
    orientation_interest: Optional[List[str]] = None


class SwipeBody(BaseModel):
    target_id: str
    action: str  # "like" | "pass" | "heart"


class MessageBody(BaseModel):
    text: str


class SubscribeBody(BaseModel):
    tier: str  # "free" | "plus" | "gold" | "vip"


class PublicUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    gender: str
    verified: bool
    has_selfie: bool = False
    preference: str = "everyone"
    bio: str = ""
    age: Optional[int] = None
    country: str = ""
    photos: List[str] = []
    tier: str = "free"
    tier_until: Optional[str] = None
    is_admin: bool = False
    religion: str = ""
    hobby: str = ""
    job: str = ""
    orientation: str = ""
    orientation_interest: List[str] = []
    stories: List[dict] = []


class PhotoBody(BaseModel):
    photo: str
    visibility: Optional[str] = "public"
    caption: Optional[str] = None
    text_color: Optional[str] = None


class StoryVisibilityBody(BaseModel):
    index: int
    visibility: str


class AdminResolveBody(BaseModel):
    action: str  # "dismiss" | "ban"


class PreferenceBody(BaseModel):
    preference: str  # "female" | "male" | "everyone"


class ReportBody(BaseModel):
    reported_id: Optional[str] = None
    reason: str


class AuthResponse(BaseModel):
    token: str
    user: PublicUser


ALLOWED_ORIENTATIONS = {"hetero", "gay", "bi", "pan", "ace", "queer"}
STORY_VISIBILITIES = {"public", "matches", "private"}


def normalize_stories(raw) -> List[dict]:
    out = []
    for s in raw or []:
        if isinstance(s, str):
            out.append({"url": s, "visibility": "public", "caption": "", "text_color": "#FFFFFF"})
        elif isinstance(s, dict) and s.get("url"):
            vis = s.get("visibility", "public")
            out.append({
                "url": s["url"],
                "visibility": vis if vis in STORY_VISIBILITIES else "public",
                "caption": (s.get("caption") or "")[:120],
                "text_color": s.get("text_color") or "#FFFFFF",
            })
    return out


def to_public(doc: dict) -> PublicUser:
    return PublicUser(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        gender=doc.get("gender", "other"),
        verified=bool(doc.get("verified", False)),
        has_selfie=bool(doc.get("selfie")),
        preference=doc.get("preference", "everyone"),
        bio=doc.get("bio", "") or "",
        age=doc.get("age"),
        country=doc.get("country", "") or "",
        photos=doc.get("photos", []) or [],
        tier=doc.get("tier", "free"),
        tier_until=doc.get("tier_until"),
        is_admin=bool(doc.get("is_admin", False)),
        religion=doc.get("religion", "") or "",
        hobby=doc.get("hobby", "") or "",
        job=doc.get("job", "") or "",
        orientation=doc.get("orientation", "") or "",
        orientation_interest=doc.get("orientation_interest", []) or [],
        stories=normalize_stories(doc.get("stories", [])),
    )


def make_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(days=TOKEN_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


# ----------------------------- Auth routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Sugar API"}


@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(body: SignupBody):
    email = body.email.lower().strip()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen haben")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name ist erforderlich")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="E-Mail ist bereits registriert")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": pwd_context.hash(body.password),
        "name": body.name.strip(),
        "gender": body.gender if body.gender in ("female", "male", "other") else "other",
        "verified": False,
        "selfie": None,
        "preference": "everyone",
        "blocked": [],
        "bio": "",
        "age": None,
        "country": "",
        "photos": [],
        "tier": "free",
        "tier_until": None,
        "is_admin": email == ADMIN_EMAIL,
        "banned": False,
        "religion": "",
        "hobby": "",
        "job": "",
        "orientation": "",
        "orientation_interest": [],
        "stories": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return AuthResponse(token=make_token(doc["id"]), user=to_public(doc))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_context.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ungültige E-Mail oder Passwort")
    if user.get("banned"):
        raise HTTPException(status_code=403, detail="Dein Konto wurde wegen Regelverstoßes gesperrt.")
    return AuthResponse(token=make_token(user["id"]), user=to_public(user))


@api_router.get("/auth/me", response_model=PublicUser)
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return to_public(user)


@api_router.post("/profile/verify", response_model=PublicUser)
async def verify_profile(body: VerifyBody, user: Annotated[dict, Depends(get_current_user)]):
    if not body.selfie or len(body.selfie) < 100:
        raise HTTPException(status_code=400, detail="Bitte ein gültiges Selfie hochladen")
    if await moderate_image(body.selfie):
        raise HTTPException(status_code=422, detail="Dieses Bild verstößt gegen unsere Richtlinien (Nacktheit/expliziter Inhalt).")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"selfie": body.selfie, "verified": True}},
    )
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(user)


@api_router.post("/profile/photo")
async def add_photo(body: PhotoBody, user: Annotated[dict, Depends(get_current_user)]):
    photos = user.get("photos", []) or []
    if len(photos) >= 6:
        raise HTTPException(status_code=400, detail="Maximal 6 Fotos")
    if not body.photo or len(body.photo) < 100:
        raise HTTPException(status_code=400, detail="Ungültiges Foto")
    if await moderate_image(body.photo):
        return {"ok": False, "explicit": True}
    photos = (photos + [body.photo])[:6]
    await db.users.update_one({"id": user["id"]}, {"$set": {"photos": photos}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"ok": True, "explicit": False, "user": to_public(u).model_dump()}


@api_router.patch("/profile/preferences", response_model=PublicUser)
async def set_preference(body: PreferenceBody, user: Annotated[dict, Depends(get_current_user)]):
    pref = body.preference if body.preference in ("female", "male", "everyone") else "everyone"
    await db.users.update_one({"id": user["id"]}, {"$set": {"preference": pref}})
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(user)


@api_router.post("/report")
async def report_user(body: ReportBody, user: Annotated[dict, Depends(get_current_user)]):
    await db.reports.insert_one({
        "id": str(uuid.uuid4()),
        "reporter_id": user["id"],
        "reporter_name": user.get("name"),
        "reported_id": body.reported_id,
        "reason": body.reason,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


async def require_admin(user: Annotated[dict, Depends(get_current_user)]) -> dict:
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Nur für Admins")
    return user


@api_router.get("/admin/reports")
async def admin_reports(admin: Annotated[dict, Depends(require_admin)]):
    out = []
    async for r in db.reports.find({}, {"_id": 0}).sort("created_at", -1).limit(200):
        reported_name = None
        rid = r.get("reported_id")
        if rid and not str(rid).startswith("bot-") and not str(rid).startswith("demo-"):
            ru = await db.users.find_one({"id": rid}, {"_id": 0, "name": 1, "banned": 1})
            if ru:
                reported_name = ru.get("name")
                r["reported_banned"] = bool(ru.get("banned"))
        r["reported_name"] = reported_name
        out.append(r)
    open_count = await db.reports.count_documents({"status": "open"})
    return {"reports": out, "open_count": open_count}


@api_router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve(report_id: str, body: AdminResolveBody, admin: Annotated[dict, Depends(require_admin)]):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Meldung nicht gefunden")
    banned = False
    if body.action == "ban" and r.get("reported_id"):
        rid = r["reported_id"]
        if not str(rid).startswith("bot-") and not str(rid).startswith("demo-"):
            res = await db.users.update_one({"id": rid}, {"$set": {"banned": True}})
            banned = res.modified_count > 0
    await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "resolution": body.action, "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "banned": banned}


# ----------------------------- Profile, Discover, Matches, Subscription -----------------------------
TIERS = [
    {"id": "free", "name": "Free", "price": 0.0,
     "tagline": "Zum Reinschnuppern",
     "features": ["Foto-Matching (Entdecken)", "Chat mit deinen Matches", "Basis-Profil"]},
    {"id": "plus", "name": "Sugar Plus", "price": 4.99,
     "tagline": "Für ernsthafte Dates",
     "features": ["Alles aus Free", "Live-Video-Dating 🎥", "Unbegrenzte Likes", "Vorschau: Wer mag dich"]},
    {"id": "gold", "name": "Sugar Gold", "price": 7.99,
     "tagline": "Beliebteste Wahl",
     "features": ["Alles aus Plus", "Länder-Filter 🌍", "Sieh wer dich mag", "5 Super-Herzen pro Tag", "Wöchentlicher Profil-Boost"]},
    {"id": "vip", "name": "Sugar VIP", "price": 15.99,
     "tagline": "Das volle Erlebnis",
     "features": ["Alles aus Gold", "Priorisiertes Matching", "Unbegrenzte Herzen 💘", "Inkognito-Modus", "Verifizierter VIP-Badge", "Keine Wartezeit in der Video-Queue"]},
]
TIER_RANK = {"free": 0, "plus": 1, "gold": 2, "vip": 3}

DEMO_PROFILES = [
    {"id": "demo-1", "name": "Elena", "age": 26, "gender": "female", "country": "DE", "orientation": "hetero", "bio": "Kaffee, Kunst & spontane Roadtrips.", "photo": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-2", "name": "Marco", "age": 29, "gender": "male", "country": "IT", "orientation": "hetero", "bio": "Koche gerne Pasta. Suche echte Gespräche.", "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-3", "name": "Sofia", "age": 24, "gender": "female", "country": "ES", "orientation": "bi", "bio": "Salsa-Tänzerin & Sonnenuntergangsjägerin.", "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-4", "name": "Luca", "age": 31, "gender": "male", "country": "CH", "orientation": "gay", "bio": "Berge am Wochenende, Jazz am Abend.", "photo": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-5", "name": "Amara", "age": 27, "gender": "female", "country": "FR", "orientation": "queer", "bio": "Fotografin. Zeig mir deine Lieblingsecke.", "photo": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-6", "name": "Noah", "age": 28, "gender": "male", "country": "AT", "orientation": "bi", "bio": "Hunde-Papa & Hobbybäcker 🥐", "photo": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-7", "name": "Valentina", "age": 25, "gender": "female", "country": "DE", "orientation": "pan", "bio": "Yoga, Bücher & Rotwein.", "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop"},
    {"id": "demo-8", "name": "Leon", "age": 30, "gender": "male", "country": "DE", "orientation": "hetero", "bio": "Startup-Gründer. Spontane Reisen? Immer.", "photo": "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&q=80&auto=format&fit=crop"},
]


def _demo_by_id(did: str) -> Optional[dict]:
    return next((d for d in DEMO_PROFILES if d["id"] == did), None)


def _card_from_demo(d: dict) -> dict:
    return {"id": d["id"], "name": d["name"], "age": d["age"], "gender": d["gender"],
            "country": d["country"], "bio": d["bio"], "photo": d["photo"], "is_demo": True,
            "verified": True, "orientation": d.get("orientation", "")}


def _card_from_user(u: dict) -> dict:
    photos = u.get("photos", []) or []
    photo = photos[0] if photos else u.get("selfie")
    return {"id": u["id"], "name": u["name"], "age": u.get("age"), "gender": u.get("gender", "other"),
            "country": u.get("country", ""), "bio": u.get("bio", ""), "photo": photo,
            "is_demo": False, "verified": bool(u.get("verified")), "orientation": u.get("orientation", "")}


@api_router.patch("/profile", response_model=PublicUser)
async def update_profile(body: ProfileBody, user: Annotated[dict, Depends(get_current_user)]):
    updates = {}
    if body.name is not None and body.name.strip():
        updates["name"] = body.name.strip()
    if body.bio is not None:
        updates["bio"] = body.bio[:300]
    if body.age is not None:
        updates["age"] = max(18, min(99, int(body.age)))
    if body.country is not None:
        updates["country"] = body.country[:4].upper()
    if body.photos is not None:
        updates["photos"] = body.photos[:6]
    if body.religion is not None:
        updates["religion"] = body.religion[:60]
    if body.hobby is not None:
        updates["hobby"] = body.hobby[:60]
    if body.job is not None:
        updates["job"] = body.job[:60]
    if body.orientation is not None:
        updates["orientation"] = body.orientation if body.orientation in ALLOWED_ORIENTATIONS else ""
    if body.orientation_interest is not None:
        updates["orientation_interest"] = [o for o in body.orientation_interest if o in ALLOWED_ORIENTATIONS][:6]
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(user)


@api_router.post("/profile/story")
async def add_story(body: PhotoBody, user: Annotated[dict, Depends(get_current_user)]):
    if not body.photo or len(body.photo) < 100:
        raise HTTPException(status_code=400, detail="Ungültiges Bild")
    if await moderate_image(body.photo):
        return {"ok": False, "explicit": True}
    vis = body.visibility if body.visibility in STORY_VISIBILITIES else "public"
    item = {
        "url": body.photo,
        "visibility": vis,
        "caption": (body.caption or "")[:120],
        "text_color": body.text_color or "#FFFFFF",
        "at": datetime.now(timezone.utc).isoformat(),
    }
    stories = normalize_stories(user.get("stories", []))
    stories = ([item] + stories)[:10]
    await db.users.update_one({"id": user["id"]}, {"$set": {"stories": stories}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"ok": True, "explicit": False, "user": to_public(u).model_dump()}


@api_router.delete("/profile/story/{index}", response_model=PublicUser)
async def delete_story(index: int, user: Annotated[dict, Depends(get_current_user)]):
    stories = normalize_stories(user.get("stories", []))
    if index < 0 or index >= len(stories):
        raise HTTPException(status_code=404, detail="Story nicht gefunden")
    stories.pop(index)
    await db.users.update_one({"id": user["id"]}, {"$set": {"stories": stories}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(u)


@api_router.get("/users/{uid}/profile")
async def get_user_profile(uid: str, user: Annotated[dict, Depends(get_current_user)]):
    if uid.startswith("demo-"):
        d = _demo_by_id(uid)
        if not d:
            raise HTTPException(status_code=404, detail="Profil nicht gefunden")
        return {
            "id": d["id"], "name": d["name"], "age": d["age"], "gender": d["gender"],
            "country": d.get("country", ""), "bio": d.get("bio", ""), "photos": [d["photo"]],
            "orientation": d.get("orientation", ""), "religion": "", "hobby": "", "job": "",
            "verified": True, "stories": [], "is_demo": True,
        }
    u = await db.users.find_one({"id": uid}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden")
    data = to_public(u).model_dump()
    # matched users may see "matches"-level stories, everyone sees public
    is_match = await db.matches.find_one({"users": {"$all": [user["id"], uid]}})
    allowed = {"public", "matches"} if is_match else {"public"}
    data["stories"] = [s for s in normalize_stories(u.get("stories", [])) if s["visibility"] in allowed]
    data["is_demo"] = False
    return data



@api_router.post("/profile/story/visibility", response_model=PublicUser)
async def set_story_visibility(body: StoryVisibilityBody, user: Annotated[dict, Depends(get_current_user)]):
    if body.visibility not in STORY_VISIBILITIES:
        raise HTTPException(status_code=400, detail="Ungültige Sichtbarkeit")
    stories = normalize_stories(user.get("stories", []))
    if body.index < 0 or body.index >= len(stories):
        raise HTTPException(status_code=404, detail="Story nicht gefunden")
    stories[body.index]["visibility"] = body.visibility
    await db.users.update_one({"id": user["id"]}, {"$set": {"stories": stories}})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(u)


@api_router.get("/discover")
async def discover(country: Optional[str] = None, user: Annotated[dict, Depends(get_current_user)] = None):
    pref = user.get("preference", "everyone")
    can_filter = TIER_RANK.get(user.get("tier", "free"), 0) >= 2  # gold+
    country_f = (country or "").upper() if (country and can_filter) else None

    swiped = set()
    async for s in db.swipes.find({"from": user["id"]}, {"_id": 0, "to": 1}):
        swiped.add(s["to"])
    blocked = set(user.get("blocked", []) or [])
    interest = set(user.get("orientation_interest", []) or [])

    def orientation_ok(o: str) -> bool:
        return (not interest) or (not o) or (o in interest)

    cards = []
    for d in DEMO_PROFILES:
        if d["id"] in swiped:
            continue
        if pref != "everyone" and d["gender"] != pref:
            continue
        if country_f and d["country"] != country_f:
            continue
        if not orientation_ok(d.get("orientation", "")):
            continue
        cards.append(_card_from_demo(d))

    async for u in db.users.find({"id": {"$ne": user["id"]}, "verified": True}, {"_id": 0}):
        if u["id"] in swiped or u["id"] in blocked:
            continue
        if pref != "everyone" and u.get("gender") != pref:
            continue
        if country_f and (u.get("country", "").upper() != country_f):
            continue
        if not orientation_ok(u.get("orientation", "")):
            continue
        if not (u.get("photos") or u.get("selfie")):
            continue
        cards.append(_card_from_user(u))

    random.shuffle(cards)
    return {"cards": cards, "can_filter": can_filter}


async def _create_match(user: dict, partner_card: dict) -> dict:
    match_id = str(uuid.uuid4())
    doc = {
        "id": match_id,
        "users": [user["id"], partner_card["id"]],
        "is_demo": partner_card.get("is_demo", False),
        "partner_snapshot": {
            "id": partner_card["id"], "name": partner_card["name"],
            "photo": partner_card.get("photo"), "gender": partner_card.get("gender", "other"),
            "verified": partner_card.get("verified", False),
        },
        "owner_snapshot": {
            "id": user["id"], "name": user["name"],
            "photo": (user.get("photos") or [None])[0] or user.get("selfie"),
            "gender": user.get("gender", "other"), "verified": bool(user.get("verified")),
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_text": None,
        "last_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/swipe")
async def swipe(body: SwipeBody, user: Annotated[dict, Depends(get_current_user)]):
    if body.action not in ("like", "pass", "heart"):
        raise HTTPException(status_code=400, detail="Ungültige Aktion")
    await db.swipes.update_one(
        {"from": user["id"], "to": body.target_id},
        {"$set": {"from": user["id"], "to": body.target_id, "action": body.action,
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    if body.action == "pass":
        return {"matched": False}

    # existing match?
    existing = await db.matches.find_one({"users": {"$all": [user["id"], body.target_id]}}, {"_id": 0})
    if existing:
        return {"matched": True, "match": _match_view(existing, user["id"])}

    demo = _demo_by_id(body.target_id)
    if demo:
        # demo profiles always like back
        m = await _create_match(user, _card_from_demo(demo))
        return {"matched": True, "match": _match_view(m, user["id"])}

    # real user: match only if they already liked/hearted us
    theirs = await db.swipes.find_one({"from": body.target_id, "to": user["id"], "action": {"$in": ["like", "heart"]}})
    if theirs:
        other = await db.users.find_one({"id": body.target_id}, {"_id": 0})
        if other:
            m = await _create_match(user, _card_from_user(other))
            return {"matched": True, "match": _match_view(m, user["id"])}
    return {"matched": False}


def _match_view(m: dict, uid: str) -> dict:
    partner = m["partner_snapshot"] if m["users"][0] == uid else m.get("owner_snapshot", m["partner_snapshot"])
    if m["users"][0] != uid and m.get("is_demo"):
        partner = m["partner_snapshot"]
    return {
        "id": m["id"],
        "partner": partner,
        "is_demo": m.get("is_demo", False),
        "last_text": m.get("last_text"),
        "last_at": m.get("last_at"),
        "created_at": m.get("created_at"),
    }


@api_router.get("/matches")
async def list_matches(user: Annotated[dict, Depends(get_current_user)]):
    out = []
    async for m in db.matches.find({"users": user["id"]}, {"_id": 0}).sort("last_at", -1):
        out.append(_match_view(m, user["id"]))
    return {"matches": out}


@api_router.get("/matches/{match_id}")
async def match_detail(match_id: str, user: Annotated[dict, Depends(get_current_user)]):
    m = await db.matches.find_one({"id": match_id, "users": user["id"]}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match nicht gefunden")
    msgs = []
    async for msg in db.messages.find({"match_id": match_id}, {"_id": 0}).sort("created_at", 1):
        msgs.append(msg)
    return {"match": _match_view(m, user["id"]), "messages": msgs}


@api_router.post("/matches/{match_id}/messages")
async def send_message(match_id: str, body: MessageBody, user: Annotated[dict, Depends(get_current_user)]):
    m = await db.matches.find_one({"id": match_id, "users": user["id"]}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match nicht gefunden")
    text = (body.text or "").strip()[:500]
    if not text:
        raise HTTPException(status_code=400, detail="Leere Nachricht")
    now = datetime.now(timezone.utc).isoformat()
    msg = {"id": str(uuid.uuid4()), "match_id": match_id, "sender": user["id"], "text": text, "created_at": now}
    await db.messages.insert_one(msg)
    await db.matches.update_one({"id": match_id}, {"$set": {"last_text": text, "last_at": now}})
    reply = None
    if m.get("is_demo"):
        rnow = datetime.now(timezone.utc).isoformat()
        reply = {"id": str(uuid.uuid4()), "match_id": match_id, "sender": m["partner_snapshot"]["id"],
                 "text": random.choice(BOT_REPLIES), "created_at": rnow}
        await db.messages.insert_one(reply)
        await db.matches.update_one({"id": match_id}, {"$set": {"last_text": reply["text"], "last_at": rnow}})
    msg.pop("_id", None)
    if reply:
        reply.pop("_id", None)
    return {"message": msg, "reply": reply}


@api_router.get("/subscription")
async def get_subscription(user: Annotated[dict, Depends(get_current_user)]):
    return {"tier": user.get("tier", "free"), "tier_until": user.get("tier_until"), "tiers": TIERS}


@api_router.post("/subscription", response_model=PublicUser)
async def subscribe(body: SubscribeBody, user: Annotated[dict, Depends(get_current_user)]):
    if body.tier not in TIER_RANK:
        raise HTTPException(status_code=400, detail="Ungültige Stufe")
    until = None
    if body.tier != "free":
        until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"tier": body.tier, "tier_until": until}})
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(user)


@api_router.delete("/account")
async def delete_account(user: Annotated[dict, Depends(get_current_user)]):
    uid = user["id"]
    match_ids = []
    async for m in db.matches.find({"users": uid}, {"_id": 0, "id": 1}):
        match_ids.append(m["id"])
    if match_ids:
        await db.messages.delete_many({"match_id": {"$in": match_ids}})
    await db.matches.delete_many({"users": uid})
    await db.swipes.delete_many({"$or": [{"from": uid}, {"to": uid}]})
    await db.reports.delete_many({"reporter_id": uid})
    await db.users.delete_one({"id": uid})
    return {"ok": True}


# ----------------------------- Matching (WebSocket) -----------------------------
BOTS = [
    {"name": "Valentina", "gender": "female"},
    {"name": "Sofia", "gender": "female"},
    {"name": "Amara", "gender": "female"},
    {"name": "Marco", "gender": "male"},
    {"name": "Luca", "gender": "male"},
    {"name": "Noah", "gender": "male"},
]
BOT_REPLIES = [
    "Hey, schön dich zu sehen! 😊",
    "Du hast ein tolles Lächeln!",
    "Woher kommst du denn?",
    "Was machst du so, wenn du nicht auf Sugar bist?",
    "Ich mag deine Energie ✨",
    "Erzähl mir was über dich!",
    "Das ist ja ein netter Zufall 💕",
    "Bleibst du noch ein bisschen?",
]
BOT_TIMEOUT = 4.0  # seconds before matching with a demo partner


def _pub(p: dict) -> dict:
    return {
        "id": p.get("id"),
        "name": p.get("name"),
        "gender": p.get("gender", "other"),
        "verified": bool(p.get("verified", False)),
    }


def _pref_ok(pref: str, gender: str) -> bool:
    return pref == "everyone" or pref == gender


def _compatible(a: dict, b: dict) -> bool:
    if not _pref_ok(a.get("preference", "everyone"), b.get("gender", "other")):
        return False
    if not _pref_ok(b.get("preference", "everyone"), a.get("gender", "other")):
        return False
    if b.get("id") in a.get("blocked", set()) or a.get("id") in b.get("blocked", set()):
        return False
    return True


class MatchManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}
        self.profiles: Dict[str, dict] = {}
        self.waiting: List[str] = []
        self.pairs: Dict[str, str] = {}          # uid -> partner uid (real)
        self.bot_partner: Dict[str, dict] = {}   # uid -> bot profile
        self.bot_timers: Dict[str, asyncio.Task] = {}
        self.lock = asyncio.Lock()

    async def send(self, uid: str, message: dict):
        ws = self.active.get(uid)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def connect(self, uid: str, ws: WebSocket, profile: dict):
        self.active[uid] = ws
        self.profiles[uid] = profile

    def _cancel_bot(self, uid: str):
        t = self.bot_timers.pop(uid, None)
        if t and not t.done():
            t.cancel()

    async def _make_pair(self, a: str, b: str):
        self.pairs[a] = b
        self.pairs[b] = a
        pa, pb = self.profiles.get(a, {}), self.profiles.get(b, {})
        await self.send(a, {"type": "matched", "partner": {**_pub(pb), "is_bot": False}})
        await self.send(b, {"type": "matched", "partner": {**_pub(pa), "is_bot": False}})

    async def _pair_with_bot(self, uid: str):
        if uid in self.waiting:
            self.waiting.remove(uid)
        pref = self.profiles.get(uid, {}).get("preference", "everyone")
        pool = [b for b in BOTS if pref == "everyone" or b["gender"] == pref] or BOTS
        bot = dict(random.choice(pool))
        bot["id"] = "bot-" + str(uuid.uuid4())[:8]
        bot["verified"] = True
        self.bot_partner[uid] = bot
        await self.send(uid, {"type": "matched", "partner": {**bot, "is_bot": True}})

    def _schedule_bot(self, uid: str):
        self._cancel_bot(uid)

        async def _run():
            try:
                await asyncio.sleep(BOT_TIMEOUT)
                async with self.lock:
                    if uid in self.waiting and uid in self.active:
                        await self._pair_with_bot(uid)
            except asyncio.CancelledError:
                pass

        self.bot_timers[uid] = asyncio.create_task(_run())

    async def enqueue(self, uid: str):
        await self.send(uid, {"type": "searching"})
        if uid in self.waiting or uid in self.pairs or uid in self.bot_partner:
            return
        partner = next(
            (
                w
                for w in self.waiting
                if w != uid and w in self.active and _compatible(self.profiles.get(uid, {}), self.profiles.get(w, {}))
            ),
            None,
        )
        if partner:
            self.waiting.remove(partner)
            self._cancel_bot(partner)
            await self._make_pair(uid, partner)
        else:
            self.waiting.append(uid)
            self._schedule_bot(uid)

    async def teardown(self, uid: str, notify_partner: bool = True):
        self._cancel_bot(uid)
        self.bot_partner.pop(uid, None)
        partner = self.pairs.pop(uid, None)
        if partner:
            self.pairs.pop(partner, None)
            if notify_partner:
                await self.send(partner, {"type": "partner_left"})
                await self.enqueue(partner)

    async def next_partner(self, uid: str):
        async with self.lock:
            await self.teardown(uid, notify_partner=True)
            await self.enqueue(uid)

    async def find(self, uid: str):
        async with self.lock:
            await self.enqueue(uid)

    async def chat(self, uid: str, text: str):
        text = (text or "").strip()[:500]
        if not text:
            return
        partner = self.pairs.get(uid)
        if partner:
            await self.send(partner, {"type": "chat", "text": text, "from": uid})
        elif uid in self.bot_partner:
            bot = self.bot_partner[uid]
            asyncio.create_task(self._bot_reply(uid, dict(bot)))

    async def _bot_reply(self, uid: str, bot: dict):
        try:
            await asyncio.sleep(random.uniform(1.0, 2.2))
            if self.bot_partner.get(uid, {}).get("id") == bot["id"] and uid in self.active:
                await self.send(uid, {"type": "chat", "text": random.choice(BOT_REPLIES), "from": bot["id"]})
        except asyncio.CancelledError:
            pass

    async def block(self, uid: str, target: Optional[str]):
        async with self.lock:
            prof = self.profiles.get(uid)
            if prof is not None and target:
                prof.setdefault("blocked", set()).add(target)
            await self.teardown(uid, notify_partner=True)
            await self.enqueue(uid)
        if target and not target.startswith("bot-"):
            await db.users.update_one({"id": uid}, {"$addToSet": {"blocked": target}})

    async def signal(self, uid: str, payload):
        # Relay WebRTC signaling (offer/answer/ICE) to the current real partner.
        partner = self.pairs.get(uid)
        if partner:
            await self.send(partner, {"type": "signal", "data": payload})

    async def disconnect(self, uid: str):
        async with self.lock:
            if uid in self.waiting:
                self.waiting.remove(uid)
            await self.teardown(uid, notify_partner=True)
            self.active.pop(uid, None)
            self.profiles.pop(uid, None)


manager = MatchManager()


@api_router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    token = ws.query_params.get("token", "")
    user_id = decode_token(token)
    if not user_id:
        await ws.close(code=4401)
        return
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        await ws.close(code=4401)
        return
    await ws.accept()
    profile = {
        "id": user["id"],
        "name": user["name"],
        "gender": user.get("gender", "other"),
        "verified": bool(user.get("verified", False)),
        "preference": user.get("preference", "everyone"),
        "blocked": set(user.get("blocked", []) or []),
    }
    await manager.connect(user_id, ws, profile)
    tier_rank = TIER_RANK.get(user.get("tier", "free"), 0)
    try:
        while True:
            data = await ws.receive_json()
            action = data.get("type")
            if action == "find":
                if tier_rank < 1:
                    await manager.send(user_id, {"type": "paywall"})
                else:
                    await manager.find(user_id)
            elif action == "next":
                await manager.next_partner(user_id)
            elif action == "chat":
                await manager.chat(user_id, data.get("text", ""))
            elif action == "signal":
                await manager.signal(user_id, data.get("data"))
            elif action == "block":
                await manager.block(user_id, data.get("target"))
            elif action == "stop":
                async with manager.lock:
                    if user_id in manager.waiting:
                        manager.waiting.remove(user_id)
                    await manager.teardown(user_id, notify_partner=True)
                await manager.send(user_id, {"type": "stopped"})
            elif action == "ping":
                await manager.send(user_id, {"type": "pong"})
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
    except Exception as e:
        logger.info(f"ws error: {e}")
        await manager.disconnect(user_id)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_admin():
    try:
        existing = await db.users.find_one({"email": ADMIN_EMAIL})
        if existing:
            if not existing.get("is_admin"):
                await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"is_admin": True}})
            return
        doc = {
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": pwd_context.hash("admin1234"),
            "name": "Sugar Admin",
            "gender": "other",
            "verified": True,
            "selfie": None,
            "preference": "everyone",
            "blocked": [],
            "bio": "",
            "age": None,
            "country": "",
            "photos": [],
            "tier": "vip",
            "tier_until": None,
            "is_admin": True,
            "banned": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        logger.info(f"Seeded admin account: {ADMIN_EMAIL}")
    except Exception as e:
        logger.info(f"admin seed error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
