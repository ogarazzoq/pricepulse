#!/bin/sh
# ============================================================
# PricePulse API — production entrypoint script
# ============================================================
# Why a script (and not chained `&&` in CMD)?
#
# Railway (and many orchestrators) override the Docker CMD with
# their own start-command string. If that string is split into
# argv without a shell wrapper, operators like `&&` are passed
# as literal arguments and the chain silently breaks. Routing
# everything through this script keeps startup deterministic.
# ============================================================

set -e   # fail fast on any error
set -u   # treat unset variables as errors

echo "▶ PricePulse API starting"
echo "  NODE_ENV=${NODE_ENV:-unset}  PORT=${PORT:-unset}"

echo "▶ Applying Prisma migrations (idempotent)…"
npx --no-install prisma migrate deploy

echo "▶ Booting NestJS"
exec node dist/main.js
