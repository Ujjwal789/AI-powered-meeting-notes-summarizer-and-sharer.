# Mangodesk AI Notes – Server

## Run locally
1) `cp .env.example .env` and fill values.
2) `npm i`
3) `npm run dev` (or `npm start`)

### Endpoints
- `GET /api/health`
- `POST /api/summarize` (multipart/form-data)
  - fields:
    - `file` (.txt) **or** `transcript` (string)
    - `prompt` (string, optional)
- `POST /api/send-email` (application/json)
  - `{ "to": "a@b.com", "subject": "optional", "summary": "..." }`

## Deploy
- Render/Railway:
  - Root: `server`
  - Start: `npm start`
  - Add env vars from `.env.example`
