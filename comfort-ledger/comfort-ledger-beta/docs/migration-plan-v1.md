# Migration Plan v1 (JSON -> DB)

## Alcance

Migrar persistencia de archivos JSON a base de datos sin interrumpir flujos críticos:

- login/sesiones beta
- waitlist
- suscripciones + webhooks
- push registrations

## Estrategia (safe rollout)

1. **Preparar DB y tablas**
   - Crear esquema v1 (`data-schema-v1.md`).
   - No tocar todavía lecturas/escrituras en producción.

2. **Backfill inicial**
   - Ejecutar migración desde JSON actuales.
   - Guardar reporte de registros insertados/omitidos/errores.

3. **Modo dual-write (temporal)**
   - Escribir en DB y JSON durante una ventana corta.
   - Leer de JSON para comportamiento estable.

4. **Switch de lectura a DB**
   - Activar `DB_READS_ENABLED=true`.
   - Mantener dual-write una versión adicional.

5. **Desactivar escrituras JSON**
   - Activar `JSON_WRITES_DISABLED=true`.
   - Mantener JSON solo como backup histórico.

## Reglas de idempotencia

- Migración debe ser **idempotente**: correr dos veces no duplica.
- Claves de deduplicación:
  - users: `username_normalized`
  - sessions: `token_hash`
  - waitlist: `email_normalized`
  - subscriptions: `email_normalized`
  - push: `(owner_key, endpoint)`

## Validaciones post-migración

- Conteo por entidad JSON vs DB.
- Muestreo de 10 registros por entidad.
- Prueba funcional:
  - login beta
  - `/api/subscription/status`
  - webhook Lemon (evento de prueba)
  - registro push

## Rollback

Si falla cualquier paso:

1. Volver flags:
   - `DB_READS_ENABLED=false`
   - `JSON_WRITES_DISABLED=false`
2. Reiniciar servicio.
3. Restaurar backup DB (si hubo escrituras parciales).
4. Operar temporalmente con JSON hasta corregir.

## Artefactos esperados (siguiente ticket)

- script `scripts/migrate-json-to-db.mjs` (implementado)
- reporte en `logs/migration-report-<timestamp>.json` (implementado)
- SQL idempotente en `logs/migration-import-<timestamp>.sql` (implementado)
- comando npm:
  - `npm run migrate:json-to-db`
  - `npm run migrate:json-to-db -- --dry-run`
