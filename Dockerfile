FROM oven/bun:alpine AS build
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun --bun run build

FROM oven/bun:alpine AS production
WORKDIR /app

COPY --from=build /app /app

# Persisted data lives here; owned by the unprivileged bun user.
RUN mkdir -p /app/data && chown -R bun:bun /app

USER bun
ENTRYPOINT [ "bun", "--bun", "run", "start" ]
