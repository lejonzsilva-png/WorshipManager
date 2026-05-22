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

# ==================== CONFIG ====================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "worshipmanager")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGO_URL or not JWT_SECRET:
    raise ValueError("ERRO: Variáveis de ambiente MONGO_URL e JWT_SECRET são obrigatórias!")

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

# ==================== SCHEMAS (Definidos no topo para evitar SyntaxError) ====================
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
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado.")
    
    user_id = str(uuid.uuid4())
    # Exemplo de inserção de ministério (ajustar conforme a tua lógica de negócio)
    await db.ministries.insert_one({
        "id": str(uuid.uuid4()),
        "name": data.ministry_name or "Ministério Sem Nome",
        "created_by": user_id
    })
    
    await db.users.insert_one({
        "id": user_id,
        "name": data.name,
        "email": data.email.lower(),
        "password": hash_password(data.password)
    })
    return {"success": True}

@api.post("/login")
async def login(data: LoginSchema):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
        
    token = create_jwt(user["id"])
    return {"success": True, "token": token}

app.include_router(api)

@app.get("/health")
async def health():
    return {"status": "healthy"}