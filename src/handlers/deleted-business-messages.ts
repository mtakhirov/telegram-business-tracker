import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, deleteMessage, isOwnerConnection, isChatTracked } from "../store/message-store.js";
import { getUserDisplayName, formatExactSeconds, formatWhenSeconds, getMediaInfo } from "../utils/format.js";
import { chatSubject, eventHeader, metaLine, userLink, withMeta } from "../utils/notify-format.js";
import { sendNotification } from "../utils/notify.js";
import { contentBlocks } from "../utils/telegram-limits.js";

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

  // In a private chat the chat id equals the counterparty's user id, so a
  // different sender id means the message was the owner's own.
  const senderOf = (from?: Parameters<typeof getUserDisplayName>[0]) =>
    from && from.id !== chat.id ? userLink(from, getUserDisplayName(from)) : null;

  // Classify without deleting yet. Rows are removed from the store only after
  // the notification for them has been sent, so a send failure never loses data.
  const entries: TextEntry[] = [];
  const mediaMsgs: { stored: NonNullable<ReturnType<typeof getMessage>>; media: NonNullable<ReturnType<typeof getMediaInfo>>; msgId: number }[] = [];

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

  // Send the text notification first, then drop those rows only if it
  // succeeded.
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

  // Send each media message separately, deleting each row only after its send.
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
