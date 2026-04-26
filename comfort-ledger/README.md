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

## Deploy en Render

Hay dos formas equivalentes; no mezcles rutas entre ellas.

**A — Blueprint (recomendado):** en la raíz del repositorio está `render.yaml`. Conecta el repo en Render → *New Blueprint Instance* y revisa las variables secretas (`sync: false`) en el panel antes del primer deploy.

**B — Web Service manual**

- Si **Root Directory** del servicio es la raíz del repo:
  - Build: `cd comfort-ledger/comfort-ledger-beta && npm ci`
  - Start: `cd comfort-ledger/comfort-ledger-beta && npm start`
- Si **Root Directory** es `comfort-ledger`:
  - Build: `cd comfort-ledger-beta && npm ci`
  - Start: `cd comfort-ledger-beta && npm start`

En ambos casos: health check opcional `GET /api/health`. Producción: landing en `/`, app en `/app`.

La documentación del servidor vive en `comfort-ledger-beta/README.md`.

## Checklist antes de lanzar

1. **Secretos:** `OPENAI_API_KEY`, `COMFORT_SESSION_SECRET` (cadena larga fija; si falta, las sesiones se invalidan al reiniciar).
2. **Beta:** revisa `comfort-ledger-beta/BETA-HANDOUT.txt` y cualquier contraseña documentada ahí. **Rota PINs** con `cd comfort-ledger-beta && npm run hash-password "NuevaClave"` y pega `pinSalt`/`pinHash` en `data/beta-users.json` antes de dar acceso real; credenciales vivas van en `BETA-HANDOUT.local.txt` (ignorado en git) o por canal privado.
3. **Persistencia:** en instancias sin disco, `beta-sessions.json`, waitlist y suscripciones se pierden al redeploy. Para producción, monta disco (p. ej. `/var/data`) y `COMFORT_DATA_DIR=/var/data` (ver README del beta).
4. **Redes sociales / SEO:** con el servidor Node activo, las landings se sirven ya con `og:image`, `twitter:image` y `canonical` en URL absoluta (origen inferido del `Host` o de `COMFORT_PUBLIC_ORIGIN` en `.env`). Si abres `index.html` como archivo local, las meta siguen siendo relativas.
5. **Pagos:** cuando LS esté listo, configura variables LemonSqueezy, webhook a `https://TU_DOMINIO/api/webhooks/lemonsqueezy` y `COMFORT_PUBLIC_PURCHASE=true`.
6. **`robots.txt`:** ya está en la carpeta estática; revisa política si quieres bloquear indexación temporal en beta.
