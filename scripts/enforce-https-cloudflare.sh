#!/usr/bin/env bash
# Configure Cloudflare HTTPS settings for nshbeatsthearedl.christmas (GitHub Pages origin).
set -euo pipefail

DOMAIN="nshbeatsthearedl.christmas"
CF_API="https://api.cloudflare.com/client/v4"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"

cf_api() {
  local method="$1"
  local path="$2"
  shift 2
  curl -sS -X "$method" "${CF_API}${path}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

try_patch_setting() {
  local label="$1"
  local setting="$2"
  local value="$3"
  local response
  response="$(cf_api PATCH "/zones/${ZONE_ID}/settings/${setting}" -d "{\"value\":\"${value}\"}")"
  if echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
    echo "Configured ${label}."
    return 0
  fi
  echo "Warning: unable to configure ${label} (token may lack Zone Settings Edit)." >&2
  echo "$response" | python3 -m json.tool >&2 || echo "$response" >&2
  return 1
}

echo "Looking up zone for ${DOMAIN}..."
zone_response="$(cf_api GET "/zones?name=${DOMAIN}")"
if ! echo "$zone_response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') and d.get('result') else 1)"; then
  echo "Cloudflare zone lookup failed." >&2
  echo "$zone_response" | python3 -m json.tool >&2 || echo "$zone_response" >&2
  exit 1
fi
ZONE_ID="$(echo "$zone_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['result'][0]['id'])")"
echo "Zone ID: ${ZONE_ID}"

SETTINGS_OK=true
try_patch_setting "SSL/TLS mode (Full)" "ssl" "full" || SETTINGS_OK=false
try_patch_setting "Always Use HTTPS" "always_use_https" "on" || SETTINGS_OK=false
try_patch_setting "Automatic HTTPS Rewrites" "automatic_https_rewrites" "on" || SETTINGS_OK=false
try_patch_setting "Minimum TLS version (1.2)" "min_tls_version" "1.2" || SETTINGS_OK=false

echo "Fetching DNS records..."
records_response="$(cf_api GET "/zones/${ZONE_ID}/dns_records?per_page=100")"
if ! echo "$records_response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
  echo "Cloudflare DNS list failed." >&2
  echo "$records_response" | python3 -m json.tool >&2 || echo "$records_response" >&2
  exit 1
fi

PROXY_OK=true
while IFS=$'\t' read -r record_id record_type record_name content proxied; do
  if [[ "$proxied" == "true" ]]; then
    echo "Already proxied: ${record_type} ${record_name} -> ${content}"
    continue
  fi

  echo "Enabling proxy for ${record_type} ${record_name} -> ${content}..."
  patch_payload="$(RECORD_TYPE="$record_type" RECORD_NAME="$record_name" RECORD_CONTENT="$content" python3 - <<'PY'
import json, os
print(json.dumps({
    "type": os.environ["RECORD_TYPE"],
    "name": os.environ["RECORD_NAME"],
    "content": os.environ["RECORD_CONTENT"],
    "proxied": True,
    "ttl": 1,
}))
PY
)"
  patch_response="$(cf_api PUT "/zones/${ZONE_ID}/dns_records/${record_id}" -d "$patch_payload")"
  if ! echo "$patch_response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
    echo "Failed to proxy ${record_name}." >&2
    echo "$patch_response" | python3 -m json.tool >&2 || echo "$patch_response" >&2
    PROXY_OK=false
  fi
done < <(echo "$records_response" | python3 - <<'PY'
import json, sys
data = json.load(sys.stdin)
targets = {"nshbeatsthearedl.christmas", "www.nshbeatsthearedl.christmas"}
for record in data["result"]:
    if record["name"] not in targets:
        continue
    print("\t".join([
        record["id"],
        record["type"],
        record["name"],
        record["content"],
        "true" if record["proxied"] else "false",
    ]))
PY
)

if [[ "$PROXY_OK" != true ]]; then
  echo "Cloudflare DNS proxy update failed (token may lack DNS Edit)." >&2
  exit 1
fi

if [[ "$SETTINGS_OK" != true ]]; then
  echo "Warning: zone settings were not fully applied. Update CLOUDFLARE_API_TOKEN with Zone Settings Edit for ${DOMAIN}." >&2
fi

echo "Cloudflare HTTPS configuration complete."
