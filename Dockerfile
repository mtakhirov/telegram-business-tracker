FROM oven/bun:alpine AS build
WORKDIR /app

COPY package.json bun.lock* ./

RUN apk update && apk add --no-cache \
    python3 \
    make \
    g++

RUN bun install --frozen-lockfile

COPY . .
RUN bun --bun run build

FROM oven/bun:alpine AS production
WORKDIR /app

COPY --from=build /app /app
ENTRYPOINT [ "bun", "--bun", "run", "start" ]
