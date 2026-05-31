#!/usr/bin/env bash
# Fail if a new migration drops the claims table without copying existing rows first.
set -euo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"
failed=0

for file in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$file" ] || continue
  name="$(basename "$file")"
  content="$(tr '[:upper:]' '[:lower:]' < "$file")"

  # Historical migrations 0001–0004 are grandfathered (0002/0003 were one-time destructive).
  if [[ "$name" =~ ^000[1-4]_ ]]; then
    continue
  fi

  if [[ "$content" == *"drop table"* && "$content" == *"claims"* ]]; then
    if [[ "$content" != *"insert into"* ]] || [[ "$content" != *"select"* ]]; then
      echo "ERROR: $name drops claims without INSERT...SELECT data preservation" >&2
      failed=1
    fi
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "Migration safety check passed."
