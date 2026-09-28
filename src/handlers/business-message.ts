/**
 * Archiving incoming business messages.
 *
 * Every chat the bot sees is recorded as metadata so `/chats` can offer it,
 * but content is only stored when the chat is actually archived, which is
 * decided by its rule or by `DEFAULT_TRACK_MODE`.
 */

import { Composer } from "grammy";
import { storeMessage, isOwnerConnection, isChatTracked, touchChat } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage!;
  const businessConnectionId = msg.business_connection_id!;
  const chatId = msg.chat.id;

  if (!isOwnerConnection(businessConnectionId)) return;

  touchChat(chatId, msg.chat.first_name || msg.chat.title || null);

  if (!isChatTracked(chatId)) return;

  storeMessage(businessConnectionId, chatId, msg);
});

export default composer;
