# LouvorApp - PRD

## Visão
App mobile (Expo / React Native) inspirado no Louveapp para gerenciamento completo de ministério de louvor: escalas, repertório, membros, comunicação interna e perfil — em Português (BR).

## Stack
- Frontend: Expo SDK 54, expo-router (file-based), React Native, expo-secure-store
- Backend: FastAPI + Motor (MongoDB async), JWT (PyJWT), bcrypt
- Auth: JWT email/senha (Google Auth pode ser adicionado posteriormente)

## Funcionalidades implementadas
1. **Autenticação JWT**: signup (cria ministério OU entra via código), login, perfil
2. **Multi-ministério**: cada usuário pertence a um `ministry_id`; líder gera invite code (6 chars)
3. **Dashboard**: saudação, próxima escala (hero card), stats (membros/músicas/escalas), ações rápidas, avisos recentes
4. **Escalas**: lista filtrável (próximas/anteriores), criar com data/hora/local/observações + músicos atribuídos com instrumento + repertório de músicas, ver detalhes, excluir
5. **Repertório**: lista pesquisável, criar com título/artista/tom/BPM/YouTube/Cifra/letra, ver detalhes, abrir links externos, excluir
6. **Membros**: listagem com avatares, instrumentos, indicação de líder
7. **Comunicação**: avisos com título/mensagem, autor pode excluir o próprio
8. **Perfil**: editar nome, telefone, instrumentos; copiar código de convite; logout

## Modelos
- User: id, name, email, password_hash, role(leader|member), ministry_id, instruments[], phone, avatar_color
- Ministry: id, name, invite_code, created_by
- Song: id, ministry_id, title, artist, key, bpm, youtube_url, cifra_url, lyrics, tags[]
- Scale: id, ministry_id, title, date, time, location, notes, song_ids[], assignments[{user_id,user_name,instrument}]
- Announcement: id, ministry_id, title, message, author_id, author_name

## Próximos passos sugeridos
- Login social Google (Emergent-managed)
- Push notifications para escalas/avisos
- Rate limiting nos endpoints `/api/external/*`
- Modo escuro

## API Externa (para apps de metrônomo)
Cada ministério tem um `api_key` único (formato `lvr_<base64url>`) gerado no signup.
Líder pode rotacionar via `POST /api/ministry/api-key/rotate`.
Endpoints públicos (header `X-API-Key`):
- `GET /api/external/ministry`
- `GET /api/external/songs` — repertório completo com BPM, tom, links
- `GET /api/external/scales?upcoming=true&limit=50` — escalas com setlist HIDRATADO (cada música já vem com BPM, em ordem de execução)
- `GET /api/external/scales/{scale_id}` — detalhe de uma escala
Documentação in-app: `app/api-docs.tsx` (visível só para líder, com exemplos curl/JS).
