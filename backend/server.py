"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import uuid
import jwt
import bcrypt
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
# ... (Keep existing imports)
from pydantic import BaseModel, EmailStr

# Define schemas at the TOP
class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# ... (Keep the rest of your config and app setup)


# ==================== CONFIG ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "worshipmanager")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGO_URL or not JWT_SECRET:
    raise ValueError("ERRO: Variáveis de ambiente faltando!")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== SCHEMAS ====================
class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: Optional[str] = None
    invite_code: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# ==================== HELPERS ====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def create_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# ==================== ROTAS ====================

@api.post("/signup")
async def signup(data: SignupSchema):
    # Your signup logic here
    pass

@api.post("/login")
async def login(data: LoginSchema):
    # Your login logic here
    pass

app.include_router(api)