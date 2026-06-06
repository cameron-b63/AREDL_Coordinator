#!/usr/bin/env bash
# Helper to create and store a Cloudflare API token with zone + Workers permissions.
set -euo pipefail

REPO="${1:-cameron-b63/AREDL_Coordinator}"
ZONE_NAME="${2:-nshbeatsthearedl.christmas}"

PERMS='[{"key":"dns","type":"edit"},{"key":"zone_settings","type":"edit"},{"key":"zone","type":"read"},{"key":"workers_scripts","type":"edit"},{"key":"workers_routes","type":"edit"}]'
ENCODED=$(python3 - <<PY
import json, urllib.parse
print(urllib.parse.quote(json.dumps(json.loads('''${PERMS}'''), separators=(',', ':'))))
PY
)
TOKEN_URL="https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${ENCODED}&accountId=*&zoneId=all&name=AREDL+Coordinator+deploy"

cat <<EOF
Create a Cloudflare API token with zone + Workers permissions for ${ZONE_NAME}:

  ${TOKEN_URL}

After creating the token, store it in GitHub:

  gh secret set CLOUDFLARE_API_TOKEN --repo ${REPO}

Then apply HTTPS settings:

  gh workflow run enforce-https.yml --repo ${REPO}
EOF

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO"
  echo "Updated CLOUDFLARE_API_TOKEN for ${REPO}."
fi

if [[ -n "${1:-}" && -f "$1" ]]; then
  gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO" < "$1"
  echo "Updated CLOUDFLARE_API_TOKEN from file."
fi
