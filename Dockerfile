## ============================================================
## PricePulse API — production Docker image
## Build context: repo root (monorepo)
## ============================================================

# ----- 1. base -----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# ----- 2. dependency layer -----
# Install only the API workspace deps. We don't need the web app at all
# in this image — Vercel handles the frontend.
FROM base AS deps
COPY apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
RUN npm install --no-audit --no-fund --include=dev

# ----- 3. build layer -----
FROM base AS build
WORKDIR /app/apps/api
COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY apps/api/ ./
RUN npx prisma generate
RUN npm run build
# Trim dev deps; Prisma client and runtime stay.
RUN npm prune --omit=dev
RUN npx prisma generate

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
# Idempotent: prisma migrate deploy is a no-op if the DB is already current.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
