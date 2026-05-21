# Test Credentials - LouvorApp

## Demo Account (Leader)
- Email: `demo@louvor.app`
- Password: `demo123`
- Role: leader (criou ministério "Ministério Demo")

## How to test
1. App lands on `/login` screen by default.
2. Use the credentials above OR create a new account from `/register`.
3. Sign up has two modes: "Criar ministério" (becomes leader) and "Entrar com convite" (uses invite code).
4. Invite codes are 6-character uppercase alphanumeric (visible on Perfil tab for the leader).

## Endpoints
- Backend base: `https://escala-louvor.preview.emergentagent.com/api`
- Public: `POST /auth/signup`, `POST /auth/login`
- Auth required: `GET /auth/me`, `PUT /auth/me`, `GET /ministry`, `GET /ministry/members`, all `/songs`, `/scales`, `/announcements`, `/stats`
