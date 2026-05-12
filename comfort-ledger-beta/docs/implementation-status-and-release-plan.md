# Implementation Status and Release Plan

## Estado por ticket

### Done

- **CL-001** Definir OpenAPI v1 baseline  
  `openapi.yaml` creado y actualizado con endpoints críticos.

- **CL-002** Estandarizar formato de errores API  
  Backend usa formato estándar con `code/message/error/details/requestId`.

- **CL-003** Propagación de `requestId`  
  Respuestas JSON incluyen `requestId`; header `X-Request-Id`; logs enlazables.

- **CL-004** CI workflow  
  `.github/workflows/ci.yml` ejecuta install + predeploy check + tests.

- **CL-005** Predeploy validation script  
  `npm run predeploy:check` implementado y documentado.

- **CL-006** Diseño de esquema de datos v1  
  Documento de esquema y DDL en `docs/data-schema-v1.md`.

- **CL-007** Capa de acceso a datos  
  `data/repository.js` introducido y servidor refactorizado para operaciones críticas.

- **CL-008** Migración JSON -> DB  
  Script `migrate-json-to-db.mjs` (idempotente + dry-run + SQL/reportes).

- **CL-009** Rollback/migración documentada  
  Estrategia de rollback en `docs/migration-plan-v1.md`.

- **CL-010** Idempotencia webhook  
  Dedupe por `eventKey` + almacenamiento de eventos procesados.

- **CL-011** Reconciliación suscripciones  
  `npm run reconcile:subscriptions` con `--apply` y reportes.

- **CL-012** Hardening endpoints pagos  
  Rate limits específicos + validación email + errores seguros.

- **CL-013** Integración API crítica  
  Suite de integración incluida en `test/integration-api.test.cjs`.

- **CL-014** E2E pagador  
  Flujo webhook -> onboarding -> sesión -> acceso cubierto en tests.

- **CL-015** E2E tester beta  
  Flujo login -> sesión -> logout cubierto en tests.

- **CL-016** Logging estructurado  
  Eventos JSON (`request_completed`, `request_failed`, etc.) con latencia y status.

- **CL-017** Alertas/SLO mínimas  
  `/api/health/slo` + `npm run check:slo`.

- **CL-018** Runbook de incidentes  
  `docs/incident-runbook-v1.md` con playbooks operativos.

- **CL-019** Versionado API  
  Soporte de `/v1/api/*` manteniendo compatibilidad con `/api/*`.

- **CL-020** RBAC básico  
  Roles `admin/support/user` + endpoint admin protegido.

- **CL-021** Política de compatibilidad API  
  Política formal + PR template con checklist enforceable.

### Parcial

- Ningún ticket marcado como parcial en el alcance actual de implementación.

### Pendiente

- No quedan tickets del bloque CL-001..CL-021 sin implementar a nivel código/documentación.

---

## Plan de release (staging -> producción)

## 1) Preflight local

```bash
cd comfort-ledger/comfort-ledger-beta
npm ci
npm run predeploy:check
npm test
```

## 2) Verificación staging

1. Deploy a staging con variables completas.
2. Ejecutar smoke:
   - `GET /api/health`
   - `GET /api/health/slo?windowMin=15`
   - login beta exitoso y logout
   - webhook de prueba (firma válida)
   - `/api/subscription/status` para email de prueba
   - `/api/admin/subscriptions` con rol `support` (200) y rol `user` (403)
3. Ejecutar:
   - `npm run check:slo`
   - `npm run reconcile:subscriptions` (dry-run)

## 3) Checklist producción

- `COMFORT_SESSION_SECRET` configurado y estable.
- Lemon variables completas:
  - `LEMONSQUEEZY_API_KEY`
  - `LEMONSQUEEZY_STORE_ID`
  - `LEMONSQUEEZY_VARIANT_MONTHLY`
  - `LEMONSQUEEZY_VARIANT_ANNUAL`
  - `LEMONSQUEEZY_WEBHOOK_SECRET`
- Disco persistente montado y `COMFORT_DATA_DIR` correcto.
- Límites de rate configurados según tráfico esperado.

## 4) Deploy producción

1. Deploy de release.
2. Ejecutar chequeos:
   - `GET /api/health`
   - `GET /api/health/slo?windowMin=15`
3. Monitorear 30 minutos:
   - `serverErrorRate`
   - `webhook.failureRate`
   - `p95Ms`

## 5) Rollback (si necesario)

1. Volver al release previo.
2. Validar salud y sesión.
3. Ejecutar runbook:
   - `docs/incident-runbook-v1.md`
