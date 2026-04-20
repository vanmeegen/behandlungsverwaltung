#!/usr/bin/env bash
# Smoke-test the compiled standalone binary: start it with an isolated
# BEHANDLUNG_HOME, hit the GraphQL endpoint, assert bootstrap dirs exist,
# then shut down. Read-only: never writes outside the temp dir.
set -euo pipefail

BIN="${1:-dist-standalone/behandlungsverwaltung-linux-x64}"
PORT="${PORT:-4999}"

if [ ! -x "$BIN" ]; then
  echo "smoke-standalone: binary not found or not executable: $BIN" >&2
  exit 1
fi

HOME_DIR="$(mktemp -d -t behandlungsverwaltung-smoke.XXXXXX)"
LOG_FILE="$(mktemp -t behandlungsverwaltung-smoke-log.XXXXXX)"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$HOME_DIR" "$LOG_FILE"
}
trap cleanup EXIT

echo "smoke-standalone: BEHANDLUNG_HOME=$HOME_DIR PORT=$PORT"

BEHANDLUNG_HOME="$HOME_DIR" PORT="$PORT" "$BIN" >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -sf -o /dev/null "http://localhost:$PORT/graphql" \
      -H 'Content-Type: application/json' \
      -d '{"query":"{ __typename }"}'; then
    break
  fi
  sleep 1
done

response="$(curl -sS "http://localhost:$PORT/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ kinder { id } }"}')"

echo "smoke-standalone: response=$response"

if ! echo "$response" | grep -q '"kinder":\[\]'; then
  echo "smoke-standalone: unexpected response; server log:" >&2
  cat "$LOG_FILE" >&2 || true
  exit 1
fi

for entry in app.db templates bills timesheets; do
  if [ ! -e "$HOME_DIR/$entry" ]; then
    echo "smoke-standalone: missing bootstrap entry $HOME_DIR/$entry" >&2
    exit 1
  fi
done

echo "smoke-standalone: OK"
