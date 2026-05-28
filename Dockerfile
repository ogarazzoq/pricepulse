## ============================================================
## PricePulse API — production Docker image
## Build context: repo root (monorepo)
##
## Stage layout:
##   1. deps     — install ALL deps (dev+prod), no lifecycle scripts
##                 (prisma generate would fail here — schema not yet copied)
##   2. build    — copy schema + source, run prisma generate + nest build,
##                 then prune dev deps (also with --ignore-scripts so
##                 postinstall doesn't re-run on a now-incomplete tree)
##   3. runtime  — minimal alpine, non-root user, tini PID 1
## ============================================================

# ----- 1. base -----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# ----- 2. dependency layer -----
# Install deps WITHOUT running lifecycle scripts. This lets the layer
# stay cache-friendly: it only invalidates when package.json changes,
# not when source code changes. Prisma is generated explicitly later.
FROM base AS deps
WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
RUN npm install --ignore-scripts --no-audit --no-fund

# ----- 3. build layer -----
FROM base AS build
WORKDIR /app/apps/api
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY apps/api/ ./

# Schema is now present — generate the typed Prisma client.
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# Drop dev deps. --ignore-scripts is important: without it, npm would
# attempt to re-run `postinstall` (i.e. prisma generate) during prune
# which can fail in odd environments. We've already generated the client
# above; the artifacts under node_modules/.prisma/client are NOT npm
# packages and therefore survive prune.
RUN npm prune --omit=dev --ignore-scripts

# ----- 4. runtime -----
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat tini && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nestjs -G nodejs

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/apps/api/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/apps/api/package.json ./package.json
COPY --from=build --chown=nestjs:nodejs /app/apps/api/prisma ./prisma

USER nestjs
EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
# `migrate deploy` is idempotent. Runs every container start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
