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

api = APIRouter(prefix="/api")

# Rotas corrigidas para alinhar com o AuthContext.tsx
@api.post("/login")
async def login(credentials: LoginSchema):
    # Logica de autenticacao
    return {"message": "Login efetuado com sucesso"}

@api.post("/signup")
async def signup(data: SignupSchema):
    # Logica de registo
    return {"message": "Registo efetuado com sucesso"}

@api.get("/auth/me")
async def get_me():
    # Logica para retornar o utilizador
    return {"message": "Dados do utilizador"}

@api.get("/ministry")
async def get_ministry():
    # Logica para retornar a ministério
    return {"message": "Dados da ministério"}

app.include_router(api) # Onde 'api' foi definido com prefix="/api"