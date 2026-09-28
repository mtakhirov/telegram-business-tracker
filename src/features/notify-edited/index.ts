/**
 * Notifying about edits, and keeping the version chain honest.
 *
 * The new version is stored before the notification goes out. If the send
 * fails, the archive still holds the correct latest text, so the next edit is
 * compared against the right version instead of a stale one.
 */

import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../../shared/config/index.js";
import { isChatTracked } from "../../entities/chat/repository.js";
import { isOwnerConnection } from "../../entities/connection/repository.js";
import { getMessage, storeMessage } from "../../entities/message/repository.js";
import { getUserDisplayName, formatExactSeconds, getMediaInfo } from "../../shared/lib/format.js";
import {
  chatSubject,
  eventHeader,
  metaLine,
  userLink,
  withNote,
} from "../../shared/telegram/notify-format.js";
import { sendNotification } from "../../entities/notification/send.js";
import { diffBlocks } from "../../shared/telegram/limits.js";

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

  storeMessage(businessConnectionId, chatId, editedMsg);

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
