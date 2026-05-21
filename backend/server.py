"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status, Request
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import string
import uuid
import asyncio
import httpx
import bcrypt
import jwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import List, Optional, Literal
from datetime import datetime, timedelta, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Config
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "louvorapp-dev-secret-change-in-prod-2026")
JWT_ALG = "HS256"
JWT_EXP_DAYS = 30

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")
api = APIRouter(prefix="/api")
auth_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("louvorapp")


# ============= Models =============
class SignupReq(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    ministry_name: Optional[str] = None  # creates new ministry
    invite_code: Optional[str] = None  # joins existing ministry


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str  # "leader" | "member"
    ministry_id: str
    instruments: List[str] = []
    permissions: List[str] = []  # only relevant for members; leader has all
    phone: Optional[str] = None
    avatar_color: str = "#2E412A"


PERM_EDIT_SCALES = "edit_scales"
PERM_EDIT_SONGS = "edit_songs"
PERM_EDIT_ANNOUNCEMENTS = "edit_announcements"
ALL_PERMS = {PERM_EDIT_SCALES, PERM_EDIT_SONGS, PERM_EDIT_ANNOUNCEMENTS}


class UpdateMemberReq(BaseModel):
    role: Optional[Literal["leader", "member"]] = None
    permissions: Optional[List[str]] = None


class AuthResp(BaseModel):
    token: str
    user: UserPublic
    ministry: dict


class Ministry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    invite_code: str
    api_key: str = Field(default_factory=lambda: "lvr_" + secrets.token_urlsafe(32))
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SongCreate(BaseModel):
    title: str
    artist: Optional[str] = ""
    key: Optional[str] = ""  # tom
    bpm: Optional[int] = None
    youtube_url: Optional[str] = ""
    cifra_url: Optional[str] = ""
    lyrics: Optional[str] = ""
    tags: List[str] = []


class Song(SongCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ministry_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScaleAssignment(BaseModel):
    user_id: str
    user_name: str
    instrument: str


class ScaleCreate(BaseModel):
    title: str  # ex: "Culto Domingo Manhã"
    date: str  # ISO date string
    time: Optional[str] = "19:30"
    location: Optional[str] = ""
    notes: Optional[str] = ""
    song_ids: List[str] = []
    assignments: List[ScaleAssignment] = []


class Scale(ScaleCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ministry_id: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AnnouncementCreate(BaseModel):
    title: str
    message: str


class Announcement(AnnouncementCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ministry_id: str
    author_id: str
    author_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UpdateProfileReq(BaseModel):
    name: Optional[str] = None
    instruments: Optional[List[str]] = None
    phone: Optional[str] = None


class GoogleSessionReq(BaseModel):
    session_id: str
    invite_code: Optional[str] = None
    ministry_name: Optional[str] = None


class AvailabilityCreate(BaseModel):
    date: str  # ISO date "YYYY-MM-DD"
    status: Literal["available", "unavailable"] = "available"
    note: Optional[str] = ""


class Availability(AvailabilityCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    ministry_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WebhookCreate(BaseModel):
    url: str
    events: List[str] = ["scale.created", "scale.updated", "scale.deleted"]
    description: Optional[str] = ""


class Webhook(WebhookCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ministry_id: str
    secret: str = Field(default_factory=lambda: secrets.token_urlsafe(24))
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PushTokenReq(BaseModel):
    token: str
    platform: Optional[str] = "expo"


# ============= Helpers =============
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def gen_invite_code() -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def gen_api_key() -> str:
    return "lvr_" + secrets.token_urlsafe(32)


async def trigger_webhooks(ministry_id: str, event: str, payload: dict) -> None:
    """Fire-and-forget POST to all registered active webhooks for a ministry/event."""
    hooks = await db.webhooks.find(
        {"ministry_id": ministry_id, "active": True, "events": event}, {"_id": 0}
    ).to_list(50)
    if not hooks:
        return
    body = {
        "event": event,
        "ministry_id": ministry_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": payload,
    }

    async def _post(url: str, secret: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=8) as h:
                await h.post(url, json=body, headers={"X-Louvor-Secret": secret, "X-Louvor-Event": event})
        except Exception as e:
            logger.warning("webhook failed url=%s err=%s", url, e)

    for hk in hooks:
        asyncio.create_task(_post(hk["url"], hk.get("secret", "")))


def to_public_user(u: dict) -> UserPublic:
    return UserPublic(
        id=u["id"],
        name=u["name"],
        email=u["email"],
        role=u.get("role", "member"),
        ministry_id=u["ministry_id"],
        instruments=u.get("instruments", []),
        permissions=u.get("permissions", []) if u.get("role") != "leader" else list(ALL_PERMS),
        phone=u.get("phone"),
        avatar_color=u.get("avatar_color", "#2E412A"),
    )


def has_perm(user: dict, perm: str) -> bool:
    if user.get("role") == "leader":
        return True
    return perm in (user.get("permissions") or [])


def require_perm(user: dict, perm: str) -> None:
    if not has_perm(user, perm):
        raise HTTPException(403, "Sem permissão para esta ação")


def require_leader(user: dict) -> None:
    if user.get("role") != "leader":
        raise HTTPException(403, "Apenas líderes podem executar esta ação")


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme)) -> dict:
    if not creds:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# ============= Auth Routes =============
@api.get("/")
async def root():
    return {"app": "LouvorApp", "status": "ok"}


@api.post("/auth/signup", response_model=AuthResp)
async def signup(req: SignupReq):
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(400, "E-mail já cadastrado")

    # Resolve ministry
    ministry_doc = None
    role = "member"
    if req.invite_code:
        ministry_doc = await db.ministries.find_one({"invite_code": req.invite_code.upper()}, {"_id": 0})
        if not ministry_doc:
            raise HTTPException(400, "Código de convite inválido")
    else:
        # Create new ministry
        m_name = req.ministry_name or f"Ministério de {req.name}"
        m = Ministry(name=m_name, invite_code=gen_invite_code(), created_by="pending")
        ministry_doc = m.model_dump()
        await db.ministries.insert_one(ministry_doc.copy())
        role = "leader"

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "role": role,
        "ministry_id": ministry_doc["id"],
        "instruments": [],
        "permissions": [],
        "phone": None,
        "avatar_color": secrets.choice(["#2E412A", "#D96C5B", "#E6B97A", "#4A6E82", "#3E6649"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc.copy())

    if role == "leader":
        await db.ministries.update_one({"id": ministry_doc["id"]}, {"$set": {"created_by": user_id}})
        ministry_doc["created_by"] = user_id

    ministry_doc.pop("_id", None)
    if isinstance(ministry_doc.get("created_at"), datetime):
        ministry_doc["created_at"] = ministry_doc["created_at"].isoformat()

    return AuthResp(token=create_token(user_id), user=to_public_user(user_doc), ministry=ministry_doc)


@api.post("/auth/login", response_model=AuthResp)
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "E-mail ou senha incorretos")
    ministry = await db.ministries.find_one({"id": user["ministry_id"]}, {"_id": 0})
    if ministry and isinstance(ministry.get("created_at"), datetime):
        ministry["created_at"] = ministry["created_at"].isoformat()
    return AuthResp(token=create_token(user["id"]), user=to_public_user(user), ministry=ministry or {})


@api.post("/auth/google", response_model=AuthResp)
async def google_auth(req: GoogleSessionReq):
    """Login with Google via Emergent Auth.

    Frontend redirects to https://auth.emergentagent.com/?redirect=<url>, then sends the returned
    session_id here. We exchange it for user data, then create or update the user and return JWT.
    """
    try:
        async with httpx.AsyncClient(timeout=15) as h:
            r = await h.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
            )
            if r.status_code != 200:
                raise HTTPException(401, "Sessão Google inválida ou expirada")
            data = r.json()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Falha ao validar sessão Google: {e}")

    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    if not email:
        raise HTTPException(400, "Conta Google sem e-mail")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        ministry = await db.ministries.find_one({"id": user["ministry_id"]}, {"_id": 0})
    else:
        # New user: either join via invite or create a new ministry as leader
        ministry_doc = None
        role = "member"
        if req.invite_code:
            ministry_doc = await db.ministries.find_one({"invite_code": req.invite_code.upper()}, {"_id": 0})
            if not ministry_doc:
                raise HTTPException(400, "Código de convite inválido")
        else:
            m_name = req.ministry_name or f"Ministério de {name}"
            m = Ministry(name=m_name, invite_code=gen_invite_code(), created_by="pending")
            ministry_doc = m.model_dump()
            await db.ministries.insert_one(ministry_doc.copy())
            role = "leader"

        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "name": name,
            "email": email,
            "password_hash": None,
            "google_id": data.get("id") or data.get("user_id"),
            "avatar_url": data.get("picture"),
            "role": role,
            "ministry_id": ministry_doc["id"],
            "instruments": [],
            "permissions": [],
            "phone": None,
            "avatar_color": secrets.choice(["#2E412A", "#D96C5B", "#E6B97A", "#4A6E82", "#3E6649"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc.copy())
        if role == "leader":
            await db.ministries.update_one({"id": ministry_doc["id"]}, {"$set": {"created_by": user_id}})
            ministry_doc["created_by"] = user_id
        user = user_doc
        ministry = ministry_doc

    if ministry and isinstance(ministry.get("created_at"), datetime):
        ministry["created_at"] = ministry["created_at"].isoformat()
    return AuthResp(token=create_token(user["id"]), user=to_public_user(user), ministry=ministry or {})


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(current_user)):
    return to_public_user(user)


@api.put("/auth/me", response_model=UserPublic)
async def update_me(req: UpdateProfileReq, user: dict = Depends(current_user)):
    update = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public_user(updated)


# ============= Ministry =============
@api.get("/ministry")
async def get_ministry(user: dict = Depends(current_user)):
    ministry = await db.ministries.find_one({"id": user["ministry_id"]}, {"_id": 0})
    if not ministry:
        return {}
    # Backfill api_key for ministries created before this feature
    if not ministry.get("api_key"):
        new_key = gen_api_key()
        await db.ministries.update_one({"id": user["ministry_id"]}, {"$set": {"api_key": new_key}})
        ministry["api_key"] = new_key
    if isinstance(ministry.get("created_at"), datetime):
        ministry["created_at"] = ministry["created_at"].isoformat()
    return ministry


@api.post("/ministry/api-key/rotate")
async def rotate_api_key(user: dict = Depends(current_user)):
    if user.get("role") != "leader":
        raise HTTPException(403, "Apenas o líder pode rotacionar a chave de API")
    new_key = gen_api_key()
    await db.ministries.update_one({"id": user["ministry_id"]}, {"$set": {"api_key": new_key}})
    return {"api_key": new_key}


@api.get("/ministry/members", response_model=List[UserPublic])
async def list_members(user: dict = Depends(current_user)):
    members = await db.users.find({"ministry_id": user["ministry_id"]}, {"_id": 0, "password_hash": 0}).to_list(500)
    return [to_public_user(m) for m in members]


@api.put("/ministry/members/{member_id}", response_model=UserPublic)
async def update_member(member_id: str, req: UpdateMemberReq, current: dict = Depends(current_user)):
    """Leader-only: promote/demote a member or set individual permissions."""
    require_leader(current)
    target = await db.users.find_one(
        {"id": member_id, "ministry_id": current["ministry_id"]}, {"_id": 0}
    )
    if not target:
        raise HTTPException(404, "Membro não encontrado")

    update: dict = {}
    if req.role is not None:
        # prevent demoting the last remaining leader
        if req.role == "member" and target.get("role") == "leader":
            other_leaders = await db.users.count_documents({
                "ministry_id": current["ministry_id"], "role": "leader", "id": {"$ne": member_id}
            })
            if other_leaders == 0:
                raise HTTPException(400, "O ministério precisa de ao menos um líder")
        update["role"] = req.role
    if req.permissions is not None:
        invalid = [p for p in req.permissions if p not in ALL_PERMS]
        if invalid:
            raise HTTPException(400, f"Permissões inválidas: {invalid}")
        update["permissions"] = req.permissions

    if not update:
        raise HTTPException(400, "Nada para atualizar")

    await db.users.update_one({"id": member_id}, {"$set": update})
    updated = await db.users.find_one({"id": member_id}, {"_id": 0, "password_hash": 0})
    return to_public_user(updated)


# ============= Songs =============
@api.post("/songs", response_model=Song)
async def create_song(req: SongCreate, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SONGS)
    song = Song(**req.model_dump(), ministry_id=user["ministry_id"])
    doc = song.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.songs.insert_one(doc.copy())
    return song


@api.get("/songs", response_model=List[Song])
async def list_songs(user: dict = Depends(current_user)):
    songs = await db.songs.find({"ministry_id": user["ministry_id"]}, {"_id": 0}).sort("title", 1).to_list(1000)
    return songs


@api.get("/songs/{song_id}", response_model=Song)
async def get_song(song_id: str, user: dict = Depends(current_user)):
    s = await db.songs.find_one({"id": song_id, "ministry_id": user["ministry_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Música não encontrada")
    return s


@api.put("/songs/{song_id}", response_model=Song)
async def update_song(song_id: str, req: SongCreate, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SONGS)
    res = await db.songs.update_one(
        {"id": song_id, "ministry_id": user["ministry_id"]}, {"$set": req.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Música não encontrada")
    return await db.songs.find_one({"id": song_id}, {"_id": 0})


@api.delete("/songs/{song_id}")
async def delete_song(song_id: str, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SONGS)
    res = await db.songs.delete_one({"id": song_id, "ministry_id": user["ministry_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Música não encontrada")
    return {"ok": True}


# ============= Scales =============
@api.post("/scales", response_model=Scale)
async def create_scale(req: ScaleCreate, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SCALES)
    scale = Scale(**req.model_dump(), ministry_id=user["ministry_id"], created_by=user["id"])
    doc = scale.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.scales.insert_one(doc.copy())
    await trigger_webhooks(user["ministry_id"], "scale.created", doc)
    return scale


@api.get("/scales", response_model=List[Scale])
async def list_scales(user: dict = Depends(current_user)):
    scales = await db.scales.find({"ministry_id": user["ministry_id"]}, {"_id": 0}).sort("date", 1).to_list(500)
    return scales


@api.get("/scales/{scale_id}", response_model=Scale)
async def get_scale(scale_id: str, user: dict = Depends(current_user)):
    s = await db.scales.find_one({"id": scale_id, "ministry_id": user["ministry_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Escala não encontrada")
    return s


@api.put("/scales/{scale_id}", response_model=Scale)
async def update_scale(scale_id: str, req: ScaleCreate, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SCALES)
    res = await db.scales.update_one(
        {"id": scale_id, "ministry_id": user["ministry_id"]}, {"$set": req.model_dump()}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Escala não encontrada")
    updated = await db.scales.find_one({"id": scale_id}, {"_id": 0})
    await trigger_webhooks(user["ministry_id"], "scale.updated", updated)
    return updated


@api.delete("/scales/{scale_id}")
async def delete_scale(scale_id: str, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_SCALES)
    res = await db.scales.delete_one({"id": scale_id, "ministry_id": user["ministry_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Escala não encontrada")
    await trigger_webhooks(user["ministry_id"], "scale.deleted", {"id": scale_id})
    return {"ok": True}


@api.get("/scales/{scale_id}/export.html", response_class=HTMLResponse)
async def export_scale_html(scale_id: str, user: dict = Depends(current_user)):
    """Renderiza a escala em HTML pronto para imprimir/converter em PDF/Imagem."""
    s = await db.scales.find_one({"id": scale_id, "ministry_id": user["ministry_id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Escala não encontrada")
    songs = []
    if s.get("song_ids"):
        docs = await db.songs.find(
            {"ministry_id": user["ministry_id"], "id": {"$in": s["song_ids"]}}, {"_id": 0}
        ).to_list(len(s["song_ids"]))
        by_id = {d["id"]: d for d in docs}
        songs = [by_id[sid] for sid in s["song_ids"] if sid in by_id]
    ministry = await db.ministries.find_one({"id": user["ministry_id"]}, {"_id": 0}) or {}

    def _fmt_date(iso: str) -> str:
        try:
            y, m, d = iso.split("T")[0].split("-")
            return f"{d}/{m}/{y}"
        except Exception:
            return iso

    musicians_html = "".join(
        f'<li><strong>{a["user_name"]}</strong> — <span class="instr">{a["instrument"]}</span></li>'
        for a in s.get("assignments", [])
    ) or "<li class='muted'>Nenhum músico atribuído</li>"

    songs_html = "".join(
        f'<li><strong>{i+1}. {sg["title"]}</strong>'
        + (f' <span class="muted">— {sg.get("artist","")}</span>' if sg.get("artist") else "")
        + (f' <span class="badge">Tom: {sg["key"]}</span>' if sg.get("key") else "")
        + (f' <span class="badge">{sg["bpm"]} BPM</span>' if sg.get("bpm") else "")
        + "</li>"
        for i, sg in enumerate(songs)
    ) or "<li class='muted'>Sem repertório</li>"

    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>{s['title']}</title>
<style>
*{{box-sizing:border-box}}
body{{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;color:#1A2118;background:#FDFBF7}}
.card{{background:#2E412A;color:#fff;border-radius:24px;padding:24px;margin-bottom:18px}}
.card h1{{margin:0 0 8px;font-size:26px}}
.card .meta{{color:#E6B97A;font-size:13px;text-transform:uppercase;letter-spacing:1.2px}}
.card .row{{margin-top:6px;opacity:.9;font-size:14px}}
h2{{font-size:13px;letter-spacing:1.4px;color:#5C6658;margin:18px 0 8px}}
ul{{list-style:none;padding:0;margin:0}}
li{{background:#fff;border:1px solid #EBE8DF;border-radius:14px;padding:12px 14px;margin-bottom:8px;font-size:14px}}
.muted{{color:#5C6658}}
.instr{{color:#2E412A;font-weight:600}}
.badge{{background:#F4F1E8;color:#2E412A;border-radius:8px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:6px}}
.foot{{margin-top:18px;font-size:11px;color:#A1A89D;text-align:center}}
@media print{{body{{padding:0}}}}
</style></head>
<body>
<div class="card">
  <div class="meta">{ministry.get('name','')}</div>
  <h1>{s['title']}</h1>
  <div class="row">📅 {_fmt_date(s['date'])} • {s.get('time','')}</div>
  {f'<div class="row">📍 {s.get("location","")}</div>' if s.get('location') else ''}
  {f'<div class="row">📝 {s.get("notes","")}</div>' if s.get('notes') else ''}
</div>
<h2>MÚSICOS ({len(s.get('assignments', []))})</h2>
<ul>{musicians_html}</ul>
<h2>REPERTÓRIO ({len(songs)})</h2>
<ul>{songs_html}</ul>
<div class="foot">Gerado por LouvorApp</div>
</body></html>"""


# ============= Announcements =============
@api.post("/announcements", response_model=Announcement)
async def create_announcement(req: AnnouncementCreate, user: dict = Depends(current_user)):
    require_perm(user, PERM_EDIT_ANNOUNCEMENTS)
    a = Announcement(
        **req.model_dump(),
        ministry_id=user["ministry_id"],
        author_id=user["id"],
        author_name=user["name"],
    )
    doc = a.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.announcements.insert_one(doc.copy())
    return a


@api.get("/announcements", response_model=List[Announcement])
async def list_announcements(user: dict = Depends(current_user)):
    items = (
        await db.announcements.find({"ministry_id": user["ministry_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(200)
    )
    return items


@api.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, user: dict = Depends(current_user)):
    # Anyone with edit_announcements (or leader) can delete any; otherwise author-only
    target = await db.announcements.find_one({"id": ann_id, "ministry_id": user["ministry_id"]}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Aviso não encontrado")
    if not has_perm(user, PERM_EDIT_ANNOUNCEMENTS) and target.get("author_id") != user["id"]:
        raise HTTPException(403, "Sem permissão para excluir este aviso")
    await db.announcements.delete_one({"id": ann_id, "ministry_id": user["ministry_id"]})
    return {"ok": True}


# ============= Stats =============
@api.get("/stats")
async def stats(user: dict = Depends(current_user)):
    mid = user["ministry_id"]
    today_iso = datetime.now(timezone.utc).date().isoformat()
    return {
        "total_members": await db.users.count_documents({"ministry_id": mid}),
        "total_songs": await db.songs.count_documents({"ministry_id": mid}),
        "upcoming_scales": await db.scales.count_documents({"ministry_id": mid, "date": {"$gte": today_iso}}),
        "total_announcements": await db.announcements.count_documents({"ministry_id": mid}),
    }


app.include_router(api)


# ============= Availability =============
av = APIRouter(prefix="/api/availability", tags=["availability"])


@av.post("", response_model=Availability)
async def set_availability(req: AvailabilityCreate, user: dict = Depends(current_user)):
    """Marca disponibilidade do usuário em uma data (upsert por user+date)."""
    doc_existing = await db.availability.find_one(
        {"user_id": user["id"], "date": req.date, "ministry_id": user["ministry_id"]}, {"_id": 0}
    )
    if doc_existing:
        await db.availability.update_one(
            {"id": doc_existing["id"]},
            {"$set": {"status": req.status, "note": req.note}},
        )
        doc = await db.availability.find_one({"id": doc_existing["id"]}, {"_id": 0})
        return doc
    a = Availability(
        **req.model_dump(),
        user_id=user["id"],
        user_name=user["name"],
        ministry_id=user["ministry_id"],
    )
    d = a.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    await db.availability.insert_one(d.copy())
    return a


@av.get("/me", response_model=List[Availability])
async def my_availability(user: dict = Depends(current_user)):
    items = (
        await db.availability.find({"user_id": user["id"]}, {"_id": 0})
        .sort("date", 1)
        .to_list(500)
    )
    today = datetime.now(timezone.utc).date().isoformat()
    return [i for i in items if i["date"] >= today]


@av.get("/ministry")
async def ministry_availability(date: Optional[str] = None, user: dict = Depends(current_user)):
    """Disponibilidade do ministério.
    - Se date informado: retorna lista de status por membro para a data
    - Sem date: agrupa por data (próximas 60 entradas)
    """
    today = datetime.now(timezone.utc).date().isoformat()
    if date:
        items = await db.availability.find(
            {"ministry_id": user["ministry_id"], "date": date}, {"_id": 0}
        ).to_list(500)
        return {"date": date, "entries": items}
    items = (
        await db.availability.find(
            {"ministry_id": user["ministry_id"], "date": {"$gte": today}}, {"_id": 0}
        )
        .sort("date", 1)
        .to_list(500)
    )
    grouped: dict = {}
    for it in items:
        grouped.setdefault(it["date"], []).append(it)
    return {"by_date": grouped}


@av.delete("/{availability_id}")
async def delete_availability(availability_id: str, user: dict = Depends(current_user)):
    res = await db.availability.delete_one(
        {"id": availability_id, "user_id": user["id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Registro não encontrado")
    return {"ok": True}


app.include_router(av)


# ============= Webhooks =============
wh = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@wh.post("", response_model=Webhook)
async def create_webhook(req: WebhookCreate, user: dict = Depends(current_user)):
    require_leader(user)
    if not req.url.startswith("http"):
        raise HTTPException(400, "URL inválida")
    w = Webhook(**req.model_dump(), ministry_id=user["ministry_id"])
    d = w.model_dump()
    d["created_at"] = d["created_at"].isoformat()
    await db.webhooks.insert_one(d.copy())
    return w


@wh.get("", response_model=List[Webhook])
async def list_webhooks(user: dict = Depends(current_user)):
    require_leader(user)
    items = await db.webhooks.find(
        {"ministry_id": user["ministry_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items


@wh.delete("/{webhook_id}")
async def delete_webhook(webhook_id: str, user: dict = Depends(current_user)):
    require_leader(user)
    res = await db.webhooks.delete_one(
        {"id": webhook_id, "ministry_id": user["ministry_id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(404, "Webhook não encontrado")
    return {"ok": True}


@wh.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, user: dict = Depends(current_user)):
    require_leader(user)
    hook = await db.webhooks.find_one(
        {"id": webhook_id, "ministry_id": user["ministry_id"]}, {"_id": 0}
    )
    if not hook:
        raise HTTPException(404, "Webhook não encontrado")
    try:
        async with httpx.AsyncClient(timeout=10) as h:
            r = await h.post(
                hook["url"],
                json={
                    "event": "webhook.test",
                    "ministry_id": user["ministry_id"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": {"hello": "world"},
                },
                headers={"X-Louvor-Secret": hook.get("secret", ""), "X-Louvor-Event": "webhook.test"},
            )
            return {"ok": True, "status_code": r.status_code}
    except Exception as e:
        raise HTTPException(502, f"Falha ao chamar webhook: {e}")


app.include_router(wh)


# ============= Push tokens =============
pt = APIRouter(prefix="/api/push", tags=["push"])


@pt.post("/token")
async def register_push_token(req: PushTokenReq, user: dict = Depends(current_user)):
    """Registra/atualiza um Expo Push Token para o usuário (opcional)."""
    if not req.token:
        raise HTTPException(400, "Token vazio")
    await db.push_tokens.update_one(
        {"user_id": user["id"], "token": req.token},
        {"$set": {
            "user_id": user["id"],
            "token": req.token,
            "platform": req.platform or "expo",
            "ministry_id": user["ministry_id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@pt.delete("/token")
async def delete_push_token(req: PushTokenReq, user: dict = Depends(current_user)):
    await db.push_tokens.delete_one({"user_id": user["id"], "token": req.token})
    return {"ok": True}


app.include_router(pt)


# ============= External API (for metronome/other apps) =============
ext = APIRouter(prefix="/api/external", tags=["external"])


async def ministry_from_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> dict:
    if not x_api_key:
        raise HTTPException(401, "Missing X-API-Key header")
    m = await db.ministries.find_one({"api_key": x_api_key}, {"_id": 0})
    if not m:
        raise HTTPException(401, "Invalid API key")
    return m


def _song_external(s: dict) -> dict:
    return {
        "id": s["id"],
        "title": s["title"],
        "artist": s.get("artist") or "",
        "key": s.get("key") or "",
        "bpm": s.get("bpm"),
        "youtube_url": s.get("youtube_url") or "",
        "cifra_url": s.get("cifra_url") or "",
        "tags": s.get("tags") or [],
    }


@ext.get("/ministry")
async def ext_ministry(m: dict = Depends(ministry_from_key)):
    return {"id": m["id"], "name": m["name"]}


@ext.get("/songs")
async def ext_songs(m: dict = Depends(ministry_from_key)):
    """Lista completa de músicas do ministério (com BPM e tom)."""
    songs = (
        await db.songs.find({"ministry_id": m["id"]}, {"_id": 0})
        .sort("title", 1)
        .to_list(2000)
    )
    return {"ministry_id": m["id"], "count": len(songs), "songs": [_song_external(s) for s in songs]}


@ext.get("/scales")
async def ext_scales(
    upcoming: bool = True,
    limit: int = 50,
    m: dict = Depends(ministry_from_key),
):
    """Lista escalas (eventos) com músicas e BPM já embutidos — pronto para sync de metrônomo.

    Query params:
    - upcoming=true (padrão): retorna apenas escalas a partir de hoje
    - limit=50 (max 200)
    """
    limit = max(1, min(limit, 200))
    query: dict = {"ministry_id": m["id"]}
    if upcoming:
        today = datetime.now(timezone.utc).date().isoformat()
        query["date"] = {"$gte": today}
    scales = await db.scales.find(query, {"_id": 0}).sort("date", 1).to_list(limit)

    # Hydrate songs
    all_song_ids: set = set()
    for s in scales:
        for sid in s.get("song_ids", []):
            all_song_ids.add(sid)
    song_map: dict = {}
    if all_song_ids:
        docs = await db.songs.find(
            {"ministry_id": m["id"], "id": {"$in": list(all_song_ids)}}, {"_id": 0}
        ).to_list(len(all_song_ids))
        song_map = {d["id"]: _song_external(d) for d in docs}

    result = []
    for s in scales:
        result.append({
            "id": s["id"],
            "title": s["title"],
            "date": s["date"],
            "time": s.get("time") or "",
            "location": s.get("location") or "",
            "notes": s.get("notes") or "",
            "songs": [song_map[sid] for sid in s.get("song_ids", []) if sid in song_map],
            "musicians": s.get("assignments", []),
        })
    return {"ministry_id": m["id"], "count": len(result), "scales": result}


@ext.get("/scales/{scale_id}")
async def ext_scale_detail(scale_id: str, m: dict = Depends(ministry_from_key)):
    """Detalhe de uma escala específica com setlist completo e BPM por música."""
    s = await db.scales.find_one({"id": scale_id, "ministry_id": m["id"]}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Scale not found")
    songs = []
    if s.get("song_ids"):
        docs = await db.songs.find(
            {"ministry_id": m["id"], "id": {"$in": s["song_ids"]}}, {"_id": 0}
        ).to_list(len(s["song_ids"]))
        by_id = {d["id"]: d for d in docs}
        # preserve original order
        songs = [_song_external(by_id[sid]) for sid in s["song_ids"] if sid in by_id]
    return {
        "id": s["id"],
        "title": s["title"],
        "date": s["date"],
        "time": s.get("time") or "",
        "location": s.get("location") or "",
        "notes": s.get("notes") or "",
        "songs": songs,
        "musicians": s.get("assignments", []),
    }


app.include_router(ext)


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
