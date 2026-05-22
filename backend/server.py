"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import random
import string
import uuid
import jwt
import bcrypt
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime, timedelta

# ==================== CONFIG ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

if not MONGO_URL or not DB_NAME or not JWT_SECRET:
    raise ValueError("ERRO: MONGO_URL, DB_NAME e JWT_SECRET são obrigatórios!")

# MongoDB Connection
client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Mudar para domínios específicos em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

# ==================== SCHEMAS ====================
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

# ==================== HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    
    token = authorization.split(" ")[1]
    return decode_jwt(token)

def generate_invite_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

# ==================== ROTAS ====================

@api.post("/signup")
async def signup(data: SignupSchema):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "E-mail já cadastrado.")

    user_id = str(uuid.uuid4())
    ministry_id = None
    role = "member"

    if data.ministry_name:
        ministry_id = str(uuid.uuid4())
        role = "leader"
        await db.ministries.insert_one({
            "id": ministry_id,
            "name": data.ministry_name.strip(),
            "invite_code": generate_invite_code(),
            "created_by": user_id,
            "created_at": datetime.utcnow()
        })
    elif data.invite_code:
        ministry = await db.ministries.find_one({"invite_code": data.invite_code.upper()})
        if not ministry:
            raise HTTPException(404, "Código de convite inválido.")
        ministry_id = ministry["id"]
    else:
        raise HTTPException(400, "Informe ministry_name ou invite_code.")

    new_user = {
        "id": user_id,
        "name": data.name.strip(),
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "role": role,
        "ministry_id": ministry_id,
        "avatar_color": random.choice(["#FF6B6B", "#4D96FF", "#6BCB77", "#9B5DE5", "#F15BB5"]),
        "created_at": datetime.utcnow()
    }

    await db.users.insert_one(new_user)
    ministry = await db.ministries.find_one({"id": ministry_id})

    token = create_jwt(user_id)

    return {
        "success": True,
        "token": token,
        "user": {k: v for k, v in new_user.items() if k != "password"},
        "ministry": ministry
    }

@api.post("/login")
async def login(credentials: LoginSchema):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    ministry = await db.ministries.find_one({"id": user["ministry_id"]})
    token = create_jwt(user["id"])

    return {
        "success": True,
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"},
        "ministry": ministry
    }

@api.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    return {k: v for k, v in user.items() if k != "password"}

# Outras rotas mantidas (stats, ministry, etc.)
@api.get("/ministry")
async def get_ministry(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("ministry_id"):
        raise HTTPException(404, "Ministério não encontrado")
    ministry = await db.ministries.find_one({"id": user["ministry_id"]})
    return ministry

@api.get("/stats")
async def get_stats(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id})
    m_id = user.get("ministry_id") if user else None
    return {
        "total_members": await db.users.count_documents({"ministry_id": m_id}) if m_id else 0,
        "total_songs": 0,  # implementar depois
        "upcoming_scales": 0
    }

app.include_router(api)

@app.get("/health")
async def health():
    return {"status": "healthy", "time": datetime.utcnow()}

@app.get("/")
async def root():
    return {"app": "LouvorApp API", "status": "running"}