import { Composer } from "grammy";
import { storeMessage } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_message", async (ctx) => {
  const msg = ctx.businessMessage!;
  const businessConnectionId = msg.business_connection_id!;
  const chatId = msg.chat.id;

  storeMessage(businessConnectionId, chatId, msg);
});

export default composer;
