"""LouvorApp - Worship Ministry Management API."""
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Configuração
load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "worshipmanager")
JWT_SECRET = os.getenv("JWT_SECRET")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="LouvorApp API")

# CORSMiddleware configurado para aceitar pedidos do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# SCHEMAS NO TOPO
class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: str = "Ministério Sem Nome"

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

api = APIRouter(prefix="/api")

# Rotas
@api.post("/login")
async def login(data: LoginSchema):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    
    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm="HS256"
    )
    return {"success": True, "token": token}

app.include_router(api)

@app.get("/health")
async def health():
    return {"status": "healthy"}