import { Composer } from "grammy";
import { ADMIN_CHAT_ID, OWNER_ID } from "../core/config.js";
import { getUserDisplayName } from "../utils/format.js";
import { eventHeader, metaLine, userLink } from "../utils/notify-format.js";
import { saveConnection, deleteMessagesByConnection } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_connection", async (ctx) => {
  const conn = ctx.businessConnection!;

  // Only the bot owner may connect this bot. Reject anyone else so their
  // private chats are never recorded or forwarded. This one stays explicit:
  // it is a security alert, and the user id makes it actionable.
  if (conn.user.id !== OWNER_ID) {
    await ctx.api.sendMessage(
      ADMIN_CHAT_ID,
      `${eventHeader("🚫", "Ruxsatsiz ulanish urinishi")}\n` +
        `${metaLine(userLink(conn.user, getUserDisplayName(conn.user)), `user ${conn.user.id}`)}\n\n` +
        `Hech narsa saqlanmadi.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  saveConnection({ id: conn.id, userId: conn.user.id, isEnabled: conn.is_enabled });

  if (conn.is_enabled) {
    await ctx.api.sendMessage(ADMIN_CHAT_ID, eventHeader("🔗", "Ulandi"), { parse_mode: "HTML" });
    return;
  }

  // On disconnect, drop everything stored for that connection.
  const removed = deleteMessagesByConnection(conn.id);
  await ctx.api.sendMessage(ADMIN_CHAT_ID, `${eventHeader("🔗", "Uzildi")} — ${removed} yozuv o'chirildi`, {
    parse_mode: "HTML",
  });
});

export default composer;
