# Comfort Ledger (beta host)

Sirve `COMFORT-LEDGER-abrir-aqui.html` desde la carpeta padre del repo, más login beta y coach OpenAI.

## Requisitos

- Node 18+
- Variables: copia `.env.example` a `.env` en esta carpeta (no subas `.env` a git).

## Local

```bash
cd comfort-ledger/comfort-ledger-beta
npm install
npm start
```

Abre `http://127.0.0.1:8787/` (o el `PORT` que definas).

## Render

- **Tipo:** `Web Service`
- **Root Directory:** `comfort-ledger`
- **Build command:** `cd comfort-ledger/comfort-ledger-beta && npm ci`
  - Si `npm ci` falla por un lockfile desalineado, usa `cd comfort-ledger/comfort-ledger-beta && npm install`.
- **Start command:** `cd comfort-ledger/comfort-ledger-beta && npm start`
- **Health check opcional:** `/api/health`
- **Variables mínimas:**
  - `OPENAI_API_KEY`
  - `COMFORT_SESSION_SECRET`
  - `NODE_ENV=production`
  - `PORT` lo inyecta Render automáticamente
- **Opcionales:**
  - `COMFORT_SUBSCRIBE_URL`
  - `COMFORT_LANDING_DEMO_MINUTES`
  - `COMFORT_REQUIRE_BETA_LOGIN`
  - `COMFORT_DATA_DIR`
- **Persistencia:** `data/beta-sessions.json` no va en git. En un servicio con filesystem efímero, las sesiones se reinician al redeploy o reinicio salvo que montes disco persistente.
- **Disk recomendado para beta estable:** monta un disco en `/var/data` y define `COMFORT_DATA_DIR=/var/data`. Si el disco arranca vacío, el servidor ahora copia automáticamente `beta-users.json` versionado a ese directorio.

### Pasos rápidos

1. **New → Web Service** conectado a este repositorio.
2. **Root Directory:** `comfort-ledger`
3. Carga las variables de entorno.
4. Si quieres sesiones más estables, añade un **Disk** y monta en `/var/data`, luego define `COMFORT_DATA_DIR=/var/data`.
5. Despliega y abre la URL pública.

## Usuarios beta

Edita `data/beta-users.json` (hashes con `npm run hash-password "TuPin"`). El archivo `beta-sessions.json` no debe versionarse (está en `.gitignore`).
