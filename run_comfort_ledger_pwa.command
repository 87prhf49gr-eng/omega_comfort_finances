#!/bin/bash
# Wrapper de compatibilidad: reenvía al workspace limpio de Comfort Ledger.
DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$DIR/comfort-ledger/run_comfort_ledger_pwa.command"
if [[ -x "$TARGET" ]]; then
  exec "$TARGET"
fi
echo "No encontré el launcher nuevo en:"
echo "$TARGET"
exit 1
