# Business Chat Archive

A self-hosted Telegram bot that keeps an archive of your own Telegram Business
conversations, including the versions of messages that were later **edited** or
**deleted**.

Built on the official [Telegram Business Bot API][business-api], which delivers
`business_message`, `edited_business_message` and `deleted_business_messages`
updates to a bot you connect to your own business account.

[business-api]: https://core.telegram.org/bots/api#business-connection

## Read this before you run it

This bot stores the messages of the people you chat with, including content they
later deleted. That has consequences you own, not the author of this code:

- **You become the data controller.** Whoever runs this instance is responsible
  for the personal data it stores. Depending on where you and your contacts
  live, that can mean obligations under GDPR, Uzbekistan's ZRU-547 or an
  equivalent law: a lawful basis for processing, local storage requirements,
  registration, and deletion on request.
- **Your contacts do not automatically know.** Do not assume Telegram tells
  them. Check what the other side actually sees, and tell them yourself.
- **Telegram may act on it.** Bots whose purpose is to defeat other people's
  message deletion get reported and removed. Read the Bot Terms before you
  publish anything based on this.
- **Keep the retention window short.** `RETENTION_DAYS` defaults to 30. Lower is
  better.
- **Archive only the chats you need.** Set `DEFAULT_TRACK_MODE=deny` and add
  chats explicitly with `/track`.

The intended use is a business keeping a record of its own customer
conversations, with the other side informed. Using it to monitor people who do
not know is not what this project is for.

## Requirements

- [Bun](https://bun.sh) 1.2+ — the code uses `bun:sqlite`, so Node.js will not
  run it
- A Telegram Premium subscription (Telegram Business is a Premium feature)
- A bot token from [@BotFather](https://t.me/BotFather)

## Setup

```bash
bun install
cp .env.example .env
```

Fill in `.env`:

| Variable             | Required | Default               | Purpose                                                             |
| -------------------- | -------- | --------------------- | ------------------------------------------------------------------- |
| `BOT_TOKEN`          | yes      | —                     | Token from @BotFather                                               |
| `ADMIN_CHAT_ID`      | yes      | —                     | Where notifications are sent                                        |
| `OWNER_ID`           | no\*     | `ADMIN_CHAT_ID`       | The only user allowed to connect the bot                            |
| `BOT_NAME`           | no       | `Business Chat Archive` | Display name used in the bot's own messages                       |
| `DB_PATH`            | no       | `data/messages.db`    | SQLite file location                                                |
| `RETENTION_DAYS`     | no       | `30`                  | Days before a stored message is deleted                             |
| `DEFAULT_TRACK_MODE` | no       | `allow`               | Whether a chat with no rule is archived (`allow` or `deny`)          |

\* `OWNER_ID` is required when `ADMIN_CHAT_ID` is a group or channel, because
the fallback only works when it is your own user ID.

The environment is validated at startup with [envin](https://envin.turbostarter.dev);
a missing or malformed value stops the bot with an explicit message. To inspect
the schema interactively:

```bash
bunx @envin/cli@latest dev -c src/core/env.ts
```

## Run

```bash
bun run dev             # watch mode, runs from source
bun run build && bun start   # compile to dist/, then run
```

With Docker:

```bash
docker compose up -d --build
```

The container runs as the unprivileged `bun` user. Because `docker-compose.yml`
bind-mounts `./data`, the host directory must be writable by that user
(uid 1000) or SQLite will fail with `EACCES`. Either `chown -R 1000:1000 ./data`
on the host or switch the volume to a named one.

## Connect it to Telegram Business

1. Telegram → **Settings** → **Telegram Business** → **Chatbots**
2. Enter the bot's username and connect it
3. The bot verifies that the connecting account is `OWNER_ID` and rejects
   everyone else

**If you upgraded from an earlier version,** disconnect and reconnect once. The
owner check reads the `business_connections` table, which is empty until a
`business_connection` update arrives, so an older connection is ignored until
you reconnect.

## Commands

All commands are owner-only and silently ignore everyone else.

| Command                             | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `/start`                            | About the bot                               |
| `/help`                             | Command list                                |
| `/stats`                            | Archive size and start time                 |
| `/chats`                            | Known chats and their archiving rules       |
| `/track <chat_id>`                  | Archive this chat                           |
| `/untrack <chat_id>`                | Stop archiving this chat                    |
| `/untrack_reset <chat_id>`          | Remove the rule, fall back to the default   |
| `/forget <chat_id>`                 | Delete stored messages for a chat           |
| `/search <word>`                    | Substring search across the archive         |
| `/history <chat_id> [limit]`        | Recent stored messages in a chat            |
| `/versions <chat_id> <message_id>`  | Full edit chain for one message             |
| `/export [chat_id]`                 | Download the archive as JSON                |

## What it does

| Event        | Behaviour                                                              |
| ------------ | ---------------------------------------------------------------------- |
| New message  | Stored, if the chat is archived                                        |
| Edited       | Notifies with the old text struck through above the new one            |
| Deleted      | Notifies with the stored content, then drops the row                   |
| Connection   | Notifies on connect and disconnect; purges data on disconnect          |

A notification leads with the event and the chat, whose name links to the
person's Telegram profile — `t.me/<username>` when they have one, otherwise
`tg://user?id=<id>`. The id form only opens for users who have contacted the
bot, so the id is also printed as text in the expanded view.

Chat and message ids, the exact timestamp and the follow-up commands sit behind
an **ℹ️ Batafsil** button, which expands the message in place and turns into
**▲ Yashirish**. The button is attached when the notification fits one message;
a longer one is sent expanded from the start.

Notifications are sent before rows are deleted, so a failed send never loses
data. Messages longer than Telegram's limits (4096 characters, 1024 for
captions) are split across several messages.

## What is stored

In `DB_PATH`:

- `messages` — latest state of each archived message, including media `file_id`
- `message_versions` — the edit chain for each message
- `chats` — chat id, title and last-seen time, for every observed chat, so
  `/chats` can offer them; no message content
- `chat_rules` — your per-chat archiving decisions
- `business_connections` — connection id, owner id, enabled flag
- `notification_details` — the collapsed and expanded text of a sent
  notification, so the expand button still works later

Media is referenced by `file_id` and never downloaded. The database file is
created with mode `600` and its directory with `700`.

Rows older than `RETENTION_DAYS` are deleted on startup and hourly thereafter.
`notification_details` keeps its own **7-day** limit, because it holds a copy of
content that `messages` has already purged; it is also dropped by
`/forget <chat_id>`.

## Development

```bash
bun run typecheck   # tsc --noEmit
bun run test        # unit tests (isolated per file; plain `bun test` shares one DB)
```

`lefthook` runs the typecheck and tests before each commit and lints the commit
message with `commitlint` (Conventional Commits). Hooks install via
`bun install`; to set them up manually run `bunx lefthook install`.

## Stack

- [grammY](https://grammy.dev) — Telegram bot framework, with `auto-retry` and
  `transformer-throttler` for rate limits
- [Bun](https://bun.sh) runtime and `bun:sqlite`
- [envin](https://envin.turbostarter.dev) + [zod](https://zod.dev) for
  environment validation

## License

[MIT](./LICENSE)
