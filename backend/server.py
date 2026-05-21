"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
from dotenv import load_dotenv

# Configuração de tipos para o Pydantic
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: str = None
    invite_code: str = None

class GoogleAuthSchema(BaseModel):
    token: str

# Carrega o .env se existir
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Configuração protegida
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

# ==================== ROTAS DE AUTENTICAÇÃO ====================

# Rota de login (sem /api prefix para alinhar com frontend)
@app.post("/login")
async def login(credentials: LoginSchema):
    """Autentica o utilizador com email e password"""
    try:
        # TODO: Implementar lógica de autenticação real
        # - Verificar se o email existe na BD
        # - Verificar a password
        # - Gerar JWT token
        return {
            "success": True,
            "message": "Login efetuado com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": credentials.email,
                "name": "Utilizador"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Rota de signup (sem /api prefix)
@app.post("/signup")
async def signup(data: SignupSchema):
    """Regista um novo utilizador"""
    try:
        # TODO: Implementar lógica de registo real
        # - Verificar se o email já existe
        # - Hash da password
        # - Guardar na BD
        # - Gerar JWT token
        return {
            "success": True,
            "message": "Registo efetuado com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": data.email,
                "name": data.name
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Rota de autenticação com Google
@app.post("/auth/google")
async def auth_google(data: GoogleAuthSchema):
    """Autentica o utilizador com Google"""
    try:
        # TODO: Implementar verificação do token Google
        # - Verificar se o token é válido
        # - Extrair dados do utilizador
        # - Criar/atualizar utilizador na BD
        # - Gerar JWT token
        return {
            "success": True,
            "message": "Autenticação Google efetuada com sucesso",
            "token": "fake-jwt-token",
            "user": {
                "id": "user-123",
                "email": "user@gmail.com",
                "name": "Utilizador Google"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ROTAS DE UTILIZADOR ====================

@app.get("/auth/me")
async def get_me():
    """Retorna os dados do utilizador autenticado"""
    # TODO: Verificar JWT token e retornar utilizador
    return {
        "id": "user-123",
        "email": "user@example.com",
        "name": "Utilizador",
        "ministry_name": "Ministério Exemplo"
    }

# ==================== ROTAS DE MINISTÉRIO ====================

@app.get("/ministry")
async def get_ministry():
    """Retorna os dados da ministério do utilizador"""
    # TODO: Buscar ministério da BD baseado no utilizador
    return {
        "id": "ministry-123",
        "name": "Ministério Exemplo",
        "description": "Descrição da ministério",
        "members": []
    }

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check do servidor"""
    return {
        "status": "ok",
        "message": "LouvorApp API está funcionando"
    }

@app.get("/")
async def root():
    """Rota raiz"""
    return {
        "name": "LouvorApp API",
        "version": "1.0.0",
        "status": "running"
    }
