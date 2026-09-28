import { Composer } from "grammy";
import { storeMessage, isOwnerConnection, isChatTracked, touchChat } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage!;
  const businessConnectionId = msg.business_connection_id!;
  const chatId = msg.chat.id;

  // Ignore messages from any connection that is not the owner's active one.
  if (!isOwnerConnection(businessConnectionId)) return;

  // Remember the chat so /chats can offer it, even when it is not archived.
  touchChat(chatId, msg.chat.first_name || msg.chat.title || null);

  if (!isChatTracked(chatId)) return;

  storeMessage(businessConnectionId, chatId, msg);
});

export default composer;
