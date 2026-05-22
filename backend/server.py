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

api = APIRouter(prefix="/api")

def generate_invite_code() -> str:
    """Gera um código único de 6 caracteres alfanuméricos para o ministério."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extrai o ID do usuário real que vem no Token do Frontend."""
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

    if data.ministry_name and data.ministry_name.strip():
        ministry_id = str(uuid.uuid4())
        invite_code = generate_invite_code()
        role = "leader"
        
        await db.ministries.insert_one({
            "id": ministry_id,
            "name": data