[Oʻzbekcha](../uz/index.md) · [README](../../README.md)

# Business Chat Archive documentation

The bot keeps a record of your own Telegram Business conversations. It stores
each message it is allowed to archive, notifies you when one is edited or
deleted, and keeps the full chain of edits so nothing is quietly overwritten.

It is single-owner by design: one account connects it, one account can run its
commands, and the archive is a SQLite file on your own machine.

## Contents

1. [Getting started](getting-started.md) — install, configure and connect
2. [Architecture](architecture.md) — the layers and how an update flows through them
3. [The archive](archive.md) — what is stored, where, and for how long
4. [Commands](commands.md) — every command and what it answers
5. [Deployment](deployment.md) — Docker, backups, health and logs
6. [Privacy and the law](privacy.md) — what running this makes you responsible for

## Where to start

**Running it for yourself** — [Getting started](getting-started.md), then
[Commands](commands.md). Read [Privacy and the law](privacy.md) before you
connect it to a real account.

**Deploying it on a server** — [Deployment](deployment.md) covers Docker,
snapshots, the health endpoint and log rotation.

**Changing the code** — [Architecture](architecture.md) explains the layout and
the import rules; [The archive](archive.md) covers the schema and migrations.

Start with [Getting started](getting-started.md).
