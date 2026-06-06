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

require_success() {
  local label="$1"
  local response="$2"
  if ! echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)"; then
    echo "Cloudflare API failed: ${label}" >&2
    echo "$response" | python3 -m json.tool >&2 || echo "$response" >&2
    exit 1
  fi
}

echo "Looking up zone for ${DOMAIN}..."
zone_response="$(cf_api GET "/zones?name=${DOMAIN}")"
require_success "zone lookup" "$zone_response"
ZONE_ID="$(echo "$zone_response" | python3 -c "import sys, json; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else '')")"
if [[ -z "$ZONE_ID" ]]; then
  echo "Zone not found for ${DOMAIN}" >&2
  exit 1
fi
echo "Zone ID: ${ZONE_ID}"

echo "Setting SSL/TLS mode to Full..."
ssl_response="$(cf_api PATCH "/zones/${ZONE_ID}/settings/ssl" -d '{"value":"full"}')"
require_success "ssl=full" "$ssl_response"

echo "Enabling Always Use HTTPS..."
auh_response="$(cf_api PATCH "/zones/${ZONE_ID}/settings/always_use_https" -d '{"value":"on"}')"
require_success "always_use_https" "$auh_response"

echo "Enabling Automatic HTTPS Rewrites..."
ahr_response="$(cf_api PATCH "/zones/${ZONE_ID}/settings/automatic_https_rewrites" -d '{"value":"on"}')"
require_success "automatic_https_rewrites" "$ahr_response"

echo "Setting minimum TLS version to 1.2..."
tls_response="$(cf_api PATCH "/zones/${ZONE_ID}/settings/min_tls_version" -d '{"value":"1.2"}')"
require_success "min_tls_version" "$tls_response"

echo "Fetching DNS records..."
records_response="$(cf_api GET "/zones/${ZONE_ID}/dns_records?per_page=100")"
require_success "dns list" "$records_response"

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
  require_success "proxy ${record_name}" "$patch_response"
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

echo "Cloudflare HTTPS configuration complete."
