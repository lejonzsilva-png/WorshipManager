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
DB_NAME = os.getenv("DB_NAME", "worshipmanager")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

if not MONGO_URL or not JWT_SECRET:
    raise ValueError("ERRO: MONGO_URL e JWT_SECRET são obrigatórios no .env!")

print(f"🔗 Conectando ao MongoDB: {DB_NAME}")

client = AsyncIOMotorClient(
    MONGO_URL, 
    serverSelectionTimeoutMS=10000, 
    connectTimeoutMS=10000
)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://worshipmanager-2jqw.onrender.com",   # Seu frontend atual
        "http://localhost:8081",
        "http://localhost:3000",
        "https://worshipmanageraapp.onrender.com",
        "*"  # Temporário para teste
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
api = APIRouter(prefix="/api")

# ==================== SCHEMAS ====================
class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

# ==================== HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_invite_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

# ==================== ROTAS ====================

@api.post("/signup")
async def signup(data: SignupSchema):
    try:
        print(f"📝 Tentativa de cadastro: {data.email}")

        existing = await db.users.find_one({"email": data.email.lower()})
        if existing:
            print("❌ E-mail já existe")
            raise HTTPException(400, "E-mail já cadastrado.")

        user_id = str(uuid.uuid4())
        ministry_id = None

        if data.ministry_name:
            ministry_id = str(uuid.uuid4())
            await db.ministries.insert_one({
                "id": ministry_id,
                "name": data.ministry_name.strip(),
                "invite_code": generate_invite_code(),
                "created_by": user_id,
                "created_at": datetime.utcnow()
            })
            role = "leader"
        elif data.invite_code:
            ministry = await db.ministries.find_one({"invite_code": data.invite_code.upper()})
            if not ministry:
                raise HTTPException(404, "Código de convite inválido.")
            ministry_id = ministry["id"]
            role = "member"
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

        print(f"✅ Usuário criado com sucesso: {data.email}")
        return {
            "success": True,
            "token": token,
            "user": {k: v for k, v in new_user.items() if k != "password"},
            "ministry": ministry
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print("❌ Erro no signup:", str(e))
        raise HTTPException(500, f"Erro interno: {str(e)}")

app.include_router(api)

@app.get("/health")
async def health():
    return {"status": "healthy", "db": DB_NAME}

@app.get("/")
async def root():
    return {"app": "LouvorApp API", "status": "running"}