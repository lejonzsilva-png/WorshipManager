# 🎵 LouvorApp

Aplicação mobile completa para gerenciamento de ministério de louvor — inspirada no Louveapp.
Stack: **Expo (React Native) + FastAPI + MongoDB**.

---

## ✨ Funcionalidades

- **Autenticação JWT** (email/senha) com bcrypt
- **Multi-ministério** com código de convite de 6 caracteres
- **Escalas** (eventos/cultos) com data, horário, local, observações, repertório e músicos atribuídos
- **Repertório** de músicas com tom, BPM, links YouTube/Cifra, letra
- **Membros** com instrumentos, papéis e gerenciamento de permissões
- **Avisos** internos do ministério
- **Sistema de permissões** granular: líder (100% acesso), membros com permissões individuais (`edit_scales`, `edit_songs`, `edit_announcements`) ou somente visualização
- **API externa pública** (`/api/external/*`) autenticada via `X-API-Key` — pronta para integrar com apps de metrônomo, projeção de letras, etc.

---

## 📁 Estrutura do projeto

```
.
├── backend/                  # FastAPI + Motor (MongoDB async)
│   ├── server.py             # Toda a API
│   ├── requirements.txt
│   ├── tests/                # Pytest (72 testes)
│   └── .env.example
│
├── frontend/                 # Expo SDK 54 (React Native + expo-router)
│   ├── app/                  # File-based routing
│   │   ├── (tabs)/           # Dashboard, Escalas, Repertório, Perfil
│   │   ├── escala/           # nova.tsx, [id].tsx
│   │   ├── musica/           # nova.tsx, [id].tsx
│   │   ├── aviso/novo.tsx
│   │   ├── membros.tsx       # Gerenciamento + permissões
│   │   ├── convidar.tsx      # Compartilhamento via WhatsApp/SMS
│   │   ├── api-docs.tsx      # Documentação interativa da API externa
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── src/
│   │   ├── api/client.ts     # Wrapper fetch com JWT
│   │   ├── context/AuthContext.tsx
│   │   ├── utils/confirm.ts  # Confirmação cross-platform
│   │   └── theme.ts
│   ├── package.json
│   ├── app.json
│   └── .env.example
│
├── Dockerfile                # Backend production-ready
├── docker-compose.yml        # Backend + MongoDB
└── README.md
```

---

## 🚀 Quick start (desenvolvimento)

### Pré-requisitos
- **Node.js** 20+ e **Yarn**
- **Python** 3.11+
- **MongoDB** 6+ (local ou Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edite .env com sua MONGO_URL e JWT_SECRET
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

A API estará em `http://localhost:8001/api`. Teste com:
```bash
curl http://localhost:8001/api/
# { "app": "LouvorApp", "status": "ok" }
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# edite EXPO_PUBLIC_BACKEND_URL apontando para sua API
yarn install
yarn expo start
```

Use o **Expo Go** no celular (escaneie o QR), ou rode em iOS simulator / Android emulator.

---

## 🐳 Rodar com Docker

```bash
docker compose up -d
```

Sobe MongoDB + Backend juntos.
Para o frontend, continue usando `yarn expo start` localmente apontando para `http://localhost:8001`.

---

## 🔐 Variáveis de ambiente

### Backend (`backend/.env`)

| Variável     | Descrição                                              | Exemplo                              |
|--------------|--------------------------------------------------------|--------------------------------------|
| `MONGO_URL`  | URI de conexão MongoDB                                 | `mongodb://localhost:27017`          |
| `DB_NAME`    | Nome do banco                                          | `louvorapp`                          |
| `JWT_SECRET` | Segredo HMAC para assinar tokens (use 32+ caracteres aleatórios) | `troque-este-valor-em-producao`     |

### Frontend (`frontend/.env`)

| Variável                   | Descrição                                  | Exemplo                          |
|----------------------------|--------------------------------------------|----------------------------------|
| `EXPO_PUBLIC_BACKEND_URL`  | URL pública da sua API (sem `/api` no fim) | `https://api.seudominio.com`     |

> ⚠️ **NUNCA** comite arquivos `.env` reais no Git. Use o `.env.example` como template.

---

## 📚 Endpoints da API

### Autenticação (público)
- `POST /api/auth/signup` — cria conta (cria ministério OU entra via `invite_code`)
- `POST /api/auth/login` — `{email, password}` → `{token, user, ministry}`

### Autenticados (header `Authorization: Bearer <token>`)
- `GET /api/auth/me` / `PUT /api/auth/me`
- `GET /api/ministry` (com `api_key` e `invite_code` para o usuário)
- `GET /api/ministry/members`
- `PUT /api/ministry/members/{id}` — **líder**: promove/rebaixa e define permissões
- `POST /api/ministry/api-key/rotate` — **líder**: gera nova chave de API externa
- `GET/POST/PUT/DELETE /api/songs[/{id}]` — exige `edit_songs` (ou líder)
- `GET/POST/PUT/DELETE /api/scales[/{id}]` — exige `edit_scales` (ou líder)
- `GET/POST/DELETE /api/announcements[/{id}]` — exige `edit_announcements` (ou líder; autor pode deletar o próprio)
- `GET /api/stats`

### API externa (header `X-API-Key: lvr_...`)
Pensada para apps externos (metrônomo, OBS, projeção de letras). Documentação interativa dentro do app (tela **Perfil → Integração / API**).

- `GET /api/external/ministry`
- `GET /api/external/songs` — repertório completo com BPM
- `GET /api/external/scales?upcoming=true&limit=50` — escalas com setlist **hidratado** (BPM em ordem de execução)
- `GET /api/external/scales/{id}` — detalhe de uma escala

### Exemplo (cURL)
```bash
curl -H "X-API-Key: lvr_xxxxx..." \
  https://api.seudominio.com/api/external/scales?upcoming=true
```

---

## 🧪 Testes

```bash
cd backend
pytest -v
```

Cobertura: 72 testes (auth, multi-tenant, permissões, API externa, CRUD completo).

---

## 🏗️ Deploy em produção

### Backend
- Plataformas recomendadas: **Render**, **Railway**, **Fly.io**, **AWS ECS** (rodam o `Dockerfile` direto)
- Banco: **MongoDB Atlas** (free tier serve)
- Exemplo de comando: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Frontend
- **Web**: `npx expo export -p web` → publique em Vercel/Netlify/Cloudflare Pages
- **iOS/Android**: use **EAS Build** (`eas build -p ios|android`) → publicação nas lojas
- Defina `EXPO_PUBLIC_BACKEND_URL` no painel da plataforma de build/host

### Checklist antes do deploy
- [ ] Trocar `JWT_SECRET` para um valor aleatório forte
- [ ] Restringir `CORS` em `server.py` se necessário (hoje está `*`)
- [ ] Configurar `MongoDB Atlas` com IP whitelist e usuário dedicado
- [ ] Habilitar HTTPS no domínio do backend
- [ ] (Opcional) adicionar rate limiting em `/api/external/*` e `/api/auth/login`

---

## 🔑 Conta de demonstração

Após rodar o backend, crie uma conta via `/register` no app.
Se quiser semear uma conta de teste:
```bash
curl -X POST http://localhost:8001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Pastor Demo","email":"demo@louvor.app","password":"demo123","ministry_name":"Ministério Demo"}'
```

---

## 📄 Licença

Código gerado para uso próprio. Adapte conforme a licença que preferir (MIT recomendada).

---

Construído com ❤️ na [Emergent](https://emergent.sh).
