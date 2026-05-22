"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
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
    raise ValueError("ERRO CRÍTICO: MONGO_URL ou DB_NAME não definidos nas variáveis de ambiente do Render!")

# Inicializa o cliente MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")

# 1. Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== CRIAR ROUTER SEM PREFIXO ====================
# Alterado para remover prefixo=/api para resolver problemas de rotas 404
api = APIRouter()

# ==================== ROTAS DE AUTENTICAÇÃO ====================

@api.post("/login")
async def login(credentials: LoginSchema):
    """Autentica o utilizador com email e password"""
    try:
        return {
            "success": True,
            "message": "Login efetuado com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": credentials.email,
                "name": "Utilizador",
                "role": "member",
                "ministry_id": "ministry-123",
                "instruments": [],
                "permissions": [],
                "phone": None,
                "avatar_color": "#FF6B6B"
            },
            "ministry": {
                "id": "ministry-123",
                "name": "Ministério Exemplo",
                "invite_code": "ABC123",
                "api_key": "key-123",
                "created_by": "user-123"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api.post("/signup")
async def signup(data: SignupSchema):
    """Regista um novo utilizador"""
    try:
        return {
            "success": True,
            "message": "Registo efetuado com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": data.email,
                "name": data.name,
                "role": "member",
                "ministry_id": "ministry-123",
                "instruments": [],
                "permissions": [],
                "phone": None,
                "avatar_color": "#FF6B6B"
            },
            "ministry": {
                "id": "ministry-123",
                "name": data.ministry_name or "Meu Ministério",
                "invite_code": data.invite_code or "ABC123",
                "api_key": "key-123",
                "created_by": "user-123"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api.post("/auth/google")
async def auth_google(data: GoogleAuthSchema):
    """Autentica o utilizador com Google"""
    try:
        auth_value = data.token or data.session_id
        if not auth_value:
            raise HTTPException(status_code=400, detail="É necessário enviar 'token' ou 'session_id'")
        
        return {
            "success": True,
            "message": "Autenticação Google efetuada com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": "user@gmail.com",
                "name": "Utilizador Google",
                "role": "member",
                "ministry_id": "ministry-123",
                "instruments": [],
                "permissions": [],
                "phone": None,
                "avatar_color": "#FF6B6B"
            },
            "ministry": {
                "id": "ministry-123",
                "name": "Ministério Google",
                "invite_code": "ABC123",
                "api_key": "key-123",
                "created_by": "user-123"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ROTAS DE UTILIZADOR ====================

@api.get("/auth/me")
async def get_me():
    """Retorna os dados do utilizador autenticado"""
    return {
        "id": "user-123",
        "email": "user@example.com",
        "name": "Utilizador",
        "role": "member",
        "ministry_id": "ministry-123",
        "instruments": [],
        "permissions": [],
        "phone": None,
        "avatar_color": "#FF6B6B"
    }

# ==================== ROTAS DE MINISTÉRIO ====================

@api.get("/ministry")
async def get_ministry():
    """Retorna os dados do ministério do utilizador"""
    return {
        "id": "ministry-123",
        "name": "Ministério Exemplo",
        "invite_code": "ABC123",
        "api_key": "key-123",
        "created_by": "user-123"
    }

# ==================== INCLUIR ROUTER ====================
app.include_router(api)

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "LouvorApp API está funcionando"}

@app.get("/")
async def root():
    return {"name": "LouvorApp API", "version": "1.0.0", "status": "running"}