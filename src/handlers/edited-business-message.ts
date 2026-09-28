import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getMessage, storeMessage, isOwnerConnection, isChatTracked } from "../store/message-store.js";
import { getUserDisplayName, formatExactSeconds, getMediaInfo } from "../utils/format.js";
import { chatSubject, eventHeader, metaLine, userLink, withNote } from "../utils/notify-format.js";
import { sendNotification } from "../utils/notify.js";
import { diffBlocks } from "../utils/telegram-limits.js";

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
  const sender =
    editedMsg.from && editedMsg.from.id !== chatId
      ? userLink(editedMsg.from, getUserDisplayName(editedMsg.from))
      : null;
  const media = getMediaInfo(editedMsg);

  const header = eventHeader("✏️", "Tahrirlandi", chatSubject(chat));
  const meta = metaLine(
    `Chat ${chatId}`,
    `msg ${messageId}`,
    sender,
    formatExactSeconds(editedMsg.edit_date!),
    media?.word,
  );

  const oldContent = original ? original.text || original.caption || null : null;
  const newContent = editedMsg.text || editedMsg.caption || "";

  let body = diffBlocks(oldContent, newContent);
  if (!original) body = withNote(body, "asl nusxa arxivda yo'q");

  await sendNotification(ctx.api, ADMIN_CHAT_ID, {
    sourceChatId: chatId,
    media,
    compact: [header, ...body],
    expanded: [`${header}\n${meta}`, ...body, `/history ${chatId}\n/versions ${chatId} ${messageId}`],
  });
});

export default composer;
