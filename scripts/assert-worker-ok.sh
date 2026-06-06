#!/usr/bin/env bash
# Verify the production Rust API worker is live (not a Vite dev overwrite).
set -euo pipefail

BASE="${WORKER_BASE_URL:-https://aredl-coordinator.cameron-bond63.workers.dev}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://nshbeatsthearedl.christmas}"
WRANGLER_CONFIG="${WRANGLER_CONFIG:-wrangler.toml}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/backend}"

curl -fsS "$BASE/api/health" | grep -q '"service":"aredl-coordinator"'
curl -fsSI -X GET "$BASE/auth/discord" | grep -qi '^location: https://discord.com/oauth2/authorize'

if body="$(curl -sS "$BASE/" || true)" && echo "$body" | grep -q '/src/main.tsx'; then
  echo "Worker root serves Vite dev shell — wrong script is deployed" >&2
  exit 1
fi

curl -fsSI -X OPTIONS "$BASE/api/health" \
  -H "Origin: ${FRONTEND_ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  | grep -qi "^access-control-allow-origin: ${FRONTEND_ORIGIN}"

(
  cd "$BACKEND_DIR"
  active_version="$(npx wrangler deployments status -c "$WRANGLER_CONFIG" | grep -oE '[0-9a-f-]{36}' | head -1)"
  npx wrangler versions view "$active_version" -c "$WRANGLER_CONFIG" | grep -q 'Compatibility Date:  2025-10-11'
)

echo "Worker API checks passed."
