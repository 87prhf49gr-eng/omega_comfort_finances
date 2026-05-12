#!/bin/zsh

PORT=4174
APP_DIR="/Users/josal/Documents/New project 5/blackledger-elite-app"
LAB_URL="http://localhost:${PORT}/design-lab?v=1&theme=sovereign"

if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
  fi
fi

NODE_BIN="$(command -v node)"

echo "BlackLedger Omega Design Lab"
echo "Launcher ready."

if [ -z "${NODE_BIN}" ]; then
  echo "Node.js was not found in this shell."
  echo "Open Terminal and run: source ~/.zshrc"
  exit 1
fi

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Existing local server detected at ${LAB_URL}"
  open "${LAB_URL}" >/dev/null 2>&1 || true
  echo "If the browser did not open automatically, visit ${LAB_URL}"
  exit 0
fi

cd "${APP_DIR}" || exit 1
"${NODE_BIN}" server.js >/tmp/blackledger_design_lab_server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1
  fi
}

trap cleanup EXIT INT TERM

for _ in {1..20}; do
  if curl -sfI "${LAB_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl -sfI "${LAB_URL}" >/dev/null 2>&1; then
  echo "The local server did not respond."
  echo "Check /tmp/blackledger_design_lab_server.log for details."
  exit 1
fi

echo "Server started at ${LAB_URL}"
echo "Keep this Terminal window open while you use the design lab."
open "${LAB_URL}" >/dev/null 2>&1 || true
echo "If the browser did not open automatically, visit ${LAB_URL}"
wait "${SERVER_PID}"
