"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status, Request
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
import bcrypt
import jwt
import uuid
import secrets
import string
import httpx
import asyncio
from datetime import datetime, timezone, timedelta

# Carrega o .env se existir (para testes locais)
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Configuração protegida para evitar erros de arranque no Render
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    # Isto vai aparecer no log do Render se as variáveis não estiverem lá
    raise ValueError("ERRO CRÍTICO: MONGO_URL ou DB_NAME não definidos nas variáveis de ambiente do Render!")

JWT_SECRET = os.environ.get("JWT_SECRET", "louvorapp-dev-secret-change-in-prod-2026")
JWT_ALG = "HS256"
JWT_EXP_DAYS = 30

# Inicializa o cliente MongoDB
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")
api = APIRouter(prefix="/api")
auth_scheme = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("louvorapp")

