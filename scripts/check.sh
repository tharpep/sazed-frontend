#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PNPM="${PNPM:-pnpm}"
"$PNPM" install --frozen-lockfile --prefer-offline
VITE_SAZED_URL=/api VITE_GATEWAY_URL=/gw "$PNPM" build
"$PNPM" test
