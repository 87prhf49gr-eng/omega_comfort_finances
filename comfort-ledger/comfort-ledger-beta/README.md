# Comfort Ledger (hosted)

Sirve una landing pública en `/` y el web app financiero en `/app`, con coach OpenAI. Durante la beta, el acceso por defecto es con usuario y contraseña.

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
  - `COMFORT_ACCESS_MODE` (`beta` por defecto mientras existan usuarios; usa `onboarding` cuando quieras abrir el acceso)
  - `COMFORT_SUBSCRIBE_URL`
  - `COMFORT_LANDING_DEMO_MINUTES`
  - `COMFORT_REQUIRE_BETA_LOGIN`
  - `COMFORT_DATA_DIR`
- **Persistencia:** `data/beta-sessions.json` no va en git. En un servicio con filesystem efímero, las sesiones se reinician al redeploy o reinicio salvo que montes disco persistente.
- **Disk recomendado para beta estable:** monta un disco en `/var/data` y define `COMFORT_DATA_DIR=/var/data`. Si el disco arranca vacío, el servidor copia automáticamente `beta-users.json` versionado a ese directorio. En deploys posteriores, si el `beta-users.json` del repo cambia, el servidor lo resincroniza al disco persistente y vacía `beta-sessions.json` para forzar login con las credenciales nuevas.

### Pasos rápidos

1. **New → Web Service** conectado a este repositorio.
2. **Root Directory:** `comfort-ledger`
3. Carga las variables de entorno.
4. Si quieres sesiones más estables, añade un **Disk** y monta en `/var/data`, luego define `COMFORT_DATA_DIR=/var/data`.
5. Despliega y abre la URL pública. La landing vive en `/` y el app protegido en `/app`.

## Acceso

- **Por defecto en beta:** `COMFORT_ACCESS_MODE=beta`
  - La landing pública explica el producto en `/`.
  - El web app financiero vive en `/app` y usa `data/beta-users.json` con usuario/contraseña.
- **Más adelante:** `COMFORT_ACCESS_MODE=onboarding`
  - Cambia a acceso más abierto cuando quieras pasar de beta privada a pre-lanzamiento o venta.

## Usuarios beta

Edita `data/beta-users.json` (hashes con `npm run hash-password "TuPin"`). El archivo `beta-sessions.json` no debe versionarse (está en `.gitignore`).

## Facturación con LemonSqueezy

El servidor incluye integración con LemonSqueezy como *Merchant of Record*. Mientras tengas la beta cerrada, **no hace falta configurar nada**: la landing solo recoge emails para la lista de espera. Cuando quieras abrir ventas:

### 1. En LemonSqueezy

1. Crea una tienda y un producto **“Comfort Ledger”**.
2. Dentro del producto, crea **dos variantes**:
   - Mensual, $4.99, suscripción mensual, trial 14 días sin tarjeta.
   - Anual, $39, suscripción anual, trial 14 días sin tarjeta.
3. Crea un **discount code** (p. ej. `EARLY30`) con 30% de por vida, aplicable a ambas variantes, para los miembros de la lista de espera.
4. Copia:
   - **API key** desde *Settings → API*.
   - **Store ID** desde la URL o *Settings*.
   - **Variant IDs** desde cada variante.
5. *Settings → Webhooks → Create webhook*:
   - URL: `https://TU_DOMINIO/api/webhooks/lemonsqueezy`
   - Secret: genera uno (guárdalo para el `.env`).
   - Eventos marcados: todos los `subscription_*` y `subscription_payment_*`.

### 2. En el servidor

Añade a `.env` (local) o al panel de variables (Render):

```
LEMONSQUEEZY_API_KEY=ls_xxxxxxxxxxxx
LEMONSQUEEZY_STORE_ID=12345
LEMONSQUEEZY_VARIANT_MONTHLY=67890
LEMONSQUEEZY_VARIANT_ANNUAL=67891
LEMONSQUEEZY_WEBHOOK_SECRET=el-secreto-que-elegiste
COMFORT_CHECKOUT_REDIRECT_URL=https://TU_DOMINIO/app
COMFORT_PUBLIC_PURCHASE=true
```

Reinicia. En el log verás `LemonSqueezy: configured · Public purchase: ON`. Los botones de la landing pasan de “Unirme a la lista” a “Empezar mensual/anual →” y abren el checkout hosted de LemonSqueezy.

### 3. Endpoints expuestos

| Endpoint | Método | Uso |
|---|---|---|
| `/api/waitlist` | POST | Guarda email en `data/waitlist.json`. |
| `/api/checkout` | POST/GET | Crea una URL de checkout (JSON con `{url}` o redirect 302 si es GET). |
| `/api/webhooks/lemonsqueezy` | POST | Firma verificada con HMAC-SHA256; actualiza `data/subscriptions.json`. |
| `/api/subscription/status?email=…` | GET | Devuelve si la suscripción está activa. |
| `/api/customer-portal?email=…` | GET | Redirige 302 al Customer Portal hosted. |

### 4. Probar el webhook en local

LemonSqueezy no llega a `localhost`. Opciones:

- **`ngrok`**: `ngrok http 8787` y pega la URL HTTPS en el webhook de LS.
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:8787`.

Después, en LemonSqueezy, usa *Send test* para verificar.

### 5. Persistencia en Render

Los archivos `data/subscriptions.json`, `data/waitlist.json` y `data/push-subscriptions.json` **deben persistir** entre deploys. Monta el disco persistente como ya haces con `beta-sessions.json` y apunta `COMFORT_DATA_DIR` al mismo path. Los tres están en `.gitignore` para no committear datos de clientes.

## Web Push (notificaciones en segundo plano)

El servidor puede enviar avisos en segundo plano a dispositivos suscritos (recordatorios de pagos recurrentes) usando VAPID. Sin estas variables, la app sigue funcionando pero los avisos solo se disparan cuando la PWA está abierta.

### 1. Generar claves VAPID

```bash
cd comfort-ledger/comfort-ledger-beta
npx web-push generate-vapid-keys
```

Copia `Public Key` y `Private Key`.

### 2. Configurar variables

En `.env` local o en Render → Environment:

```
COMFORT_VAPID_PUBLIC_KEY=...tu clave pública...
COMFORT_VAPID_PRIVATE_KEY=...tu clave privada...
COMFORT_VAPID_SUBJECT=mailto:support@comfortledger.app
```

`COMFORT_VAPID_SUBJECT` no envía emails; solo identifica al origen ante los servicios push (Apple, Google, Mozilla).

### 3. Redeploy y probar

Al reiniciar verás en el log:

- `Push notifications disabled: missing …` si faltan claves.
- Nada (silencio) si todo OK.

En el cliente, `/api/public-config` devuelve `pushConfigured: true` y `pushVapidPublicKey`. Al activar avisos del navegador, la PWA se registra en `/api/push/register` y el servidor envía los recordatorios aunque la app esté cerrada (requiere que el navegador permita push; en iPhone solo funciona cuando la app ha sido instalada como PWA en la pantalla de inicio).

### 4. Seguridad

Si algún día tu clave privada VAPID se filtra (pegada en chat, repo público), **regenera el par** y actualiza las variables en Render. Los clientes que ya estaban suscritos se re-suscribirán automáticamente la próxima vez que abran la app.
