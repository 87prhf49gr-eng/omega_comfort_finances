# Staging to Production Playbook

## 0) Requisitos previos

- Servicio desplegable en Render.
- Variables de entorno listas (staging y producción).
- Acceso a LemonSqueezy dashboard para validar webhook/secret.

## 1) Gate local (obligatorio)

```bash
cd comfort-ledger/comfort-ledger-beta
npm ci
npm run predeploy:check
npm test
```

## 2) Deploy a staging

1. Configurar variables staging:
   - `NODE_ENV=production`
   - `COMFORT_SESSION_SECRET`
   - `OPENAI_API_KEY` (si aplica)
   - `LEMONSQUEEZY_*` (si staging conecta pagos)
   - `COMFORT_DATA_DIR` con disco persistente
2. Desplegar.

## 3) Smoke staging

```bash
cd comfort-ledger/comfort-ledger-beta
COMFORT_SMOKE_BASE_URL="https://<staging-domain>" npm run smoke:postdeploy
COMFORT_SLO_BASE_URL="https://<staging-domain>" npm run check:slo
npm run reconcile:subscriptions
```

Validar adicionalmente:

- login beta + logout
- onboarding pagador (si Lemon staging activo)
- `/v1/api/*` y `/api/*` funcionando
- endpoint admin con rol support/admin

## 4) Promoción a producción

Si staging está verde:

1. Replicar variables en producción.
2. Confirmar secret de webhook en Lemon y URL `https://<prod>/api/webhooks/lemonsqueezy`.
3. Desplegar producción.

## 5) Smoke producción (inmediato)

```bash
cd comfort-ledger/comfort-ledger-beta
COMFORT_SMOKE_BASE_URL="https://<prod-domain>" npm run smoke:postdeploy
COMFORT_SLO_BASE_URL="https://<prod-domain>" npm run check:slo
```

## 6) Vigilancia post-release (30 minutos)

- revisar `serverErrorRate`, `webhookFailureRate`, `p95Ms`
- confirmar que no hay picos sostenidos en 5xx
- revisar reconciliación de suscripciones (dry-run)

## 7) Rollback (si algo falla)

1. Revertir al release previo.
2. Volver a correr smoke mínimo:
   - `/api/health`
   - `/api/health/slo`
3. Seguir `docs/incident-runbook-v1.md`.
