#!/bin/bash
# Sirve Comfort Ledger en la red local para PWA / móvil.
set +e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

FILE="COMFORT-LEDGER-abrir-aqui.html"
if [[ ! -f "$FILE" ]]; then
  echo "No encontré $FILE en esta carpeta."
  read -r -p "Pulsa Enter para cerrar…"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "No está instalado python3 en el PATH."
  read -r -p "Pulsa Enter para cerrar…"
  exit 1
fi

pick_port() {
  local base="${COMFORT_LEDGER_PORT:-8765}"
  local p
  for p in "$base" $((base + 1)) $((base + 2)) $((base + 3)) $((base + 4)) $((base + 5)) 8080 8888 9000; do
    if ! /usr/sbin/lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$p"
      return 0
    fi
  done
  echo "$base"
}

PORT="$(pick_port)"

primary_ip() {
  local IF
  IF=$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')
  if [[ -n "$IF" ]]; then
    ipconfig getifaddr "$IF" 2>/dev/null
  fi
}

all_lan_ips() {
  ifconfig 2>/dev/null | awk '
    $1 ~ /^[a-z0-9]/ { iface = $1; sub(/:/, "", iface) }
    $1 == "inet" {
      ip = $2
      if (ip == "127.0.0.1") next
      if (ip ~ /^169\\.254\\./) next
      print ip
    }
  ' | sort -u
}

MAIN_IP="$(primary_ip)"
URL_LOCAL="http://127.0.0.1:${PORT}/${FILE}"

echo "═══════════════════════════════════════════════════════════"
echo "  Comfort Ledger — servidor local (PWA / mismo Wi‑Fi)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  En ESTA Mac (prueba primero):"
echo "    $URL_LOCAL"
echo ""
echo "  En el TELÉFONO (misma Wi‑Fi que la Mac; NO datos móviles):"
echo "    Debe empezar por http://  (no https)"
echo ""
if [[ -n "$MAIN_IP" ]]; then
  echo "    Principal →  http://${MAIN_IP}:${PORT}/${FILE}"
  echo ""
fi
echo "  Otras IPs de esta Mac (si la principal falla, prueba una de estas):"
HAS_EXTRA=0
while read -r ip; do
  [[ -z "$ip" ]] && continue
  if [[ "$ip" == "$MAIN_IP" ]]; then
    continue
  fi
  echo "    http://${ip}:${PORT}/${FILE}"
  HAS_EXTRA=1
done < <(all_lan_ips)
if [[ "$HAS_EXTRA" -eq 0 ]]; then
  echo "    (ninguna distinta de la principal)"
fi
echo ""
echo "───────────────────────────────────────────────────────────"
echo "  ¿La Mac abre bien pero SOLO falla el móvil?"
echo "    1) Firewall de la Mac: Ajustes del sistema → Red → Firewall"
echo "       (o Privacidad y seguridad). Desactívalo un momento o"
echo "       permite conexiones entrantes para Python / Terminal."
echo "    2) Misma Wi‑Fi real: no datos móviles; no red \"Invitados\"."
echo "       Muchos routers no dejan hablar móvil↔ordenador en invitados."
echo "    3) Prueba CADA URL http://… que salió arriba (otra IP puede"
echo "       ser la de la Wi‑Fi correcta si la Mac tiene varias)."
echo "    4) VPN apagada en Mac y en móvil al probar."
echo "    5) Plan B: activa \"Punto de acceso personal\" en el iPhone,"
echo "       conecta la Mac a esa Wi‑Fi, vuelve a ejecutar este script"
echo "       y abre en el móvil la URL nueva (misma red, sin aislamiento)."
echo "───────────────────────────────────────────────────────────"
echo ""
echo "Arrancando servidor… (cierra esta ventana para apagarlo)"
echo ""

python3 -m http.server "$PORT" --bind 0.0.0.0 &
SRV_PID=$!

cleanup() {
  kill "$SRV_PID" 2>/dev/null
  wait "$SRV_PID" 2>/dev/null
}
trap cleanup INT TERM EXIT

sleep 1
if ! kill -0 "$SRV_PID" 2>/dev/null; then
  echo "ERROR: Python no pudo mantener el servidor (¿permiso o error al arrancar?)."
  read -r -p "Pulsa Enter para cerrar…"
  exit 1
fi

if ! curl -sf --max-time 3 "http://127.0.0.1:${PORT}/${FILE}" -o /dev/null; then
  echo "ERROR: El servidor no responde en esta Mac en el puerto $PORT."
  echo "Prueba otro puerto, por ejemplo:"
  echo "  export COMFORT_LEDGER_PORT=9000"
  echo "  y vuelve a ejecutar este archivo."
  cleanup
  trap - INT TERM EXIT
  read -r -p "Pulsa Enter para cerrar…"
  exit 1
fi

open "$URL_LOCAL" 2>/dev/null || true

echo "Servidor activo (PID $SRV_PID). Listo."
echo ""
wait "$SRV_PID"
