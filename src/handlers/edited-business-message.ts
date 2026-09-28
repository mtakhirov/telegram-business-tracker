import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, storeMessage, isOwnerConnection, isChatTracked } from "../store/message-store.js";
import { getUserDisplayName, formatWhenSeconds, getMediaInfo } from "../utils/format.js";
import { chatLabel, eventHeader, metaLine, withNote } from "../utils/notify-format.js";
import { sendMediaWithBlocks } from "../utils/send-media.js";
import { quoteDiff, sendBlocks } from "../utils/telegram-limits.js";

const composer = new Composer();

composer.on("edited_business_message", async (ctx) => {
  const editedMsg = ctx.update.edited_business_message!;
  const businessConnectionId = editedMsg.business_connection_id!;
  const chat = editedMsg.chat;
  const chatId = chat.id;
  const messageId = editedMsg.message_id;

  if (!isOwnerConnection(businessConnectionId)) return;
  if (!isChatTracked(chatId)) return;

  const original = getMessage(businessConnectionId, chatId, messageId);

  // Store the new version now, before notifying. If the send fails, the next
  // edit still compares against the correct previous version.
  storeMessage(businessConnectionId, chatId, editedMsg);

  // A sender id different from the chat id means the owner edited their own message.
  const sender = editedMsg.from && editedMsg.from.id !== chatId ? getUserDisplayName(editedMsg.from) : null;
  const media = getMediaInfo(editedMsg);

  const header =
    `${eventHeader("✏️", "Tahrirlandi", chatLabel(chat))}\n` +
    metaLine(`Chat ${chatId}`, `msg ${messageId}`, sender, formatWhenSeconds(editedMsg.edit_date!), media?.word);

  const oldContent = original ? original.text || original.caption || null : null;
  const newContent = editedMsg.text || editedMsg.caption || "";

  let blocks = quoteDiff(oldContent, newContent);
  if (!original) blocks = withNote(blocks, "asl nusxa arxivda yo'q");

  if (media) {
    await sendMediaWithBlocks(ctx.api, ADMIN_CHAT_ID, media, header, blocks);
  } else {
    await sendBlocks(ctx.api, ADMIN_CHAT_ID, [header, ...blocks]);
  }
});

export default composer;
