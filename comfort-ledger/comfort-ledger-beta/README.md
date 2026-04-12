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

### Pasos rápidos

1. **New → Web Service** conectado a este repositorio.
2. Si el repo contiene más carpetas además de Comfort, deja el repo en la raíz y usa los comandos anteriores con `cd comfort-ledger/comfort-ledger-beta && ...`.
3. Carga las variables de entorno.
4. Despliega y abre la URL pública.

## Usuarios beta

Edita `data/beta-users.json` (hashes con `npm run hash-password "TuPin"`). El archivo `beta-sessions.json` no debe versionarse (está en `.gitignore`).
