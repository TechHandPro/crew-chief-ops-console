# syntax=docker/dockerfile:1.7

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No secrets are needed at build time; configuration is read at request time.
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S console && adduser -S console -G console

COPY --from=build --chown=console:console /app/.next/standalone ./
COPY --from=build --chown=console:console /app/.next/static ./.next/static
COPY --from=build --chown=console:console /app/public ./public

USER console
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
