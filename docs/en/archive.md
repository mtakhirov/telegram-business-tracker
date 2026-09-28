[Oʻzbekcha](../uz/archive.md) · [Index](index.md)

# The archive

## What is stored

Everything lives in one SQLite file at `DB_PATH`.

| Table                  | Holds                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| `messages`             | The latest state of each archived message, including media `file_id`     |
| `message_versions`     | The append-only edit chain for each message                              |
| `chats`                | Chat id, title and last-seen time for every observed chat — no content   |
| `chat_rules`           | Your per-chat archiving decisions                                        |
| `business_connections` | Connection id, owner id, enabled flag                                    |
| `notification_details` | Both renderings of a sent notification, so its button still works        |
| `settings`             | Runtime overrides for the values `/settings` can change                  |

Media is referenced by `file_id` and never downloaded, so the database stays
small and no media file ever lands on your disk.

`chats` exists so `/chats` can offer a chat you have not archived yet. It holds
metadata only.

## Why versions are separate

A message row is overwritten in place on every edit. Without a second table the
intermediate versions would be lost, and an archive that silently forgets what a
message used to say is not much of an archive. `message_versions` is append-only
and a row is added only when the text or caption actually changed, so a repeated
update does not inflate the chain.

Read a chain with `/versions <chat_id> <message_id>`.

## Why notification details are separate

A deleted message is purged from `messages` as soon as its notification has been
delivered. The notification itself can still be expanded later, so the expanded
text has to outlive the row it describes.

These rows therefore duplicate content the archive no longer holds. They carry a
shorter lifetime of their own — **seven days** — and are dropped when a chat is
forgotten.

## Retention

Rows older than the retention window are deleted on startup and hourly
thereafter, independent of traffic, so a quiet bot still forgets on schedule.

```
/settings retention 7     keep messages for 7 days
/settings reset retention fall back to RETENTION_DAYS
```

Deleting reaches every table that holds content. Removing one message, one chat,
one connection, or a retention sweep each drop the matching edit chain, which is
why chat id and connection id are duplicated onto the version rows.

## File permissions

The database holds other people's private messages. The file is created with
mode `600` and its directory with `700`, and WAL journalling keeps reads from
blocking the single writer.

## Schema changes

The schema is declared once in `src/shared/db/schema.ts` and shared by the
queries and the migrations.

```sh
bun run db:generate   # after editing the schema, writes SQL to drizzle/
bun run db:migrate    # apply manually
bun run db:studio     # browse the data
```

Migrations are applied automatically on startup, so a fresh install and an
upgraded one both reach the current schema without a manual step. Generated SQL
lives in `drizzle/` and belongs in version control.
