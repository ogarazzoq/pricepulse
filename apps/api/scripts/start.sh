#!/bin/sh
# ============================================================
# PricePulse API — production entrypoint
# ============================================================

set -u

PRISMA_BIN="./node_modules/.bin/prisma"

echo "▶ PricePulse API starting"
echo "  NODE_ENV=${NODE_ENV:-unset}  PORT=${PORT:-unset}"
echo "  cwd=$(pwd)"

if [ ! -x "$PRISMA_BIN" ]; then
  echo "✖ Prisma binary not found at $PRISMA_BIN" >&2
  exit 1
fi

echo "▶ Applying Prisma migrations (idempotent)…"
# Don't exit on migration failure - server may still work
"$PRISMA_BIN" migrate deploy || echo "⚠ Migration warning (continuing anyway)..."

echo "▶ Booting NestJS"
exec node dist/main.js
