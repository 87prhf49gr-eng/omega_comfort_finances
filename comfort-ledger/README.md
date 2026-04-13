# Comfort Ledger

Esta carpeta ya es la raíz limpia del producto.

Contenido principal:

- `COMFORT-LEDGER-abrir-aqui.html`: app principal local-first
- `index.html`: landing / portada pública
- `comfort-ledger-beta/`: servidor Node para beta privada y coach OpenAI
- `run_comfort_ledger.command`: abre la app local
- `run_comfort_ledger_pwa.command`: sirve la app por HTTP local para PWA / móvil
- `run_comfort_beta_server.command`: arranca la beta con landing pública en `/` y login/sesiones en `/app`

Comandos rápidos:

```bash
cd "/Users/josal/Documents/New project 5/comfort-ledger"
./run_comfort_ledger.command
./run_comfort_ledger_pwa.command
./run_comfort_beta_server.command
```

Para Render:

- Build: `cd comfort-ledger/comfort-ledger-beta && npm ci`
- Start: `cd comfort-ledger/comfort-ledger-beta && npm start`
- Producción beta: landing en `/` · web app protegido en `/app`

La documentación más detallada del beta vive en `comfort-ledger-beta/README.md`.
