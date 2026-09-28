[Oʻzbekcha](../uz/getting-started.md) · [Index](index.md)

# Getting started

## Requirements

- [Bun](https://bun.sh) 1.2 or newer. The code imports `bun:sqlite`, so Node.js
  cannot run it.
- Telegram Premium, because Telegram Business is a Premium feature.
- A bot token from [@BotFather](https://t.me/BotFather).

## Install

```sh
bun install
cp .env.example .env
```

`bun install` also installs the git hooks, which format, lint, typecheck and
test before each commit.

## Configure

Only the first two are required.

| Variable                | Default                 | Purpose                                                        |
| ----------------------- | ----------------------- | -------------------------------------------------------------- |
| `BOT_TOKEN`             | —                       | Token from @BotFather                                          |
| `ADMIN_CHAT_ID`         | —                       | Where notifications are sent                                   |
| `OWNER_ID`              | `ADMIN_CHAT_ID`         | The only account allowed to connect the bot and run commands   |
| `BOT_NAME`              | `Business Chat Archive` | Display name used in the bot's own messages                    |
| `DB_PATH`               | `data/messages.db`      | SQLite file location                                           |
| `RETENTION_DAYS`        | `30`                    | Days before a stored message is deleted                        |
| `DEFAULT_TRACK_MODE`    | `allow`                 | Whether a chat with no rule is archived                        |
| `HEALTH_PORT`           | `3000`                  | Health endpoint on 127.0.0.1; `0` disables it                  |
| `BACKUP_DIR`            | `data/backups`          | Where snapshots are written                                    |
| `BACKUP_INTERVAL_HOURS` | `24`                    | Hours between snapshots; `0` disables them                     |
| `BACKUP_KEEP`           | `7`                     | How many snapshots to keep                                     |
| `LOG_LEVEL`             | `info`                  | pino log level                                                 |
| `LOG_PRETTY`            | —                       | Set to `1` for human-readable logs                             |

`OWNER_ID` falls back to `ADMIN_CHAT_ID`, which is correct when notifications go
to your own chat, because a private chat id equals the user id. If
`ADMIN_CHAT_ID` points at a group or channel that fallback is meaningless, and
the bot refuses to start without an explicit `OWNER_ID`.

The environment is validated once at startup. A missing or malformed value stops
the bot with a list of what is wrong, rather than throwing on the first update
hours later. To inspect the schema interactively:

```sh
bunx @envin/cli@latest dev -c src/shared/config/env.ts
```

## Run

```sh
bun run dev                  # watch mode, straight from source
bun run build && bun start   # compiled
```

Migrations are applied on startup, so the database builds itself on first
launch. Nothing needs to be created by hand.

## Connect it to Telegram Business

1. Telegram → **Settings** → **Telegram Business** → **Chatbots**
2. Enter the bot's username and connect it
3. The bot checks that the connecting account is `OWNER_ID` and refuses everyone
   else, reporting the attempt with the stranger's user id

**If you upgraded from an earlier version, disconnect and reconnect once.** The
owner check reads the `business_connections` table, which starts empty, so an
older connection is ignored until it is re-established.

## Verify

Send `/stats` to the bot. It answers with the archive size, when it started and
the retention window. If it stays silent, the account you messaged from is not
`OWNER_ID`.
