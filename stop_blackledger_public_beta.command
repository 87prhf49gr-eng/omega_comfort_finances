#!/bin/zsh

SERVER_PID_FILE="/tmp/blackledger_omega_public_server.pid"
TUNNEL_PID_FILE="/tmp/blackledger_omega_public_tunnel.pid"
URL_FILE="/Users/josal/Documents/New project 5/blackledger-public-beta-url.txt"

stop_from_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ ! -f "${pid_file}" ]; then
    echo "${label}: no tracked process."
    return
  fi

  local pid
  pid="$(cat "${pid_file}" 2>/dev/null)"

  if [ -n "${pid}" ] && kill -0 "${pid}" >/dev/null 2>&1; then
    kill "${pid}" >/dev/null 2>&1 || true
    echo "${label}: stopped."
  else
    echo "${label}: already stopped."
  fi

  rm -f "${pid_file}"
}

echo "Stopping BlackLedger Omega public beta."

stop_from_pid_file "${TUNNEL_PID_FILE}" "Public tunnel"
stop_from_pid_file "${SERVER_PID_FILE}" "Tracked app server"

rm -f "${URL_FILE}"

echo "Done."
