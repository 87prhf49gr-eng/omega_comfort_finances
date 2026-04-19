#!/bin/zsh

PORT=4174
APP_VERSION=13
APP_DIR="/Users/josal/Documents/New project 5/blackledger-elite-app"
LOCAL_APP_URL="http://localhost:${PORT}/app?v=${APP_VERSION}&theme=sovereign"
HEALTH_URL="http://localhost:${PORT}/api/health"
SERVER_LOG="/tmp/blackledger_omega_public_server.log"
TUNNEL_LOG="/tmp/blackledger_omega_public_tunnel.log"
SERVER_PID_FILE="/tmp/blackledger_omega_public_server.pid"
TUNNEL_PID_FILE="/tmp/blackledger_omega_public_tunnel.pid"
URL_FILE="/Users/josal/Documents/New project 5/blackledger-public-beta-url.txt"

if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
  fi
fi

NODE_BIN="$(command -v node)"

echo "BlackLedger Omega Public Beta"
echo "Preparing the local app server and a public tunnel."

if [ -z "${NODE_BIN}" ]; then
  echo "Node.js was not found in this shell."
  echo "Open Terminal and run: source ~/.zshrc"
  exit 1
fi

cleanup_stale_pid() {
  local pid_file="$1"
  if [ -f "${pid_file}" ]; then
    local pid
    pid="$(cat "${pid_file}" 2>/dev/null)"
    if [ -n "${pid}" ] && ! kill -0 "${pid}" >/dev/null 2>&1; then
      rm -f "${pid_file}"
    fi
  fi
}

cleanup_stale_pid "${SERVER_PID_FILE}"
cleanup_stale_pid "${TUNNEL_PID_FILE}"

if ! curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
  cd "${APP_DIR}" || exit 1
  "${NODE_BIN}" server.js >"${SERVER_LOG}" 2>&1 &
  SERVER_PID=$!
  echo "${SERVER_PID}" > "${SERVER_PID_FILE}"

  for _ in {1..40}; do
    if curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done

  if ! curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "The local app server did not respond."
    echo "Check ${SERVER_LOG} for details."
    exit 1
  fi
else
  echo "Existing local app server detected at ${LOCAL_APP_URL}"
fi

if [ -f "${TUNNEL_PID_FILE}" ]; then
  OLD_TUNNEL_PID="$(cat "${TUNNEL_PID_FILE}" 2>/dev/null)"
  if [ -n "${OLD_TUNNEL_PID}" ] && kill -0 "${OLD_TUNNEL_PID}" >/dev/null 2>&1; then
    echo "Stopping the previous public tunnel."
    kill "${OLD_TUNNEL_PID}" >/dev/null 2>&1 || true
    sleep 1
  fi
  rm -f "${TUNNEL_PID_FILE}"
fi

rm -f "${TUNNEL_LOG}" "${URL_FILE}"
touch "${TUNNEL_LOG}"

(
  cd "${APP_DIR}" || exit 1
  exec ssh \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -R 80:localhost:${PORT} \
    nokey@localhost.run
) >>"${TUNNEL_LOG}" 2>&1 &

TUNNEL_PID=$!
echo "${TUNNEL_PID}" > "${TUNNEL_PID_FILE}"

extract_public_base_url() {
  sed -n 's/.*tunneled with tls termination, \(https:\/\/[^ ]*\).*/\1/p' "${TUNNEL_LOG}" | tail -n 1
}

PUBLIC_BASE_URL=""
for _ in {1..120}; do
  PUBLIC_BASE_URL="$(extract_public_base_url)"
  if [ -n "${PUBLIC_BASE_URL}" ]; then
    break
  fi
  if ! kill -0 "${TUNNEL_PID}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if [ -z "${PUBLIC_BASE_URL}" ]; then
  echo "The public tunnel did not return a usable URL."
  echo "Check ${TUNNEL_LOG} for details."
  exit 1
fi

PUBLIC_APP_URL="${PUBLIC_BASE_URL}/app?v=${APP_VERSION}&theme=sovereign"
PUBLIC_LANDING_URL="${PUBLIC_BASE_URL}/"

{
  echo "BlackLedger Omega Public Beta"
  echo "Generated: $(date)"
  echo
  echo "App URL:"
  echo "${PUBLIC_APP_URL}"
  echo
  echo "Landing URL:"
  echo "${PUBLIC_LANDING_URL}"
  echo
  echo "Important:"
  echo "- Keep this Terminal window open while testers use the beta."
  echo "- If the Mac sleeps or this window closes, the public link stops working."
} > "${URL_FILE}"

echo
echo "Public beta ready."
echo "App: ${PUBLIC_APP_URL}"
echo "Landing: ${PUBLIC_LANDING_URL}"
echo
echo "A copy of the current links was saved to:"
echo "${URL_FILE}"
echo
echo "Keep this Terminal window open while the beta is active."

open "${PUBLIC_APP_URL}" >/dev/null 2>&1 || true

wait "${TUNNEL_PID}"
