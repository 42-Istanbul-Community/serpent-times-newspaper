# syntax=docker/dockerfile:1

ARG BUN_VERSION=1

# Chromium comes from the distro, not puppeteer's own download: the bundled
# build is linked against libs a slim image does not carry, and apt pulls
# them in alongside it. The runtime stage installs it.

# --- dependencies (including dev, needed to compile) -------------------------
FROM oven/bun:${BUN_VERSION}-slim AS deps
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json bun.lock bunfig.toml .npmrc ./
RUN bun install --frozen-lockfile

FROM oven/bun:${BUN_VERSION}-slim AS prod-deps
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app
COPY package.json bun.lock bunfig.toml .npmrc ./
RUN bun install --frozen-lockfile --production

# --- build -------------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SvelteKit imports the server modules while analysing routes, so the ones that
# validate their config at import time have to be satisfied. These placeholders
# are inert: postgres.js only dials on first query, and every module reads
# $env/dynamic/private, which resolves at runtime - nothing here is baked into
# the output. Kept on the RUN so they stay out of the image env too.
RUN DATABASE_URL=postgres://build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    bun run build \
    && bun build scripts/migrate.ts --target=bun --outfile build/migrate.js

# --- runtime -----------------------------------------------------------------
FROM oven/bun:${BUN_VERSION}-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
        fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_ARGS=--no-sandbox,--disable-dev-shm-usage \
    CDN_ROOT=/data/cdn

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY drizzle ./drizzle
COPY package.json ./

# uploads live on a volume mounted here, so the app user has to own the path
# before docker creates it as root.
RUN mkdir -p /data/cdn && chown -R bun:bun /data

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e "process.exit((await fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health')).ok ? 0 : 1)"

CMD ["bun", "./build/index.js"]
