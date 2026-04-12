# Comfort Ledger (beta host)

Sirve `COMFORT-LEDGER-abrir-aqui.html` desde la carpeta padre del repo, más login beta y coach OpenAI.

## Requisitos

- Node 18+
- Variables: copia `.env.example` a `.env` en esta carpeta (no subas `.env` a git).

## Local

```bash
cd comfort-ledger-beta
npm install
npm start
```

Abre `http://127.0.0.1:8787/` (o el `PORT` que definas).

## Render (Web Service)

1. **New → Web Service** conectado a este repositorio.
2. **Root directory:** deja vacío si el repo es solo Comfort; si el monorepo tiene más cosas, pon la raíz del repo y ajusta **Build / Start**:
   - **Build command:** `cd comfort-ledger-beta && npm install`
   - **Start command:** `cd comfort-ledger-beta && npm start`
3. **Environment variables** (mínimo):
   - `OPENAI_API_KEY` — para el coach en servidor.
   - `COMFORT_SESSION_SECRET` — cadena larga aleatoria en producción.
   - `NODE_ENV=production`
   - Opcional: `COMFORT_SUBSCRIBE_URL`, `COMFORT_LANDING_DEMO_MINUTES`, `COMFORT_REQUIRE_BETA_LOGIN`, `PORT` (Render inyecta `PORT`; el servidor ya usa `process.env.PORT`).
4. **Persistencia:** `data/beta-users.json` y `data/beta-sessions.json` se escriben en disco. En Render, sin disco persistente las sesiones se pierden al reiniciar; para beta estable usa **Disk** o regenera sesiones.

## Usuarios beta

Edita `data/beta-users.json` (hashes con `npm run hash-password "TuPin"`). El archivo `beta-sessions.json` no debe versionarse (está en `.gitignore`).
