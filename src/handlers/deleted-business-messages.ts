import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, deleteMessage, isOwnerConnection, isChatTracked } from "../store/message-store.js";
import { getUserDisplayName, formatWhenSeconds, getMediaInfo } from "../utils/format.js";
import { chatLabel, eventHeader, metaLine, withMeta } from "../utils/notify-format.js";
import { sendMediaWithBlocks } from "../utils/send-media.js";
import { quote, sendBlocks } from "../utils/telegram-limits.js";

const composer = new Composer();

interface TextEntry {
  msgId: number;
  sender: string | null;
  when: string | null;
  content: string;
}

composer.on("deleted_business_messages", async (ctx) => {
  const deleted = ctx.update.deleted_business_messages!;
  const businessConnectionId = deleted.business_connection_id;

  if (!isOwnerConnection(businessConnectionId)) return;

  const chat = deleted.chat;
  if (!isChatTracked(chat.id)) return;

  const messageIds = deleted.message_ids;
  const label = chatLabel(chat);
  const single = messageIds.length === 1;

  // In a private chat the chat id equals the counterparty's user id, so a
  // different sender id means the message was the owner's own.
  const senderOf = (from?: Parameters<typeof getUserDisplayName>[0]) =>
    from && from.id !== chat.id ? getUserDisplayName(from) : null;

  // Classify without deleting yet. Rows are removed from the store only after
  // the notification for them has been sent, so a send failure never loses data.
  const entries: TextEntry[] = [];
  const mediaMsgs: { stored: NonNullable<ReturnType<typeof getMessage>>; media: NonNullable<ReturnType<typeof getMediaInfo>>; msgId: number }[] = [];

  for (const msgId of messageIds) {
    const stored = getMessage(businessConnectionId, chat.id, msgId);

    if (!stored) {
      entries.push({ msgId, sender: null, when: null, content: "" });
      continue;
    }

    const media = getMediaInfo(stored);
    if (media) {
      mediaMsgs.push({ stored, media, msgId });
      continue;
    }

    entries.push({
      msgId,
      sender: senderOf(stored.from),
      when: formatWhenSeconds(stored.date),
      content: stored.text || stored.caption || "",
    });
  }

  // Send the text notification first, then drop those rows only if it
  // succeeded. Long output is split across several messages.
  if (entries.length > 0) {
    const blocks: string[] = [];

    if (single) {
      const entry = entries[0]!;
      const meta = metaLine(`Chat ${chat.id}`, `msg ${entry.msgId}`, entry.sender, entry.when ?? "arxivda yo'q");
      blocks.push(`${eventHeader("🗑", "O'chirildi", label)}\n${meta}`, ...quote(entry.content));
    } else {
      blocks.push(
        `${eventHeader("🗑", `${messageIds.length} xabar o'chirildi`, label)}\n${metaLine(`Chat ${chat.id}`)}`,
      );
      for (const entry of entries) {
        const meta = metaLine(`msg ${entry.msgId}`, entry.sender, entry.when ?? "arxivda yo'q");
        blocks.push(...withMeta(meta, quote(entry.content)));
      }
    }

    await sendBlocks(ctx.api, ADMIN_CHAT_ID, blocks);
    for (const entry of entries) {
      if (entry.when !== null) deleteMessage(businessConnectionId, chat.id, entry.msgId);
    }
  }

  // Send each media message separately, deleting each row only after its send.
  for (const { stored, media, msgId } of mediaMsgs) {
    const mediaHeader =
      `${eventHeader("🗑", "O'chirildi", label)}\n` +
      metaLine(`Chat ${chat.id}`, `msg ${msgId}`, senderOf(stored.from), formatWhenSeconds(stored.date), media.word);

    const content = stored.caption || stored.text || "";
    await sendMediaWithBlocks(ctx.api, ADMIN_CHAT_ID, media, mediaHeader, quote(content));
    deleteMessage(businessConnectionId, chat.id, msgId);
  }
});

export default composer;
