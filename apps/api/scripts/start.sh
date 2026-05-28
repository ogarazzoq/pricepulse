#!/bin/sh
# ============================================================
# PricePulse API — production entrypoint
#
# This script is the runtime CMD. It must NOT depend on:
#   - npm workspaces  (the runtime image isn't a monorepo)
#   - npx PATH lookup (we resolve the binary directly)
#   - any dev dependency
# ============================================================

set -e
set -u

PRISMA_BIN="./node_modules/.bin/prisma"

echo "▶ PricePulse API starting"
echo "  NODE_ENV=${NODE_ENV:-unset}  PORT=${PORT:-unset}"
echo "  cwd=$(pwd)"

if [ ! -x "$PRISMA_BIN" ]; then
  echo "✖ Prisma binary not found at $PRISMA_BIN" >&2
  echo "  This indicates the production image was built without 'prisma' in dependencies." >&2
  exit 1
fi

echo "▶ Applying Prisma migrations (idempotent)…"
"$PRISMA_BIN" migrate deploy

echo "▶ Booting NestJS"
exec node dist/main.js
