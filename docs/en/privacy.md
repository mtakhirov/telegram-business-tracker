[Oʻzbekcha](../uz/privacy.md) · [Index](index.md)

# Privacy and the law

This page is not legal advice. It sets out what running this bot makes you
responsible for, so you can take that to someone qualified before you point it
at a real account.

## What the bot actually does

It stores the messages of the people you chat with, including content they later
deleted, and shows it to you. Telegram's Business Bot API delivers
`deleted_business_messages` and `edited_business_message` on purpose — CRM and
helpdesk products rely on it — but the capability is the same either way.

Everything stays on your machine. Nothing is sent to a third party, and media is
referenced by `file_id` rather than downloaded.

## You become the operator

Whoever runs an instance is responsible for the personal data it holds. Message
content is personal data, and the people it belongs to are not your users — they
are your counterparties. Depending on where you and they live, that can mean:

- a lawful basis for processing,
- telling people their conversation is being recorded,
- storing the data inside a particular country,
- registering as an operator,
- deleting someone's data when they ask.

In Uzbekistan this is ZRU-547 (*Shaxsga doir maʼlumotlar toʻgʻrisida*). In the
EU or for EU residents it is the GDPR. Other countries have their own. Get this
checked rather than assumed.

## Nobody is automatically told

Do not assume Telegram informs the other side that a bot is attached to your
business account. Check what they actually see, and tell them yourself.

Disclosure is the single control that separates a defensible business record
from covert monitoring. A one-line notice at the start of a conversation costs
nothing and changes the character of the whole archive.

## Telegram may act on it

Bots whose purpose is to defeat other people's message deletion are routinely
reported and removed. Read the Bot Terms before publishing anything based on
this, and do not build a public "see deleted messages" service on top of it. If
the token dies, the whole deployment goes with it.

## What the code does to limit exposure

The defaults lean narrow, and the controls are there to be used:

| Control                              | Effect                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| `OWNER_ID`                           | Only one account can connect the bot or run any command           |
| `DEFAULT_TRACK_MODE=deny`            | Nothing is archived until you add a chat with `/track`            |
| `RETENTION_DAYS` / `/settings`       | Messages are deleted on a schedule, hourly, regardless of traffic |
| `/forget <chat_id>`                  | Erases one chat's archive, its edit chains and its notifications  |
| Disconnecting in Telegram Business   | Purges everything recorded under that connection                  |
| File mode `600`, directory `700`     | The archive is readable only by the account running the bot       |
| Media by `file_id`                   | No media file is ever written to your disk                        |
| Scrubbed logs                        | Errors log an update id, never message text                       |

Notification details hold a copy of content the archive has already purged, so
they expire after seven days on their own schedule.

## Sensible defaults for a real deployment

```env
DEFAULT_TRACK_MODE=deny
RETENTION_DAYS=7
```

Archive only the chats you have a reason to archive, keep the window short, tell
the other side, and copy backups somewhere you control.

## What this project is not for

A business keeping a record of its own customer conversations, with the other
side informed, is the intended use. Monitoring a partner, a friend or an
employee who does not know is not, and the author will not help make that
version better at hiding what it does.
