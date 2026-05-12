# API Compatibility Policy v1

## Alcance

Aplica a endpoints públicos del backend Comfort Ledger:

- `/api/*` (legacy compatibility)
- `/v1/api/*` (versionado principal)

## Principios

1. **No romper consumidores existentes sin versión nueva.**
2. **Cambios incompatibles solo con prefijo de versión nuevo** (p. ej. `/v2/api/...`).
3. **Compatibilidad primero, limpieza después.**

## Cambios NO rompientes (permitidos en v1)

- agregar campos nuevos opcionales en respuestas JSON
- agregar endpoints nuevos
- agregar códigos de error nuevos (si formato de error se mantiene)
- mejorar validaciones siempre que no cambie contratos válidos actuales
- optimizaciones internas sin cambio de contrato

## Cambios rompientes (prohibidos en v1)

- eliminar un endpoint existente
- renombrar endpoint o cambiar método HTTP
- eliminar campos de respuesta usados por clientes
- volver obligatorio un campo que antes era opcional
- cambiar tipo de dato de campos existentes (string -> number, etc.)
- cambiar semántica de autenticación/autorización en endpoints existentes sin compatibilidad

## Política de deprecación

Cuando un endpoint/campo se quiera retirar:

1. Marcar como deprecado en OpenAPI y documentación.
2. Mantener soporte durante ventana mínima de **2 releases**.
3. Publicar alternativa equivalente.
4. Confirmar migración de consumidores críticos.

## Proceso para cambios rompientes

Para introducir cambio incompatible:

1. crear nuevo prefijo de versión (`/v2/api/...`)
2. mantener `/v1/api/...` durante transición
3. añadir tests de compatibilidad para ambas versiones
4. actualizar docs y runbook de migración

## Error contract obligatorio

Las respuestas de error deben mantener formato:

- `ok: false`
- `code`
- `message`
- `error` (alias legacy)
- `requestId` (cuando disponible)
- `details` opcional

No se permite cambiar esta estructura en `v1`.

## Enforcements

Toda PR que toque rutas/API debe completar el checklist de compatibilidad en la plantilla de PR (`.github/pull_request_template.md`).
