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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'sugar-dev-secret-change-me')
JWT_ALG = 'HS256'
TOKEN_DAYS = 14

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("sugar")


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


class PublicUser(BaseModel):
    id: str
    email: EmailStr
    name: str
    gender: str
    verified: bool
    has_selfie: bool = False


class AuthResponse(BaseModel):
    token: str
    user: PublicUser


def to_public(doc: dict) -> PublicUser:
    return PublicUser(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        gender=doc.get("gender", "other"),
        verified=bool(doc.get("verified", False)),
        has_selfie=bool(doc.get("selfie")),
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
    return AuthResponse(token=make_token(user["id"]), user=to_public(user))


@api_router.get("/auth/me", response_model=PublicUser)
async def me(user: Annotated[dict, Depends(get_current_user)]):
    return to_public(user)


@api_router.post("/profile/verify", response_model=PublicUser)
async def verify_profile(body: VerifyBody, user: Annotated[dict, Depends(get_current_user)]):
    if not body.selfie or len(body.selfie) < 100:
        raise HTTPException(status_code=400, detail="Bitte ein gültiges Selfie hochladen")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"selfie": body.selfie, "verified": True}},
    )
    user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public(user)


# ----------------------------- Matching (WebSocket) -----------------------------
BOTS = [
    {"name": "Valentina", "gender": "female"},
    {"name": "Sofia", "gender": "female"},
    {"name": "Amara", "gender": "female"},
    {"name": "Marco", "gender": "male"},
    {"name": "Luca", "gender": "male"},
    {"name": "Noah", "gender": "male"},
]
BOT_TIMEOUT = 4.0  # seconds before matching with a demo partner


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
        await self.send(a, {"type": "matched", "partner": {**pb, "is_bot": False}})
        await self.send(b, {"type": "matched", "partner": {**pa, "is_bot": False}})

    async def _pair_with_bot(self, uid: str):
        if uid in self.waiting:
            self.waiting.remove(uid)
        bot = dict(random.choice(BOTS))
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
        partner = next((w for w in self.waiting if w != uid and w in self.active), None)
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
    }
    await manager.connect(user_id, ws, profile)
    try:
        while True:
            data = await ws.receive_json()
            action = data.get("type")
            if action == "find":
                await manager.find(user_id)
            elif action == "next":
                await manager.next_partner(user_id)
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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
