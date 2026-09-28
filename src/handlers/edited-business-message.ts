import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, storeMessage, isOwnerConnection } from "../store/message-store.js";
import { getUserDisplayName, formatDate, getContentDescription, getMediaInfo, getMediaLabel, escapeHtml } from "../utils/format.js";
import { sendMedia } from "../utils/send-media.js";

const composer = new Composer();

composer.on("edited_business_message", async (ctx) => {
  const editedMsg = ctx.update.edited_business_message!;
  const businessConnectionId = editedMsg.business_connection_id!;
  const chatId = editedMsg.chat.id;
  const messageId = editedMsg.message_id;

  if (!isOwnerConnection(businessConnectionId)) return;

  const original = getMessage(businessConnectionId, chatId, messageId);

  const user = getUserDisplayName(editedMsg.from);
  const chatName = editedMsg.chat.first_name || editedMsg.chat.title || `Chat ${chatId}`;

  const header =
    `✏️ <b>Xabar tahrirlandi!</b>\n\n` +
    `👤 Kim: ${escapeHtml(user)}\n` +
    `💬 Chat: ${escapeHtml(chatName)}\n` +
    `🆔 Message ID: <code>${messageId}</code>\n` +
    `📅 Asl vaqt: ${formatDate(editedMsg.date)}\n` +
    `📅 Tahrir vaqti: ${formatDate(editedMsg.edit_date!)}`;

  // Check if the new message has media
  const newMedia = getMediaInfo(editedMsg);
  // Check if original had media
  const oldMedia = original ? getMediaInfo(original) : null;

  if (newMedia) {
    // Media message — send media with caption
    const mediaLabel = `[${newMedia.label}]`;
    let caption = `${header}\n\n${mediaLabel}\n━━━━━━━━━━━━━━━━━━━━\n`;

    if (original) {
      const oldContent = original.text || original.caption || "";
      if (oldContent) {
        caption += `<blockquote>${escapeHtml(oldContent)}</blockquote>\n`;
      }
    } else {
      caption += `⚠️ <i>Asl xabar topilmadi</i>\n`;
    }

    const newContent = editedMsg.caption || editedMsg.text || "";
    if (newContent) {
      caption += `<blockquote>${escapeHtml(newContent)}</blockquote>`;
    }

    await sendMedia(ctx.api, ADMIN_CHAT_ID, newMedia, caption);
  } else {
    // Text-only message
    let text = header + "\n\n";

    if (original) {
      const oldContent = original.text || original.caption || "[media]";
      const oldLabel = getMediaLabel(original);
      if (oldLabel) text += `${oldLabel}\n━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📝 <b>Eski matn:</b>\n<blockquote>${escapeHtml(oldContent)}</blockquote>\n\n`;
    } else {
      text += `⚠️ <i>Asl xabar botning xotirasida topilmadi</i>\n\n`;
    }

    const newContent = getContentDescription(editedMsg);
    text += `📝 <b>Yangi matn:</b>\n<blockquote>${escapeHtml(newContent)}</blockquote>`;

    await ctx.api.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "HTML" });
  }

  storeMessage(businessConnectionId, chatId, editedMsg);
});

export default composer;
