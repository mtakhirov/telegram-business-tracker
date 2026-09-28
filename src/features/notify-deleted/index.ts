/**
 * Notifying about messages the other side deleted.
 *
 * Rows leave the archive only after the notification carrying them has been
 * sent, so a failed send keeps the content rather than losing it for good.
 * Text messages are batched into one notification and media is sent
 * individually, because each media message needs its own upload.
 *
 * In a private chat the chat id equals the counterparty's user id, so a sender
 * whose id differs is the owner: that is how a message the owner deleted is
 * told apart from one the other side deleted, in a private chat and in a group
 * alike.
 */

import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../../shared/config/index.js";
import { getMessage, deleteMessage, isOwnerConnection, isChatTracked } from "../../entities/archive.js";
import {
  getUserDisplayName,
  formatExactSeconds,
  formatWhenSeconds,
  getMediaInfo,
} from "../../shared/lib/format.js";
import {
  chatSubject,
  eventHeader,
  metaLine,
  userLink,
  withMeta,
} from "../../shared/telegram/notify-format.js";
import { sendNotification } from "../../entities/notification/send.js";
import { contentBlocks } from "../../shared/telegram/limits.js";

const composer = new Composer();

interface TextEntry {
  msgId: number;
  senderHtml: string | null;
  when: string | null;
  exactWhen: string | null;
  content: string;
}

composer.on("deleted_business_messages", async (ctx) => {
  const deleted = ctx.update.deleted_business_messages!;
  const businessConnectionId = deleted.business_connection_id;

  if (!isOwnerConnection(businessConnectionId)) return;

  const chat = deleted.chat;
  if (!isChatTracked(chat.id)) return;

  const messageIds = deleted.message_ids;
  const subject = chatSubject(chat);
  const single = messageIds.length === 1;

  const senderOf = (from?: Parameters<typeof getUserDisplayName>[0]) =>
    from && from.id !== chat.id ? userLink(from, getUserDisplayName(from)) : null;

  const entries: TextEntry[] = [];
  const mediaMsgs: {
    stored: NonNullable<ReturnType<typeof getMessage>>;
    media: NonNullable<ReturnType<typeof getMediaInfo>>;
    msgId: number;
  }[] = [];

  for (const msgId of messageIds) {
    const stored = getMessage(businessConnectionId, chat.id, msgId);

    if (!stored) {
      entries.push({ msgId, senderHtml: null, when: null, exactWhen: null, content: "" });
      continue;
    }

    const media = getMediaInfo(stored);
    if (media) {
      mediaMsgs.push({ stored, media, msgId });
      continue;
    }

    entries.push({
      msgId,
      senderHtml: senderOf(stored.from),
      when: formatWhenSeconds(stored.date),
      exactWhen: formatExactSeconds(stored.date),
      content: stored.text || stored.caption || "",
    });
  }

  if (entries.length > 0) {
    const compact: string[] = [];
    const expanded: string[] = [];

    if (single) {
      const entry = entries[0]!;
      const header = eventHeader("🗑", "O'chirildi", subject);
      const meta = metaLine(
        `Chat ${chat.id}`,
        `msg ${entry.msgId}`,
        entry.senderHtml,
        entry.exactWhen ?? "arxivda yo'q",
      );

      compact.push(header, ...contentBlocks(entry.content));
      expanded.push(
        `${header}\n${meta}`,
        ...contentBlocks(entry.content),
        `/history ${chat.id}\n/versions ${chat.id} ${entry.msgId}`,
      );
    } else {
      const header = eventHeader("🗑", `${messageIds.length} xabar o'chirildi`, subject);

      compact.push(header);
      expanded.push(`${header}\n${metaLine(`Chat ${chat.id}`)}`);

      for (const entry of entries) {
        compact.push(...contentBlocks(entry.content));
        const meta = metaLine(`msg ${entry.msgId}`, entry.senderHtml, entry.when ?? "arxivda yo'q");
        expanded.push(...withMeta(meta, contentBlocks(entry.content)));
      }

      expanded.push(`/history ${chat.id}`);
    }

    await sendNotification(ctx.api, ADMIN_CHAT_ID, { sourceChatId: chat.id, compact, expanded });
    for (const entry of entries) {
      if (entry.when !== null) deleteMessage(businessConnectionId, chat.id, entry.msgId);
    }
  }

  for (const { stored, media, msgId } of mediaMsgs) {
    const header = eventHeader("🗑", "O'chirildi", subject);
    const meta = metaLine(
      `Chat ${chat.id}`,
      `msg ${msgId}`,
      senderOf(stored.from),
      formatExactSeconds(stored.date),
      media.word,
    );
    const content = stored.caption || stored.text || "";

    await sendNotification(ctx.api, ADMIN_CHAT_ID, {
      sourceChatId: chat.id,
      media,
      compact: [header, ...contentBlocks(content)],
      expanded: [
        `${header}\n${meta}`,
        ...contentBlocks(content),
        `/history ${chat.id}\n/versions ${chat.id} ${msgId}`,
      ],
    });
    deleteMessage(businessConnectionId, chat.id, msgId);
  }
});

export default composer;
