import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, deleteMessage, isOwnerConnection } from "../store/message-store.js";
import { getUserDisplayName, formatDate, getContentDescription, getMediaInfo, escapeHtml } from "../utils/format.js";
import { sendMediaWithBlocks } from "../utils/send-media.js";
import { quote, sendBlocks } from "../utils/telegram-limits.js";

const composer = new Composer();

composer.on("deleted_business_messages", async (ctx) => {
  const deleted = ctx.update.deleted_business_messages!;
  const businessConnectionId = deleted.business_connection_id;

  if (!isOwnerConnection(businessConnectionId)) return;

  const chat = deleted.chat;
  const messageIds = deleted.message_ids;
  const chatName = chat.first_name || chat.title || `Chat ${chat.id}`;

  const header =
    `🗑 <b>Xabar(lar) o'chirildi!</b>\n\n` +
    `💬 Chat: ${escapeHtml(chatName)} (<code>${chat.id}</code>)\n` +
    `📊 O'chirilgan xabarlar soni: ${messageIds.length}`;

  // Classify without deleting yet. Rows are removed from the store only after
  // the notification for them has been sent, so a send failure never loses data.
  const textBlocks: string[] = [];
  const textMsgIds: number[] = [];
  const mediaMsgs: { stored: NonNullable<ReturnType<typeof getMessage>>; media: NonNullable<ReturnType<typeof getMediaInfo>>; msgId: number }[] = [];
  const notFoundIds: number[] = [];

  for (const msgId of messageIds) {
    const stored = getMessage(businessConnectionId, chat.id, msgId);

    if (!stored) {
      notFoundIds.push(msgId);
      continue;
    }

    const media = getMediaInfo(stored);
    if (media) {
      mediaMsgs.push({ stored, media, msgId });
    } else {
      const user = getUserDisplayName(stored.from);
      const content = stored.text || stored.caption || getContentDescription(stored);
      const date = formatDate(stored.date);

      const meta =
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: <code>${msgId}</code>\n` +
        `👤 Kim: ${escapeHtml(user)}\n` +
        `📅 Yuborilgan: ${date}\n` +
        `📝 Mazmuni:`;
      // Long content becomes several blockquote blocks; each stays under the limit.
      textBlocks.push(meta, ...quote(content));
      textMsgIds.push(msgId);
    }
  }

  // Send text-only and not-found messages first, then drop those rows only if
  // the send succeeded. Long output is split across several messages.
  if (textBlocks.length > 0 || notFoundIds.length > 0) {
    const notFoundBlocks = notFoundIds.map(
      (msgId) =>
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 ID: <code>${msgId}</code>\n` +
        `⚠️ <i>Bu xabar botning xotirasida topilmadi</i>`,
    );

    await sendBlocks(ctx.api, ADMIN_CHAT_ID, [header, ...textBlocks, ...notFoundBlocks]);
    for (const msgId of textMsgIds) {
      deleteMessage(businessConnectionId, chat.id, msgId);
    }
  }

  // Send each media message separately, deleting each row only after its send.
  for (const { stored, media, msgId } of mediaMsgs) {
    const user = getUserDisplayName(stored.from);
    const date = formatDate(stored.date);
    const content = stored.caption || stored.text || "";

    const mediaHeader =
      `🗑 <b>O'chirilgan xabar</b>\n\n` +
      `👤 Kim: ${escapeHtml(user)}\n` +
      `💬 Chat: ${escapeHtml(chatName)}\n` +
      `🆔 ID: <code>${msgId}</code>\n` +
      `📅 Yuborilgan: ${date}\n\n` +
      `[${media.label}]\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    await sendMediaWithBlocks(ctx.api, ADMIN_CHAT_ID, media, mediaHeader, quote(content));
    deleteMessage(businessConnectionId, chat.id, msgId);
  }
});

export default composer;
