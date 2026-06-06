#!/usr/bin/env bash
# Re-provision GitHub Pages custom-domain cert and enforce HTTPS.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-cameron-b63/AREDL_Coordinator}"
DOMAIN="nshbeatsthearedl.christmas"
MAX_WAIT_SECS="${MAX_WAIT_SECS:-900}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"

: "${GH_TOKEN:=}"
if [[ -z "$GH_TOKEN" ]] && ! gh auth status >/dev/null 2>&1; then
  echo "GH_TOKEN is required when gh is not authenticated" >&2
  exit 1
fi

gh_api() {
  if [[ -n "$GH_TOKEN" ]]; then
    GH_TOKEN="$GH_TOKEN" gh api "$@"
  else
    gh api "$@"
  fi
}

current_pages="$(gh_api "repos/${REPO}/pages")"
https_enforced="$(echo "$current_pages" | python3 -c "import sys,json; print('true' if json.load(sys.stdin).get('https_enforced') else 'false')")"
cert_state="$(echo "$current_pages" | python3 -c "import sys,json; cert=json.load(sys.stdin).get('https_certificate') or {}; print(cert.get('state') or 'missing')")"

if [[ "$https_enforced" == "true" && "$cert_state" == "approved" ]]; then
  echo "GitHub Pages already enforces HTTPS with an approved certificate for ${DOMAIN}."
  echo "$current_pages" | python3 -m json.tool
  exit 0
fi

wait_for_https() {
  local elapsed=0
  while (( elapsed < MAX_WAIT_SECS )); do
    local health
    health="$(gh_api "repos/${REPO}/pages/health" 2>/dev/null || echo '{}')"
    local responds error
    responds="$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin).get('domain',{}); print('true' if d.get('responds_to_https') else 'false')" 2>/dev/null || echo false)"
    error="$(echo "$health" | python3 -c "import sys,json; d=json.load(sys.stdin).get('domain',{}); print(d.get('https_error') or '')" 2>/dev/null || echo '')"
    echo "Health check: responds_to_https=${responds} https_error=${error:-none} (${elapsed}s elapsed)"
    if [[ "$responds" == "true" ]]; then
      return 0
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  return 1
}

echo "Re-triggering GitHub Pages certificate for ${DOMAIN}..."
gh_api -X PUT "repos/${REPO}/pages" \
  -f cname= \
  -f build_type=legacy

echo "Waiting 120s for domain removal to propagate..."
sleep 120

gh_api -X PUT "repos/${REPO}/pages" \
  -f cname="${DOMAIN}" \
  -f build_type=legacy

echo "Waiting for origin HTTPS to become valid..."
if ! wait_for_https; then
  echo "Timed out waiting for GitHub Pages origin HTTPS. Continuing anyway." >&2
fi

echo "Enabling GitHub Pages Enforce HTTPS..."
if ! gh_api -X PUT "repos/${REPO}/pages" \
  -F https_enforced=true \
  -f cname="${DOMAIN}" \
  -f build_type=legacy; then
  echo "Unable to update Pages settings from this token. Enable Enforce HTTPS manually if needed." >&2
  exit 1
fi

gh_api "repos/${REPO}/pages" | python3 -m json.tool

echo "GitHub Pages HTTPS enforcement configured."
