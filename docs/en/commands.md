[Oʻzbekcha](../uz/commands.md) · [Index](index.md)

# Commands

Every command is owner-only. The bot stays silent for anyone else rather than
refusing, so it gives nothing away about what it is.

| Command                              | What it does                                    |
| ------------------------------------ | ----------------------------------------------- |
| `/start`                             | About the bot and how to connect it              |
| `/help`                              | The command list                                 |
| `/stats`                             | Archive size, start time and retention window    |
| `/chats`                             | Known chats and their archiving rules            |
| `/track <chat_id>`                   | Archive this chat                                |
| `/untrack <chat_id>`                 | Stop archiving it                                |
| `/untrack_reset <chat_id>`           | Drop the rule and fall back to the default       |
| `/forget <chat_id>`                  | Delete everything stored for it                  |
| `/search <word>`                     | Substring search across the archive              |
| `/history <chat_id> [limit]`         | Recent stored messages in one chat               |
| `/versions <chat_id> <message_id>`   | The full edit chain of one message               |
| `/export [chat_id]`                  | Download the archive as JSON                     |
| `/settings`                          | Show and change retention and the default rule   |

## Choosing what is archived

`/chats` lists every chat the bot has seen, whether or not it is archived, and
marks the ones with an explicit rule. Chat ids come from there.

A chat with no rule falls back to `DEFAULT_TRACK_MODE`. Setting that to `deny`
makes the archive opt-in, which is the narrower and safer default:

```
/settings track deny
/track 555
```

`/untrack` only stops future archiving. `/forget` is the one that erases what was
already stored, and it cannot be undone.

## Reading it back

```
/search kitob            matching messages from every archived chat
/history 555             the last 20 messages stored for chat 555
/history 555 100         up to 100 of them
/versions 555 1042       every version of one message
```

Search treats your query literally, so `%` finds a percent sign rather than
matching everything.

## Export

`/export` sends the whole archive as a JSON document; `/export 555` narrows it to
one chat. Each message carries its full edit chain, so the export is a complete
record rather than a snapshot of the latest text.

A bot may upload at most 50 MB. An export approaching that is refused with a
suggestion to narrow it, rather than failing inside the API call.

## Settings

```
/settings                  current values and where each comes from
/settings retention 7      keep messages for 7 days
/settings track deny       archive only chats added with /track
/settings reset retention  fall back to the value in .env
```

The environment stays the source of defaults, so a fresh install behaves exactly
as `.env` describes. A setting changed here shadows that default until it is
reset, and takes effect immediately — retention is read on every cleanup pass
and the archiving default on every message, so nothing needs a restart.

## Notifications

A notification leads with the event and the chat, and the chat name links to the
person's Telegram profile. A `t.me/<username>` link always resolves, so it is
used whenever a username exists. The `tg://user?id=` fallback only opens for
users who have contacted the bot, which chat counterparties generally have not,
so the numeric id is also printed in the expanded view.

Ids, the exact timestamp and follow-up commands sit behind a **Batafsil**
button, which expands the message in place and turns into **Yashirish**. The
button is attached when the notification fits one message; a longer one is sent
expanded from the start.

Details behind the button expire after seven days, after which the button says
so instead of failing silently.
