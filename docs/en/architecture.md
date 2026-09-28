[Oʻzbekcha](../uz/architecture.md) · [Index](index.md)

# Architecture

## Layers

The source follows a feature-sliced layout. Imports only ever point down, and a
feature never imports another feature.

```
src/app/        composition: bot, handlers, commands, health, entry point
src/features/   one slice per user-facing behaviour
src/entities/   message, chat, connection, notification, settings
src/shared/     config, db, telegram helpers, formatting, logger
```

| Layer      | May import                  | Holds                                                                 |
| ---------- | --------------------------- | --------------------------------------------------------------------- |
| `shared`   | nothing in the project      | Config, database client and schema, Telegram helpers, logger          |
| `entities` | `shared`                    | One repository per table group, plus notification sending             |
| `features` | `shared`, `entities`        | One slice per behaviour, each exporting a grammY `Composer`           |
| `app`      | everything                  | Wiring, the update subscription, scheduled work, shutdown             |

## Features

| Slice               | Answers                                              |
| ------------------- | ---------------------------------------------------- |
| `archive-message`   | `business_message` — stores what may be archived     |
| `notify-edited`     | `edited_business_message`                            |
| `notify-deleted`    | `deleted_business_messages`                          |
| `notify-connection` | `business_connection` — the owner gate               |
| `toggle-details`    | The expand button on a notification                  |
| `chat-rules`        | `/chats`, `/track`, `/untrack`, `/untrack_reset`, `/forget` |
| `search-archive`    | `/search`, `/history`                                |
| `message-versions`  | `/versions`                                          |
| `export-archive`    | `/export`                                            |
| `settings`          | `/settings`                                          |
| `bot-info`          | `/start`, `/help`, `/stats`                          |

## How an update flows

A deleted message is the most involved path:

1. Telegram delivers `deleted_business_messages`, which names a connection id
   and the message ids, but no content.
2. `notify-connection` has already recorded which connection belongs to the
   owner. The feature checks it and stops if it does not match.
3. The chat rule is checked. An unarchived chat produces no notification.
4. Each id is looked up in the archive and split into text and media.
5. The notification is rendered twice, compact and expanded, and sent with a
   button that can swap one for the other.
6. **Only after the send succeeds** are the rows deleted. A failed send keeps
   the content rather than losing it for good.

Edits follow the same shape but store the new version *before* notifying, so a
failed send still leaves the archive holding the correct latest text for the
next comparison.

## Subscriptions

Telegram delivers nothing for an update type left out of `allowed_updates`, so a
handler for a missing type never runs and fails silently. `ALLOWED_UPDATES`
therefore lives in `src/app/handlers.ts` beside the features that consume it,
and a test reads the feature sources to check that:

- every update type a feature subscribes to is declared, and
- every feature that handles an update is imported and used by the barrel.

Both failures are invisible to the type checker, because every feature exports
the same `Composer` shape.

## Outgoing calls

Three transformers wrap every Bot API call, installed in `src/app/bot.ts`:

- link previews are suppressed,
- `429` responses are retried honouring `retry_after`,
- calls are throttled so a burst cannot trip Telegram's rate limits.

grammY runs transformers in reverse installation order, so the one installed
last is the outermost.

## Message size

A Telegram message caps at 4096 characters and a caption at 1024. Notification
text is therefore built as a list of self-contained blocks, each with balanced
tags, which `packBlocks` packs into as few messages as the limits allow.
Splitting happens on escaped text and never inside an HTML entity or between
`<s>` and `</s>`, because either would make Telegram reject the message with a
parse error.

## Tests

140 tests, run with `bun test --isolate`. Isolation matters: the database client
is a module-level singleton, so without a fresh module registry per file one
test file would close the database another is still using.

Handler and command tests build a real grammY `Context` whose `Api` is
intercepted by a transformer, so they assert the exact text Telegram would
receive rather than the shape of an internal helper.
