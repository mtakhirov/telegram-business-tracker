import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, storeMessage, isOwnerConnection, isChatTracked } from "../store/message-store.js";
import { getUserDisplayName, formatDate, getContentDescription, getMediaInfo, getMediaLabel, escapeHtml } from "../utils/format.js";
import { sendMediaWithBlocks } from "../utils/send-media.js";
import { quote, sendBlocks } from "../utils/telegram-limits.js";

const composer = new Composer();

composer.on("edited_business_message", async (ctx) => {
  const editedMsg = ctx.update.edited_business_message!;
  const businessConnectionId = editedMsg.business_connection_id!;
  const chatId = editedMsg.chat.id;
  const messageId = editedMsg.message_id;

  if (!isOwnerConnection(businessConnectionId)) return;
  if (!isChatTracked(chatId)) return;

  const original = getMessage(businessConnectionId, chatId, messageId);

  // Store the new version now, before notifying. If the send fails, the next
  // edit still compares against the correct previous version.
  storeMessage(businessConnectionId, chatId, editedMsg);

  const user = getUserDisplayName(editedMsg.from);
  const chatName = editedMsg.chat.first_name || editedMsg.chat.title || `Chat ${chatId}`;

  const header =
    `✏️ <b>Xabar tahrirlandi!</b>\n\n` +
    `👤 Kim: ${escapeHtml(user)}\n` +
    `💬 Chat: ${escapeHtml(chatName)}\n` +
    `🆔 Message ID: <code>${messageId}</code>\n` +
    `📅 Asl vaqt: ${formatDate(editedMsg.date)}\n` +
    `📅 Tahrir vaqti: ${formatDate(editedMsg.edit_date!)}`;

  const newMedia = getMediaInfo(editedMsg);

  if (newMedia) {
    const mediaHeader = `${header}\n\n[${newMedia.label}]\n━━━━━━━━━━━━━━━━━━━━`;
    const bodyBlocks: string[] = [];

    if (original) {
      const oldContent = original.text || original.caption || "";
      if (oldContent) bodyBlocks.push(...quote(oldContent));
    } else {
      bodyBlocks.push(`⚠️ <i>Asl xabar topilmadi</i>`);
    }

    const newContent = editedMsg.caption || editedMsg.text || "";
    if (newContent) bodyBlocks.push(...quote(newContent));

    await sendMediaWithBlocks(ctx.api, ADMIN_CHAT_ID, newMedia, mediaHeader, bodyBlocks);
  } else {
    const blocks: string[] = [header];

    if (original) {
      const oldContent = original.text || original.caption || "[media]";
      const oldLabel = getMediaLabel(original);
      const eskiHeader = (oldLabel ? `${oldLabel}\n━━━━━━━━━━━━━━━━━━━━\n` : "") + `📝 <b>Eski matn:</b>`;
      blocks.push(eskiHeader, ...quote(oldContent));
    } else {
      blocks.push(`⚠️ <i>Asl xabar botning xotirasida topilmadi</i>`);
    }

    const newContent = getContentDescription(editedMsg);
    blocks.push(`📝 <b>Yangi matn:</b>`, ...quote(newContent));

    await sendBlocks(ctx.api, ADMIN_CHAT_ID, blocks);
  }
});

export default composer;
