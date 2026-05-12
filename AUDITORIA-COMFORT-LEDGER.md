# Auditoría Comfort Ledger — Reporte Priorizado

**Última revisión:** 26 de abril de 2026 · **Alcance:** landing ES/EN, app PWA, módulos JS, service worker, manifest, servidor beta (Fastify 4: login, coach, LemonSqueezy).
**Modo:** informe vivo — la mayoría de ítems olas 1–3 están cerrados en código; pendiente sobre todo operativo (#2). Nice-to-have #29–#35 implementados en app/landing; #34 sincronización nube cifrada sigue abierta.

---

## TL;DR

El proyecto está **en buen estado de fondo** y **la mayoría de frentes del TL;DR original ya tienen mitigación en código** (landings ES/EN, servidor con rate limits/timeouts/secretos, CSS partido + `defer`, SEO base, storage IDB en app, demo en landing, etc.). Queda sobre todo **deuda operativa** (#2) y **actualizar screenshots del manifest** cuando el UI final sea estable (**#12**).

Detalle abajo en formato `🔴 crítico → 🟠 alto → 🟡 medio → 🟢 nice-to-have`.

---

## 🔴 CRÍTICOS — arreglar antes de cualquier release

### 1. Fragmentos en español dentro de `index-en.html`

Cualquier visitante anglosajón ve mezcla ES/EN en la sección de pricing y en el footer. Mata credibilidad y conversión.


| Línea | Texto actual                 | Debe decir                       |
| ----- | ---------------------------- | -------------------------------- |
| 1401  | `$4.99 <small>/ mes</small>` | `$4.99 <small>/ month</small>`   |
| 1404  | `All features de la app`     | `All app features`               |
| 1416  | `Todo lo del plan mensual`   | `Everything in the monthly plan` |
| 1484  | `Sin spam. Cancel anytime.`  | `No spam. Cancel anytime.`       |


**Estado:** `index-en.html` usa los textos EN en pricing y waitlist (p. ej. `/ month`, `All app features`, `Everything in the monthly plan`, `No spam. Cancel anytime.`). La tabla de arriba queda como **histórico** del hallazgo original; el JS de la landing EN vive en `landing-interactions.js` (sin bloque inline en español localizado).

### 2. `BETA-HANDOUT.local.txt` con 10 contraseñas en claro

El archivo `comfort-ledger-beta/BETA-HANDOUT.local.txt` contiene 10 contraseñas (`Comfort26-01-6BBDB1`, …) en texto plano. Verificado: el `.gitignore` ya lo excluye (✓), así que **no está en el repo público**, pero sigue vivo en disco. Riesgo si se pierde la laptop, se comparte la carpeta o se sube al cloud por error.

**Acción:** moverlo a un gestor de contraseñas (1Password / Bitwarden), borrarlo del disco y, después del primer entrego a cada beta tester, no volver a generar el `.local.txt` — usar el script `scripts/hash-password.mjs` directamente.

**Estado:** **operativo / fuera del repo.** El `.gitignore` sigue excluyendo el handout local; cada responsable debe asegurar que no quede texto plano en backups ni carpetas sincronizadas.

### 3. Webhook LemonSqueezy: validar firma confirmada — pero confirmar `WEBHOOK_SECRET` en `.env`

La validación HMAC-SHA256 está bien implementada (`lemonsqueezy.js:46-60`, timing-safe). **Pero** depende de que `LEMONSQUEEZY_WEBHOOK_SECRET` esté seteado en el `.env` real (no solo en `.env.example`). Si se olvida, el server acepta cualquier webhook. Confirmar en deploy y agregar guard que rechace al boot si falta.

**Estado:** en `comfort-ledger-beta/server.js`, si `NODE_ENV=production` y hay `LEMONSQUEEZY_API_KEY` sin `LEMONSQUEEZY_WEBHOOK_SECRET`, el proceso **termina con FATAL** al arrancar. El health sigue reportando `lemonsqueezyWebhookConfigured`.

### 4. `script-src 'unsafe-inline'` en CSP de la app y del server

Con tantos `innerHTML = template literal` en `comfort-ledger-core.js`, una sola interpolación olvidada sin `escapeHtml()` se vuelve XSS persistente. Reducir `unsafe-inline` en scripts acota el daño cuando exista algún punto débil.

**Acción mínima viable:** auditar todos los `innerHTML =` del core (~115 usos) y confirmar que cada `${variable}` esté envuelto en `escapeHtml()` o `sanitizeI18nHtml()` — **Estado:** revisión en `comfort-ledger-core.js`, `comfort-ledger-modules.js`, `comfort-ledger-reminders.js`; dinámicas con datos de usuario usan `escapeHtml` / `sanitizeI18nHtml`.

**Acción ideal:** JS de landings externo y `script-src 'self'` (CSS inline puede seguir con `style-src … 'unsafe-inline'`). **Estado:** `comfortCsp()` y la meta CSP de `COMFORT-LEDGER-abrir-aqui.html` usan `script-src 'self'` sin `'unsafe-inline'`. Waitlist/checkout en `landing-interactions.js`; JSON-LD en `schema-org-es.json` / `schema-org-en.json` con `Content-Type: application/ld+json`. Los `<link>` de charts/animations ya no usan `onload` inline (handlers inline quedarían bloqueados bajo CSP estricto).

### 5. `sanitizeI18nHtml()` permite `<a href>` sin validar protocolo

La función blanquea tags pero no filtra `href="javascript:..."`. Si una traducción i18n incluyera (intencional o por copia-pega) un anchor con `javascript:`, se ejecutaría.

**Fix (~1.5 KB de código):** dentro de `sanitizeI18nHtml`, después de detectar un `<a>`, validar `node.protocol === "https:" || node.protocol === "http:" || node.getAttribute("href").startsWith("#")` y, si no, `removeAttribute("href")`.

**Estado:** implementado vía `safeI18nAnchorHref()`: rechazo explícito de `javascript:` / `data:` / `vbscript:`, anchors `#fragment`, `http(s):`, `mailto:`, `tel:`.

---

## 🟠 ALTOS — arreglar antes del lanzamiento público

### 6. Sin timeout en llamadas a OpenAI (cliente y servidor)

**Hallazgo original:** llamadas colgadas si OpenAI degradaba (cliente sin abort, servidor sin tope claro).

Si OpenAI está degradado, una request cuelga y el usuario cree que la app está rota; conviene `AbortController` + timeout del orden de 30s.

**Estado:** cliente coach (`comfort-ledger-coach.js`) usa `AbortController` + timeout en llamadas directas a OpenAI; el servidor instancia `OpenAI` con `timeout: OPENAI_TIMEOUT_MS` (defecto 30s, acotado 5–120s vía env).

### 7. Sin rate limiting en endpoints caros del server

Hay rate limit en `/api/beta/login` (12 intentos / 15 min, bien) **pero nada** en `/api/ai-coach` (cuesta dólares de OpenAI) ni en `/api/waitlist` (spam trivial). Un usuario malintencionado puede:

- Quemar el límite mensual (80 queries) en minutos.
- Bombear emails al waitlist sin tope.

Mínimo: 5 queries/hora por usuario en coach, 1 email/hora por IP en waitlist. Considerar `express-rate-limit` o un ring buffer en memoria.

**Estado:** `rateLimitConsume` en ventana fija de 1 h: **`/api/waitlist`** cuenta por **IP** (`clientIp`, respeta `X-Forwarded-For`); defecto **1** envío/hora/IP (`COMFORT_RATE_WAITLIST_MAX`). **`/api/ai-coach`** cuenta por **`userId`** autenticado; defecto **5** consultas/hora/usuario (`COMFORT_RATE_AI_COACH_HOURLY_MAX`), además del tope mensual en memoria (`AI_MONTHLY_LIMIT`). Respuesta 429 incluye `Retry-After` y `retryAfterSec` en JSON.

### 8. `SESSION_SECRET` con fallback aleatorio invalida sesiones en cada restart

`server.js:39, 98-100`: si falta `COMFORT_SESSION_SECRET` en `.env`, se genera uno random y todas las sesiones beta se desconectan al reiniciar. En desarrollo es OK; en producción rompe la UX silenciosamente.

**Fix:** al boot, si la variable no está y `NODE_ENV === "production"`, **abortar el proceso** con mensaje explícito.

**Estado:** cumplido — `NODE_ENV=production` sin `COMFORT_SESSION_SECRET` → `process.exit(1)` con mensaje FATAL (`comfort-ledger-beta/server.js`).

### 9. CSS in-line gigante en `COMFORT-LEDGER-abrir-aqui.html` (~2,900 líneas)

Bloquea el primer paint, es difícil de cachear y duplica si el usuario abre la app dos veces. Dividir en:

- `comfort-ledger-critical.css` (layout, colores, tipografía base — primeros ~1,000 selectors) cargado en `<head>`.
- `comfort-ledger-charts.css` y `comfort-ledger-animations.css` como `<link rel="stylesheet">` adicionales (sin `media=print`/`onload` — ver punto 4, CSP).

Mantiene la app funcionando como local-first pero cachea via service worker.

**Nota (post-implementación):** rollback del CSS monolítico en `comfort-ledger-app.FULL-BACKUP.css`; regeneración con `node comfort-ledger/scripts/rebuild-comfort-ledger-app-css.cjs` a partir de los tres CSS partidos.

### 10. 11 `<script>` cargados sin `async`/`defer`

Los 11 módulos se cargan secuenciales en el `<body>`, bloqueando paint. El orden importa, pero `defer` preserva orden y deja parsear el HTML mientras descarga. Cambiar:

```html
<script defer src="comfort-ledger-onboarding.js"></script>
<script defer src="comfort-ledger-reminders.js"></script>
…
```

`comfort-ledger-pwa.js` (último) puede ir `async` si solo registra el SW (verificar que no toque `state` u otros globales).

**Estado:** módulos principales con `defer`; `comfort-ledger-pwa.js` con `async`.

### 11. OpenAI API key en `localStorage` (modo cloud opcional del coach)

`comfort-ledger-coach.js` documentaba riesgo de key en storage persistente. Mitigar con `sessionStorage` y UX clara.

**Estado:** clave OpenAI BYOK en `sessionStorage`; migración one-shot desde `localStorage` al cargar. La UI sigue indicando que la key vive solo en el dispositivo.

### 12. Manifest PWA minimalista

El `comfort-ledger.webmanifest` actual tiene lo obligatorio pero le faltan campos que mejoran la experiencia de instalación y el ranking de Chrome / Edge / Safari iOS:

**Actualizado:** ya incluye `categories`, `shortcuts` e imágenes `screenshots` (`screenshots/dashboard-mobile.png`, `dashboard-desktop.png`). Archivos en repo con tamaños declarados; conviene regenerar desde la app en dispositivos reales cuando estabilice el diseño y subir **`CACHE_NAME`** tras deploy.

```json
{
  "id": "/comfort-ledger",
  "categories": ["finance", "productivity"],
  "screenshots": [
    { "src": "./screenshots/dashboard-mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "./screenshots/dashboard-desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" }
  ],
  "shortcuts": [
    { "name": "Ver dashboard", "url": "./COMFORT-LEDGER-abrir-aqui.html#dash" }
  ],
  "share_target": { … }   // si quieres recibir CSV de bancos
}
```

### 13. Validar URL en `push` handler del service worker

`comfort-ledger-sw.js` lee `data.url` del payload sin validar protocolo. Un servidor de push hostil podría enviar `url: "javascript:…"` y abrirlo con `clients.openWindow`. Validar con `new URL(data.url)` y rechazar si `protocol !== "https:"`.

**Estado:** `safeOpenUrl()` endurecido (bloquea `javascript:`, `data:`, `vbscript:`); clicks en notificación ya filtraban protocolos inseguros.

### 14. SEO: falta `hreflang`, falta JSON-LD, canonical inconsistente

Ambas landings sin `<link rel="alternate" hreflang="...">` que las relacione. Google trata ES y EN como páginas independientes, pierdes señal SEO.

```html
<!-- en index.html -->
<link rel="alternate" hreflang="es" href="https://comfortledger.com/">
<link rel="alternate" hreflang="en" href="https://comfortledger.com/en">
<link rel="alternate" hreflang="x-default" href="https://comfortledger.com/">
```

Y agregar JSON-LD con tipo `SoftwareApplication` y `Offer` para que Google muestre rich snippets de precio.

Canonicals: `index.html` usa `./` y `index-en.html` usa `/en` — usar URLs absolutas en ambos.

**Estado:** canonical, `hreflang`, `og:image` / `twitter:image` y JSON-LD (`url`) apuntan a `https://comfortledger.app` en los HTML estáticos; el server reemplaza ese origen por `COMFORT_PUBLIC_ORIGIN` / `Host` al servir (`DEFAULT_PUBLIC_SITE_ORIGIN` en `server.js`). Sustituir el dominio en los HTML si el producto canonical no es `comfortledger.app`.

### 15. Race condition en escritura de archivos JSON del server

`server.js:579-585` hace atomic rename (✓), pero **dos requests concurrentes leen → modifican → escriben** el mismo archivo: la última gana, la otra se pierde. Bajo en beta (10 usuarios), creciente con escala.

Fix corto: file-level lock (`proper-lockfile`). Fix correcto: migrar `data/*.json` a SQLite (`better-sqlite3`, sincrónico, sin servidor adicional).

**Estado (post-fix):** en `comfort-ledger-beta/server.js`, `runExclusiveFileTask` encadena escrituras por ruta **y** toma bloqueo en disco (`proper-lockfile`) alrededor de cada tarea cuando `COMFORT_DISABLE_FILE_LOCK` no está activado. Las escrituras siguen usando `writeJsonFile` → temp + `renameSync` (atómico por fichero).

---

## 🟡 MEDIOS — pulir post-launch

### 16. Strings hardcoded en español dentro de `comfort-ledger-modules.js`

Los `LIFESTYLE_TEMPLATES` (l. 21-80) tienen `label: "Nomina principal"`, `label: "Renta"`, etc. Si el usuario elige idioma EN o ZH, las plantillas siguen apareciendo en español. Hay que pasarlas por `t("default_income_label")`.

**Estado:** `buildLifestyleTemplates()` usa `labelKey` por fila + claves ES canónicas en `category`; `normalizeIncomeLine` / `normalizeExpense` / `normalizeUtilityBill` resuelven `t(labelKey)`; presupuestos usan `categoryLabel()` (= `categoryDisplayLabel`). `refreshLifestyleI18nLabels()` se llama desde `setLocale()`.

### 17. Moneda hardcoded a USD

`comfort-ledger-core.js:1697` instancia `Intl.NumberFormat("en-US", { currency: "USD" })`. Si el usuario es de México, Argentina, España… ve dólares. Detectar locale del navegador o exponer un selector en perfil.

**Estado:** `fmtMoney()` usa `Intl.NumberFormat(getIntlLocale(), { style: "currency", currency })` donde `currency` viene de `comfortDisplayCurrency()` (perfil normalizado `sanitizeProfileDisplayCurrency` si existe; si no, heurística por locale del navegador). Opción explícita en onboarding.

### 18. Sin debounce en re-renders por keystroke

`comfort-ledger-bindings.js:33-42` dispara `renderChartsAndHealth()` en cada `input` event. Escribiendo "1000" → 4 re-renders completos. Debounce de 300 ms basta.

**Estado:** `scheduleComfortChartsDebounced()` (~300 ms) en inputs de ingresos, gastos, deudas, ahorro líquido y metas; `flushComfortChartsDebounced()` en blur / coach submit. Cambios discrete (`change` cadence/categoría/fecha) siguen llamando `renderChartsAndHealth()` al instante (correcto).

### 19. Sin límite de tokens / streaming SSE en `/api/ai-coach`

La respuesta llega completa al cliente después de 3-8 segundos. Streaming con SSE da percepción de fluidez 5×. La librería `openai` ya soporta `stream: true`.

**Estado (post-fix):**
- **Hosted** (`POST /api/ai-coach` con `stream: true`): `streamComfortCoachSse` en `server.js` emite SSE (`data: { delta }` … `data: { done, answer, remainingQueries }`); el cliente `comfortCoachAskOpenAI` + `consumeHostedCoachSse` ya actualiza el mensaje en vivo.
- **Clave propia**: `comfortCoachAskOpenAIDirect` usa `stream: true` contra la API de OpenAI, lee el SSE estándar y el mismo `onDelta` actualiza la burbuja del bot.
- **Tokens de salida:** `max_tokens` acotado (defecto **450** servidor y cliente directo); en servidor configurable con `OPENAI_COACH_MAX_TOKENS` (80–2000). El mismo valor se expone en `GET /api/public-config` como `coachMaxTokens`; tras `initComfortHostedMode()`, el cliente BYOK usa `window.__COMFORT_COACH_MAX_TOKENS` (`coachOpenAiMaxTokens()` en `comfort-ledger-coach.js`) para alinear con el host.

### 20. Imágenes en formato PNG (sin WebP/AVIF)

Las landings cargan logos `.png` directos. Convertir a WebP con fallback `<picture>` reduce ~70 % el peso de imágenes.

**Estado:** `index.html` e `index-en.html` usan `<picture>` + `./branding/*.webp` con fallback PNG en header y hero. La PWA (`COMFORT-LEDGER-abrir-aqui.html`) usa `<picture>` en el masthead. Los OG/Twitter `meta image` siguen en PNG por compatibilidad con scrapers.
### 21. Sin `skip link` en landings ni en la app

A11y básica para teclado / lector de pantalla:

```html
<a href="#main" class="sr-only">Saltar al contenido principal</a>
```

**Estado:** `index.html` / `index-en.html` / `COMFORT-LEDGER-abrir-aqui.html` incluyen enlaces `.skip-link` hacia `#main` (copys ES/EN + i18n en la app).

### 22. `safe-area-inset-top` no aplicado en el header sticky de la landing

En iPhone con notch, el header `.top` (sticky, con backdrop blur) queda parcialmente bajo el notch. Agregar `padding-top: max(16px, env(safe-area-inset-top))` en `.top`.

**Estado:** landings ES/EN aplican `env(safe-area-inset-top)` al header / skip-link (`index.html`, `index-en.html`).

### 23. Confirmar versionado del SW al desplegar

`comfort-ledger-sw.js` define `CACHE_NAME = "comfort-ledger-…"`. Si subes código nuevo y olvidas cambiarlo, los usuarios siguen con bundle viejo. Automatizar con hash de release o commit.

**Estado:** script `comfort-ledger/scripts/patch-sw-cache.cjs` reescribe `const CACHE_NAME = "comfort-ledger-<RELEASE_HASH|commit|timestamp>"`. En CI/deploy: `RELEASE_HASH=$GIT_SHA npm run patch-sw-cache` desde `comfort-ledger-beta/` (script en `package.json`). Sigue siendo posible bumps manuales del sufijo cuando no hay pipeline.

### 24. Indicador "Guardado" sin debounce

Cuando el usuario edita rápido, el banner "✓ Guardado" parpadea N veces. Agrupar con debounce de 500 ms.

**Estado:** `flashSavedIndicator()` en `comfort-ledger-core.js` usa debounce ~500 ms (`SAVED_INDICATOR_DEBOUNCE_MS`) antes de mostrar u ocultar.

### 25. Falta validación `Math.max(0, …)` en algunos inputs financieros

`comfort-ledger-bindings.js:176-178` (expenses) acepta valores negativos vía `coerceParsedNumber()`. Aplicar `Math.max(0, …)` consistentemente — los gastos no son negativos.

**Estado:** montos en bindings (ingreso, gasto, deuda, metas, etc.) pasan por `Math.max(0, coerceParsedNumber(…))` donde aplica.

### 26. Loops `O(n·m)` con `Array.includes` sobre `EXPENSE_CATEGORIES`

`comfort-ledger-modules.js:105-111` itera gastos × 30 categorías. Convertir `EXPENSE_CATEGORIES` a `Set` reduce a O(n). Solo importa si la base de transacciones crece > 1k.

**Estado:** `EXPENSE_CATEGORY_SET = new Set(EXPENSE_CATEGORIES)` y `expenseMonthlyByCategory` usa `.has()` O(1).

### 27. Sin tests automatizados

El backend tiene crypto y validación que vale la pena cubrir con pruebas (`vitest` / `node:test`). Mínimo: tests de `verifyWebhookSignature`, `hashSessionToken`, `sanitizeSensitiveText`, `normalizeEmail`.

**Estado:** `comfort-ledger-beta/test/audit.test.cjs` (`npm test`): firma webhook, helpers espejo de `normalizeEmail`, `sanitizeSensitiveText`, `hashSessionToken`, y smoke de `proper-lockfile` (#15).

---

## 🟢 NICE-TO-HAVE — para ser realmente competitivos en 2026

### 28. Migrar el server a Hono o Fastify

El `server.js` era Node nativo con routing manual. Funciona, pero limita: middlewares, validación de schema (`zod`), logging estructurado (`pino`), métricas (`prom-client`), tests. Migración cuesta una tarde y deja la app lista para escalar.

**Estado:** El beta corre con **Fastify 4** (`comfort-ledger-beta/server.js`): la lógica vive en `handleComfortLedgerRequest(req, res)` (mismo flujo que antes sobre `http.IncomingMessage`); `fastify.all("/*")` + `reply.hijack()` evita reescribir ~1500 líneas de una vez. `fastify.removeAllContentTypeParsers()` es obligatorio para no consumir el body antes de `readJsonBody` / `readRawBody` y de las respuestas SSE del coach. Siguiente paso opcional: registrar rutas con `fastify.route`, validación `zod`, `pino` / métricas.

### 29. Migrar storage a IndexedDB en la app

**Estado:** `comfort-ledger-storage-idb.js` (`comfort_ledger_app` / store `kv`) para estado principal, log de notify y dismiss semanal; migración desde `localStorage`; `saveState`/helpers con debounce; wipe coordinado desde `purgeComfortLocalData`. Fallback a LS si IDB falla.

### 30. Demo interactivo en la landing

**Estado:** `index.html` / `index-en.html` — iframe a `COMFORT-LEDGER-abrir-aqui.html?comfort_demo=1&embed=1`.

### 31. Social proof real

**Estado:** sección testimonios (beta cerrada) en ambas landings; opcional endurecer con permisos/citas verificadas al público general.

### 32. Dark/light toggle

**Estado:** conmutador en masthead (`data-theme-value`), persistencia `comfort_ui_theme_v1`, tema “sistema” vía `prefers-color-scheme`, overrides `:root[data-theme="light"]` en `comfort-ledger-critical.css`.

### 33. View Transitions API entre vistas / modales

Disponible en Chrome / Safari 18+ / Firefox reciente. Da transiciones nativas entre actualizaciones del mismo documento cuando se envuelve el cambio de DOM en `document.startViewTransition()`.

**Estado:** `comfortRunViewTransition` en `comfort-ledger-core.js` (expuesto en `window`) envuelve apertura/cierre de overlays dismissibles (trial, Escape global), ajustes del coach, onboarding y login beta. Estilos suaves en `comfort-ledger-critical.css` bajo `@supports (view-transition-name: …)` con respeto a `prefers-reduced-motion`. Navegadores sin API no cambian de comportamiento.

### 34. Backup automático opcional (encriptado) a Google Drive / Dropbox

Mantiene el espíritu local-first pero le da al usuario un seguro contra perder el dispositivo. Usando File System Access API + encriptación cliente con WebCrypto.

**Estado:** export mejorado — `showSaveFilePicker` cuando el navegador lo permite (#34 parcial); nube/GDrive/WebCrypto automatizado pendiente.

### 35. `<dialog>` nativo en lugar de modales div

**Estado:** modales como `<dialog class="comfort-beta-overlay-shell">` + `comfortOverlayReveal`/`comfortOverlayDismiss` (`showModal`/`close`). Clase legada `.comfort-beta-overlay` se mantiene por compatibilidad.

### 36. Health endpoint robusto

`/api/health` siempre devolvía poco señal para monitorización. **Actualizado:** incluye `uptimeSec`, `node`, `timeIso`, lectura real del directorio de datos (`dataDirReadable`). Opcional: `GET /api/health?deep=1` hace un probe ligero a OpenAI (`models.list` con timeout ~4s); en producción activar con `COMFORT_HEALTH_DEEP=true` (sin eso devuelve `openaiProbe.skipped` para no llamar la API desde balanceadores públicos sin querer).

**Estado:** implementado en el servidor beta; conviene cablear el `?deep=1` solo en checks internos o con la env explícita en prod.

---

## Lo que está **bien hecho** (no tocar)

- **Atomic write** de los JSON con temp + rename (`server.js:579-585`).
- **Hashing scrypt** con salt de 16 bytes y `timingSafeEqual` para comparar (`server.js:609-620`).
- **HMAC-SHA256 validation** del webhook LemonSqueezy con timing-safe compare (`lemonsqueezy.js:46-60`).
- **Sanitización de PII antes de OpenAI** (`server.js:980-987`): redacta números de tarjeta, "account number", merchants conocidos.
- **Sesiones**: token aleatorio de 32 bytes, almacenado solo como hash con salt secret (`server.js:649-666, 889-891`), cookie `HttpOnly + SameSite=Lax + Secure en prod`.
- **Rate limit en login** con backoff (`server.js:45-46, 947-978`).
- **escapeHtml + sanitizeI18nHtml** en la app — revisión dirigida de `innerHTML`; anchors i18n endurecidos con `safeI18nAnchorHref()` (#5).
- **Service worker bien estructurado**: cache versionado, cleanup de caches viejos, `skipWaiting + clients.claim`, network-first para navegación, cache-first para assets.
- **Manifest válido** con iconos `purpose: "any maskable"`, theme_color y background_color coherentes.
- **Copy de la landing** muy fuerte: el value prop ("Deja de adivinar si te alcanza el mes") se entiende en 5 segundos, la métrica strip ("0 conexiones bancarias / <60s / 100% tus datos") es buen anti-objeción, el FAQ cubre las dudas reales.
- **Accesibilidad de la app**: 41 atributos ARIA correctamente colocados, `aria-live` en zonas dinámicas, `prefers-reduced-motion` respetado, contraste de colores cumple WCAG AA en superficies principales.
- **`viewport-fit=cover` + `env(safe-area-inset-*)`** en la app PWA — el iPhone con notch se ve bien.
- **Atomic UX**: empty states, undo toast, indicador "guardado", export/import JSON.

---

## Plan de ejecución sugerido

**Estado (abril 2026):** olas 1–3 cerradas salvo operational (#2); #33 View Transitions, #29–#32, #35 y #34 export local listos en código. Siguen **operación beta** (#2), **capturas frescas manifest** (#12) y opcionalmente **backup nube cifrado** (resto de #34).

Si tuviera que arreglar esto en orden, lo haría en **tres olas**:

**Ola 1 — esta semana (4-6 horas).** Críticos #1–#5: traducir landing EN, mover passwords a 1Password, validar webhook secret en boot, auditar `innerHTML` con interpolación, arreglar `sanitizeI18nHtml` para protocolos seguros.

**Ola 2 — antes del launch público (1-2 días).** Altos #6–#15: timeouts OpenAI, rate limits, SESSION_SECRET requerido en prod, dividir CSS, `defer` en scripts, mover key a `sessionStorage`, manifest enriquecido, validar URL en push, SEO (hreflang + JSON-LD), file lock o SQLite.

**Ola 3 — primer mes post-launch (1 semana).** Medios #16–#27 + selectivamente nice-to-have: i18n de templates, moneda dinámica, debounce de renders, streaming SSE, WebP, skip links, safe-area, tests.

Después de eso, las nice-to-have (#28–#36) pasan a ser **mejoras de producto** (entre ellas **#28 Fastify**, **#33 View Transitions** y **#36 health** ya abordadas en código), no bloqueos típicos de seguridad o launch.

---

*Documento revisado tras implementación en repo (abril 2026). Las referencias “`server.js:`línea” pueden desplazarse al editar.*