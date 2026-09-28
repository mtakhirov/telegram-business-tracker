FROM oven/bun:alpine AS build
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bun --bun run build

FROM oven/bun:alpine AS production
WORKDIR /app

COPY --from=build /app /app

# Persisted data lives here; owned by the unprivileged bun user.
RUN mkdir -p /app/data && chown -R bun:bun /app

USER bun

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + (process.env.HEALTH_PORT ?? 3000) + '/health'); process.exit(r.ok ? 0 : 1)"

ENTRYPOINT [ "bun", "--bun", "run", "start" ]
