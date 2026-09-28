import { Composer } from "grammy";
import { storeMessage, isOwnerConnection } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage!;
  const businessConnectionId = msg.business_connection_id!;
  const chatId = msg.chat.id;

  // Ignore messages from any connection that is not the owner's active one.
  if (!isOwnerConnection(businessConnectionId)) return;

  storeMessage(businessConnectionId, chatId, msg);
});

export default composer;
