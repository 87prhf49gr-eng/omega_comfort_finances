#!/bin/bash
# Abre Comfort Ledger en el navegador por defecto (un solo HTML, sin Python ni servidor).
DIR="$(cd "$(dirname "$0")" && pwd)"
FILE="$DIR/COMFORT-LEDGER-abrir-aqui.html"
if [[ -f "$FILE" ]]; then
  open "$FILE"
  echo "Listo: se abrió Comfort Ledger en tu navegador."
  echo "Archivo: $FILE"
  exit 0
fi
echo "No encontré COMFORT-LEDGER-abrir-aqui.html en:"
echo "$DIR"
exit 1
