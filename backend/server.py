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

# ✅ CORREÇÃO: Força o prefixo /api para casar exatamente com o client.ts do Frontend
api = APIRouter(prefix="/api")

def generate_invite_code() -> str: