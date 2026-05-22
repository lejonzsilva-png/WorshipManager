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

load_dotenv()
client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
db = client[os.getenv("DB_NAME", "worshipmanager")]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# SCHEMAS (Devem estar fora das rotas)
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

api = APIRouter(prefix="/api")

@api.post("/login")
async def login(data: LoginSchema):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = jwt.encode(
        {"sub": user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        os.getenv("JWT_SECRET"), algorithm="HS256"
    )
    return {"success": True, "token": token}

app.include_router(api)