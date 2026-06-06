#!/usr/bin/env bash
# Re-promote the Rust worker version after a competing upload overwrites production.
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

WRANGLER_CONFIG="${WRANGLER_CONFIG:-wrangler.toml}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/backend}"
WAIT_SECS="${WAIT_SECS:-30}"

(
  cd "$BACKEND_DIR"
  good_version="$(npx wrangler deployments status -c "$WRANGLER_CONFIG" | grep -oE '[0-9a-f-]{36}' | head -1)"
  echo "Captured Rust worker version: ${good_version}"
  npx wrangler versions view "$good_version" -c "$WRANGLER_CONFIG" | grep -q 'Compatibility Date:  2025-10-11'

  echo "Waiting ${WAIT_SECS}s for competing uploads to finish..."
  sleep "$WAIT_SECS"

  echo "Re-promoting ${good_version} to 100% traffic..."
  npx wrangler versions deploy "${good_version}@100%" -c "$WRANGLER_CONFIG" -y
)

echo "Production worker reasserted."
