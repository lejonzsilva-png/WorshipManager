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

app = FastAPI()
api = APIRouter(prefix="/api")

# Schemas no topo (NUNCA dentro de rotas)
class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

# Rotas
@api.post("/signup")
async def signup(data: SignupSchema):
    # Lógica de signup
    return {"success": True}

@api.post("/login")
async def login(data: LoginSchema):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Credenciais inválidas")
    return {"success": True}

app.include_router(api)