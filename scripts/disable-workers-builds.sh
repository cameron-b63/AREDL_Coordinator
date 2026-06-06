#!/usr/bin/env bash
# Disable Cloudflare Workers Builds triggers on aredl-coordinator.
# GitHub Actions is the sole deploy path for the Rust API worker. Workers Builds
# connected to this repo can overwrite production with a Vite/Node script.
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-aredl-coordinator}"
CF_API="https://api.cloudflare.com/client/v4"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"

cf_api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS -X "$method" "${CF_API}${path}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

echo "Checking Workers Builds triggers for ${WORKER_NAME}..."
response="$(cf_api GET "/accounts/${CLOUDFLARE_ACCOUNT_ID}/builds/workers/${WORKER_NAME}/triggers")"

if ! echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
  echo "Workers Builds trigger lookup failed (token may lack Builds permissions); skipping." >&2
  echo "$response" | python3 -m json.tool >&2 || echo "$response" >&2
  exit 0
fi

trigger_count="$(echo "$response" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('result') or []))")"
if [[ "$trigger_count" == "0" ]]; then
  echo "No Workers Builds triggers found for ${WORKER_NAME}."
  exit 0
fi

echo "Found ${trigger_count} Workers Builds trigger(s). Removing..."
while IFS=$'\t' read -r trigger_uuid trigger_name root_directory branch; do
  echo "Deleting trigger ${trigger_name} (${trigger_uuid}), root=${root_directory:-/}, branch=${branch:-*}"
  delete_response="$(cf_api DELETE "/accounts/${CLOUDFLARE_ACCOUNT_ID}/builds/triggers/${trigger_uuid}")"
  if ! echo "$delete_response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
    echo "Failed to delete trigger ${trigger_uuid}." >&2
    echo "$delete_response" | python3 -m json.tool >&2 || echo "$delete_response" >&2
    exit 1
  fi
done < <(echo "$response" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
for trigger in data.get("result") or []:
    print("\t".join([
        trigger.get("trigger_uuid") or "",
        trigger.get("trigger_name") or "",
        trigger.get("root_directory") or "",
        trigger.get("branch") or "",
    ]))
PY
)

echo "Workers Builds triggers removed for ${WORKER_NAME}."
