#!/bin/bash
# Arranca el servidor beta (login + OpenAI) para Comfort Ledger.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR/comfort-ledger-beta" || exit 1

if [[ ! -f "server.js" ]]; then
  echo "No encontré comfort-ledger/comfort-ledger-beta/server.js"
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "Instalando dependencias…"
  npm install
fi

if [[ -f "$DIR/comfort-ledger-beta/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DIR/comfort-ledger-beta/.env"
  set +a
fi

echo "Abre en el navegador: http://127.0.0.1:${PORT:-8787}/"
echo "Credenciales de ejemplo: comfort-ledger-beta/BETA-HANDOUT.txt"
exec node server.js
