"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import random
import string
import uuid
from typing import Optional

# ==================== CORREÇÃO: IMPORTAÇÃO DO DOTENV ====================
from dotenv import load_dotenv

# ==================== SCHEMAS (Modelos de Dados) ====================
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

class GoogleAuthSchema(BaseModel):
    token: Optional[str] = None
    session_id: Optional[str] = None

# ==================== CONFIGURAÇÃO INICIAL ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    raise ValueError("ERRO CRÍTICO: MONGO_URL ou DB_NAME não definidos nas variáveis de ambiente!")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter()

def generate_invite_code() -> str:
    """Gera um código único de 6 caracteres alfanuméricos para o ministério."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

# DEPENDÊNCIA EXTRA: Extrai o ID do usuário real que vem no Token do Frontend
async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autorização ausente ou inválido")
    token = authorization.split(" ")[1]
    return token

# ==================== ROTAS DE AUTENTICAÇÃO ====================

@api.post("/signup")
async def signup(data: SignupSchema):
    """Regista um novo utilizador real e cria ou vincula um ministério"""
    existing_user = await db.users.find_one({"email": data.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")

    user_id = str(uuid.uuid4())
    ministry_id = None
    role = "member"

    # Se informou nome do ministério, ele é o líder de um novo ministério
    if data.ministry_name and data.ministry_name.strip():
        ministry_id = str(uuid.uuid4())
        invite_code = generate_invite_code()
        role = "leader"
        
        await db.ministries.insert_one({
            "id": ministry_id,
            "name": data.ministry_name.strip(),
            "invite_code": invite_code,
            "created_by": user_id
        })
    # Se informou código, vincula ao ministério existente
    elif data.invite_code and data.invite_code.strip():
        ministry = await db.ministries.find_one({"invite_code": data.invite_code.upper().strip()})
        if not ministry:
            raise HTTPException(status_code=404, detail="Código de convite não encontrado.")
        ministry_id = ministry["id"]
        role = "member"
    else:
        raise HTTPException(status_code=400, detail="Informe um código de convite ou crie um ministério.")

    avatar_colors = ["#FF6B6B", "#4D96FF", "#6BCB77", "#9B5DE5", "#F15BB5"]
    new_user = {
        "id": user_id,
        "name": data.name.strip(),
        "email": data.email.lower(),
        "password": data.password,
        "role": role,
        "ministry_id": ministry_id,
        "avatar_color": random.choice(avatar_colors)
    }
    
    await db.users.insert_one(new_user)
    current_ministry = await db.ministries.find_one({"id": ministry_id})

    return {
        "success": True,
        "token": user_id,
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "name": new_user["name"],
            "role": new_user["role"],
            "avatar_color": new_user["avatar_color"]
        },
        "ministry": {
            "id": current_ministry["id"],
            "name": current_ministry["name"],
            "invite_code": current_ministry["invite_code"]
        }
    }

@api.post("/login")
async def login(credentials: LoginSchema):
    """Autentica o utilizador lendo os dados reais do MongoDB"""
    user = await db.users.find_one({"email": credentials.email.lower(), "password": credentials.password})
    if not user:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    ministry = await db.ministries.find_one({"id": user["ministry_id"]})

    return {
        "success": True,
        "token": user["id"],
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "avatar_color": user.get("avatar_color", "#FF6B6B")
        },
        "ministry": {
            "id": ministry["id"] if ministry else "none",
            "name": ministry["name"] if ministry else "Sem Ministério",
            "invite_code": ministry["invite_code"] if ministry else ""
        }
    }

# ==================== ROTAS DE SESSÃO DINÂMICA (PONTO 13 CORRIGIDO) ====================

@api.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user_id)):
    """Retorna os dados REAIS do utilizador autenticado vindos do Banco de Dados"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "ministry_id": user["ministry_id"],
        "avatar_color": user.get("avatar_color", "#FF6B6B")
    }

@api.get("/ministry")
async def get_ministry(user_id: str = Depends(get_current_user_id)):
    """Retorna os dados REAIS do ministério do utilizador vindos do Banco de Dados"""
    user = await db.users.find_one({"id": user_id})
    if not user or not user.get("ministry_id"):
        raise HTTPException(status_code=404, detail="Ministério não associado a este utilizador")
        
    ministry = await db.ministries.find_one({"id": user["ministry_id"]})
    if not ministry:
        raise HTTPException(status_code=404, detail="Ministério não encontrado no banco")

    return {
        "id": ministry["id"],
        "name": ministry["name"],
        "invite_code": ministry["invite_code"],
        "created_by": ministry.get("created_by")
    }

# ==================== ENDPOINTS DE SUPORTE AO DASHBOARD ====================

@api.get("/stats")
async def get_stats(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id})
    m_id = user["ministry_id"] if user else "none"
    
    members_count = await db.users.count_documents({"ministry_id": m_id})
    songs_count = await db.songs.count_documents({"ministry_id": m_id}) if hasattr(db, 'songs') else 0
    scales_count = await db.scales.count_documents({"ministry_id": m_id}) if hasattr(db, 'scales') else 0
    
    return {
        "total_members": members_count,
        "total_songs": songs_count,
        "upcoming_scales": scales_count,
        "total_announcements": 0
    }

@api.get("/scales")
async def get_scales(user_id: str = Depends(get_current_user_id)):
    return []

@api.get("/announcements")
async def get_announcements(user_id: str = Depends(get_current_user_id)):
    return []

app.include_router(api)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"name": "LouvorApp API", "status": "running"}