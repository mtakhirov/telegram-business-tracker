import { Composer } from "grammy";
import { ADMIN_CHAT_ID } from "../core/config.js";
import { getUserDisplayName, escapeHtml } from "../utils/format.js";

const composer = new Composer();

composer.on("business_connection", async (ctx) => {
  const conn = ctx.businessConnection!;
  const user = getUserDisplayName(conn.user);
  const status = conn.is_enabled ? "✅ Ulandi" : "❌ Uzildi";

  const text =
    `🔗 <b>Business Connection</b>\n\n` +
    `👤 Foydalanuvchi: ${escapeHtml(user)}\n` +
    `📌 Status: ${status}\n` +
    `🆔 Connection ID: <code>${conn.id}</code>\n` +
    `💬 User Chat ID: <code>${conn.user_chat_id}</code>`;

  await ctx.api.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "HTML" });
});

export default composer;
