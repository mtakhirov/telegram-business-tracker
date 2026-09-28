import { Composer } from "grammy";
import { ADMIN_CHAT_ID, OWNER_ID } from "../core/config.js";
import { getUserDisplayName, escapeHtml } from "../utils/format.js";
import { saveConnection, deleteMessagesByConnection } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_connection", async (ctx) => {
  const conn = ctx.businessConnection!;

  // Only the bot owner may connect this bot. Reject anyone else so their
  // private chats are never recorded or forwarded.
  if (conn.user.id !== OWNER_ID) {
    await ctx.api.sendMessage(
      ADMIN_CHAT_ID,
      `🚫 <b>Ruxsatsiz ulanish urinishi</b>\n\n` +
        `👤 Foydalanuvchi: ${escapeHtml(getUserDisplayName(conn.user))}\n` +
        `🆔 User ID: <code>${conn.user.id}</code>\n\n` +
        `Bu foydalanuvchi ega emas. Hech narsa saqlanmadi.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  saveConnection({ id: conn.id, userId: conn.user.id, isEnabled: conn.is_enabled });

  // When the owner disconnects the bot, drop everything stored for that connection.
  let removedNote = "";
  if (!conn.is_enabled) {
    const removed = deleteMessagesByConnection(conn.id);
    removedNote = `\n🧹 O'chirilgan yozuvlar: ${removed}`;
  }

  const status = conn.is_enabled ? "✅ Ulandi" : "❌ Uzildi";
  const text =
    `🔗 <b>Business Connection</b>\n\n` +
    `👤 Foydalanuvchi: ${escapeHtml(getUserDisplayName(conn.user))}\n` +
    `📌 Status: ${status}\n` +
    `🆔 Connection ID: <code>${conn.id}</code>\n` +
    `💬 User Chat ID: <code>${conn.user_chat_id}</code>` +
    removedNote;

  await ctx.api.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "HTML" });
});

export default composer;
