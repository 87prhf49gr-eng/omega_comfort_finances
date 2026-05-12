# Comfort Ledger Incident Runbook v1

## Objetivo

Guía operativa para responder incidentes de producción en:

- autenticación (beta/onboarding)
- pagos y webhooks (LemonSqueezy)
- degradación de API (5xx / latencia alta)

## Severidades

- **SEV-1**: caída total de acceso o pagos bloqueados para la mayoría de usuarios.
- **SEV-2**: degradación importante con workaround (p. ej. errores intermitentes).
- **SEV-3**: impacto parcial o puntual.

## Checklist de triage inicial (0-5 min)

1. Confirmar impacto y alcance (cuántos usuarios, qué flujo).
2. Verificar salud:
   - `GET /api/health`
   - `GET /api/health/slo?windowMin=15`
3. Ejecutar chequeo local/remoto:
   - `npm run check:slo`
4. Identificar último cambio/deploy.
5. Abrir canal interno con:
   - severidad
   - timestamp
   - hipótesis inicial
   - siguiente acción

---

## Escenario A: Login/Sesiones fallando

Síntomas típicos:

- `401` generalizado en `/api/beta/session`
- logout masivo tras reinicio
- login válido devuelve error

Diagnóstico:

1. Revisar `COMFORT_SESSION_SECRET` en entorno activo.
2. Verificar salud de datos (`/api/health` -> `dataDirWritable`, `dataDirReadable`).
3. Confirmar volumen de errores `INVALID_CREDENTIALS` vs `INTERNAL_SERVER_ERROR`.
4. Validar presencia de usuarios en `data/beta-users.json`.

Mitigación rápida:

1. Si falta `COMFORT_SESSION_SECRET`, configurar secreto fijo y reiniciar.
2. Si `dataDir` no es escribible, restaurar mount de disco (`COMFORT_DATA_DIR`).
3. Si credenciales fueron actualizadas, comunicar relogin esperado.

Validación:

- Login beta exitoso.
- `/api/beta/session` retorna `authenticated: true`.
- SLO recuperado en 10-15 min.

---

## Escenario B: Webhooks/pagos inconsistentes

Síntomas típicos:

- pagadores sin acceso
- estados locales desfasados vs Lemon
- subida de fallos en `/api/webhooks/lemonsqueezy`

Diagnóstico:

1. Verificar firma webhook (`LEMONSQUEEZY_WEBHOOK_SECRET`).
2. Revisar endpoint webhook en Lemon dashboard.
3. Revisar ratio de fallo webhook en `/api/health/slo`.
4. Verificar dedupe (`duplicate: true` esperable en reintentos).

Mitigación rápida:

1. Ejecutar reconciliación:
   - `npm run reconcile:subscriptions` (dry-run)
   - `npm run reconcile:subscriptions -- --apply` (si cambios válidos)
2. Confirmar estatus de email afectado:
   - `GET /api/subscription/status?email=...`
3. Si firma inválida sostenida:
   - rotar `LEMONSQUEEZY_WEBHOOK_SECRET`
   - actualizar secreto en Lemon y entorno

Validación:

- usuarios pagadores recuperan acceso por email de compra.
- disminuyen errores webhook.
- reconciliación sin drift adicional.

---

## Escenario C: 5xx altos o latencia p95 degradada

Síntomas típicos:

- alerta de `check:slo`
- p95 > umbral
- incremento de `INTERNAL_SERVER_ERROR`

Diagnóstico:

1. Consultar `GET /api/health/slo?windowMin=15`.
2. Inspeccionar logs estructurados:
   - `msg=request_failed`
   - `msg=request_completed` (status/latencyMs)
3. Identificar endpoint dominante por latencia/error.

Mitigación rápida:

1. Si endpoint específico degrada, aplicar feature-toggle o reducción temporal de carga.
2. Ajustar rate limits si ataque/spam:
   - checkout/portal/subscription status/waitlist
3. Reinicio controlado si hay fuga o estado corrupto.
4. Rollback al deploy previo si el incidente coincide con release reciente.

Validación:

- `serverErrorRate` bajo umbral.
- `p95Ms` vuelve a rango objetivo.
- incidentes recurrentes no reaparecen en 30 min.

---

## Comandos operativos rápidos

```bash
cd comfort-ledger/comfort-ledger-beta

# salud base
curl -sS "http://127.0.0.1:8787/api/health" | jq

# snapshot SLO
curl -sS "http://127.0.0.1:8787/api/health/slo?windowMin=15" | jq
npm run check:slo

# reconciliación de suscripciones
npm run reconcile:subscriptions
npm run reconcile:subscriptions -- --apply

# validación de tests críticos
npm test
```

---

## Comunicación de incidente (plantilla)

- **Severidad:** SEV-X
- **Inicio:** UTC timestamp
- **Impacto:** flujo afectado + alcance
- **Estado actual:** investigando / mitigando / resuelto
- **Acción actual:** comando/rollback aplicado
- **Próxima actualización:** +15 min

---

## Cierre y postmortem

Al resolver:

1. Confirmar métricas estables 30 min.
2. Documentar root cause.
3. Crear tickets de prevención (tests, alertas, hardening).
4. Adjuntar evidencias:
   - reporte `subscription-reconcile-*.json` si aplica
   - snapshot SLO antes/después
