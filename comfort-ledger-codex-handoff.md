# Comfort Ledger — handoff para Codex

Copia este archivo a donde uses Codex (por ejemplo `~/.codex/` o adjúntalo en el chat) y pide refinamientos sobre las secciones que quieras.

## Ubicación del proyecto

- Carpeta: `/Users/josal/Documents/New project 5/`
- App principal (monolito): `COMFORT-LEDGER-abrir-aqui.html` (~3935 líneas, ES/EN/ZH, coach local, gráficos, `localStorage`).

## PWA (lo ya implementado)

| Archivo | Rol |
|--------|-----|
| `comfort-ledger.webmanifest` | Manifest: `start_url` → `./COMFORT-LEDGER-abrir-aqui.html`, `theme_color` `#8f6b3d`, `background_color` `#ebe6dc`, iconos en `pwa-icons/`. |
| `comfort-ledger-sw.js` | Service worker: caché `comfort-ledger-v1`, precarga HTML + manifest + PNGs; navegación: red primero, fallback a HTML en caché. |
| `pwa-icons/icon-192.png`, `icon-512.png` | Iconos placeholder (color sólido acento); sustituibles por logo. |
| `COMFORT-LEDGER-abrir-aqui.html` | En `<head>`: `theme-color`, Apple web app, `<link rel="manifest">`, `apple-touch-icon`. Al final del `<body>`: registro de SW solo si `https:` o `localhost` / `127.0.0.1` / `[::1]`. |
| `run_comfort_ledger_pwa.command` | Lanza `python3 -m http.server` en `0.0.0.0`, elige puerto libre, prueba con `curl`, lista IPs LAN, abre Safari/Chrome en la Mac. Incluye ayuda si “solo falla el móvil”. |
| `run_comfort_ledger.command` | Abre el HTML con `open` (`file://`) — **no** sirve para PWA desde el móvil. |

## Restricciones técnicas que conviene respetar

- **Service worker** no opera en `file://`; hace falta **HTTP(S) o localhost**.
- Si se publica en **subruta** (ej. GitHub Pages `/repo/`), revisar `start_url`, `scope` en el manifest y rutas en `PRECACHE` / `caches.match` del SW.
- Tras cambios grandes al HTML, subir versión en `CACHE_NAME` en `comfort-ledger-sw.js` (ej. `comfort-ledger-v2`).

## Contexto de producto (para refinar)

- Marca en UI: **Comfort Ledger**, tono minimalista, paleta en `:root` del HTML (`--bg`, `--accent`, etc.).
- Pill “100% local” / coach sin red; datos en dispositivo.
- Interés previo del usuario: **notificaciones** de gastos recurrentes (renta, seguro, suscripciones) al teléfono — hoy no hay backend ni push; la PWA es el primer paso (instalable + caché).

## Ideas de refinamiento (elige en Codex)

1. **PWA**: `shortcuts`, `screenshots` en manifest; iconos reales; estrategia de caché más fina (fuentes Google opcionales).
2. **Red local**: documentar firewall paso a paso por versión de macOS; script que detecte interfaz Wi‑Fi activa.
3. **Notificaciones**: diseño MVP (recordatorios locales con `Notification` + permisos solo en contexto seguro; o enlace a exportar `.ics`; sin prometer push servidor hasta haya backend).
4. **i18n**: claves en `UI_STRINGS` dentro del HTML; cualquier texto nuevo en `es`, `en`, `zh`.
5. **Empaquetado**: renombrar a `index.html` + ajustar manifest/SW para despliegue en hosting estático.

## Comando rápido (referencia)

```bash
cd "/Users/josal/Documents/New project 5"
./run_comfort_ledger_pwa.command
```

Variable opcional: `COMFORT_LEDGER_PORT=9000 ./run_comfort_ledger_pwa.command`

---

*Generado para handoff a Codex; el código fuente sigue en los archivos listados arriba.*
