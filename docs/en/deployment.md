[Oʻzbekcha](../uz/deployment.md) · [Index](index.md)

# Deployment

## Docker

```sh
docker compose up -d --build
```

The container runs as the unprivileged `bun` user. Because `docker-compose.yml`
bind-mounts `./data`, the host directory must be writable by that user
(uid 1000) or SQLite fails with `EACCES`:

```sh
chown -R 1000:1000 ./data
```

Switching the volume to a named one avoids the issue at the cost of easy access
to the file from the host.

The image excludes `.env` and `data/` through `.dockerignore`, so neither the
token nor the archive is ever baked into a layer.

## Health

`GET /health` on `127.0.0.1:HEALTH_PORT` reports uptime and the archive size:

```sh
curl localhost:3000/health
# {"status":"ok","uptimeSeconds":41,"messages":1437}
```

It is bound to loopback only, which is all the Docker `HEALTHCHECK` needs
because it runs inside the container. Nothing is exposed to the network, and
`HEALTH_PORT=0` turns the server off.

The body reports the archive size, so a check can tell a process that is merely
alive from one that can still reach its database.

## Backups

A snapshot is written to `BACKUP_DIR` every `BACKUP_INTERVAL_HOURS`, and the
oldest are pruned beyond `BACKUP_KEEP`. Take one now with:

```sh
bun run db:backup
```

Snapshots use SQLite's `VACUUM INTO`, which writes a consistent, already
compacted copy while the bot keeps running. No downtime, and no chance of
capturing a half-written WAL.

**A snapshot beside the database survives corruption and mistakes, not the loss
of the disk.** Copy `BACKUP_DIR` off the machine on a schedule of your own:

```sh
rsync -a --delete ./data/backups/ backup-host:/srv/spy-bot/
```

## Logs

Output is structured JSON from pino, which is what `docker logs` and a log
collector both want. Set `LOG_PRETTY=1` for human-readable lines while
developing, and `LOG_LEVEL` to change verbosity.

`docker-compose.yml` caps logs at three files of 10 MB, so a long-running
container cannot fill the disk.

Errors are logged as the update id plus the error itself, never the whole
context, which would spill other people's message text into the logs.

## Upgrading

```sh
git pull
bun install
docker compose up -d --build
```

Migrations run on startup, so schema changes need no manual step.

If you are upgrading from a version before the owner check existed, disconnect
and reconnect the bot once in Telegram Business. The check reads the
`business_connections` table, which an older install never populated.
