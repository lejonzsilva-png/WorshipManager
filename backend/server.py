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

# SCHEMAS
class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class SignupSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    ministry_name: str = None  # Optional se user está entrando com código de convite
    invite_code: str = None    # Optional se user está criando novo ministério

api = APIRouter(prefix="/api")

# ✅ FUNÇÃO AUXILIAR: Hash de senha
def hash_password(password: str) -> str:
    """Cria hash seguro da senha usando bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode(), salt).decode()

# ✅ FUNÇÃO AUXILIAR: Verifica senha
def verify_password(password: str, hashed: str) -> bool:
    """Verifica se senha coincide com hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ✅ FUNÇÃO AUXILIAR: Gera token JWT
def generate_token(user_id: str) -> str:
    """Gera token JWT válido por 7 dias"""
    token = jwt.encode(
        {
            "sub": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        os.getenv("JWT_SECRET", "your-secret-key"),
        algorithm="HS256"
    )
    return token

# ✅ LOGIN ENDPOINT
@api.post("/login")
async def login(data: LoginSchema):
    """
    Login de usuário
    Retorna: { success: true, token, user, ministry }
    """
    try:
        # Busca usuário por email (case-insensitive)
        user = await db.users.find_one({"email": data.email.lower()})
        
        if not user:
            raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
        
        # Verifica senha
        if not verify_password(data.password, user["password"]):
            raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
        
        # Gera token
        token = generate_token(str(user["_id"]))
        
        # Busca ministério associado
        ministry = await db.ministries.find_one({"_id": user.get("ministry_id")})
        
        # Formata resposta
        response_user = {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role", "member"),
            "ministry_id": str(user.get("ministry_id", "")),
            "avatar_color": user.get("avatar_color", "#007AFF")
        }
        
        response_ministry = {
            "id": str(ministry["_id"]) if ministry else None,
            "name": ministry.get("name") if ministry else None,
            "invite_code": ministry.get("invite_code") if ministry else None
        } if ministry else None
        
        return {
            "success": True,
            "token": token,
            "user": response_user,
            "ministry": response_ministry
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro no login: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# ✅ SIGNUP ENDPOINT
@api.post("/signup")
async def signup(data: SignupSchema):
    """
    Cadastro de novo usuário
    Retorna: { success: true, token, user, ministry }
    """
    try:
        # Validações básicas
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Senha deve ter mínimo 6 caracteres")
        
        if not data.ministry_name and not data.invite_code:
            raise HTTPException(status_code=400, detail="Informe nome do ministério ou código de convite")
        
        # Verifica se email já existe
        existing_user = await db.users.find_one({"email": data.email.lower()})
        if existing_user:
            raise HTTPException(status_code=409, detail="E-mail já cadastrado")
        
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(data.password)
        
        # Cenário 1: Criar novo ministério
        if data.ministry_name:
            ministry_id = str(uuid.uuid4())
            invite_code = str(uuid.uuid4())[:6].upper()
            
            # Cria ministério
            await db.ministries.insert_one({
                "_id": ministry_id,
                "name": data.ministry_name,
                "invite_code": invite_code,
                "created_at": datetime.now(timezone.utc),
                "members": [user_id]
            })
            
            # Cria usuário como admin
            await db.users.insert_one({
                "_id": user_id,
                "name": data.name,
                "email": data.email.lower(),
                "password": hashed_password,
                "ministry_id": ministry_id,
                "role": "admin",
                "avatar_color": "#007AFF",
                "created_at": datetime.now(timezone.utc)
            })
            
            ministry = {
                "id": ministry_id,
                "name": data.ministry_name,
                "invite_code": invite_code
            }
        
        # Cenário 2: Entrar com código de convite
        elif data.invite_code:
            # Busca ministério pelo código de convite
            ministry_data = await db.ministries.find_one(
                {"invite_code": data.invite_code.upper()}
            )
            
            if not ministry_data:
                raise HTTPException(status_code=404, detail="Código de convite inválido")
            
            ministry_id = ministry_data["_id"]
            
            # Cria usuário como membro
            await db.users.insert_one({
                "_id": user_id,
                "name": data.name,
                "email": data.email.lower(),
                "password": hashed_password,
                "ministry_id": ministry_id,
                "role": "member",
                "avatar_color": "#007AFF",
                "created_at": datetime.now(timezone.utc)
            })
            
            # Adiciona user aos membros do ministério
            await db.ministries.update_one(
                {"_id": ministry_id},
                {"$push": {"members": user_id}}
            )
            
            ministry = {
                "id": str(ministry_data["_id"]),
                "name": ministry_data.get("name"),
                "invite_code": ministry_data.get("invite_code")
            }
        
        # Gera token
        token = generate_token(user_id)
        
        # Formata resposta
        response_user = {
            "id": user_id,
            "name": data.name,
            "email": data.email.lower(),
            "role": "admin" if data.ministry_name else "member",
            "ministry_id": ministry.get("id"),
            "avatar_color": "#007AFF"
        }
        
        return {
            "success": True,
            "token": token,
            "user": response_user,
            "ministry": ministry
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro no signup: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Inclui router no app
app.include_router(api)

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}
