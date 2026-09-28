/**
 * The `/start` reply, including the business-chat deep link.
 *
 * Telegram opens the bot with a `bizChat<id>` payload from a business chat's
 * management button; that variant answers with the chat's id and the commands
 * that act on it. Anyone who is not the owner gets no reply at all, so the bot
 * gives nothing away.
 */

import { Composer } from "grammy";
import { BOT_NAME, OWNER_ID } from "../../shared/config/index.js";
import { escapeHtml } from "../../shared/lib/format.js";

const composer = new Composer();

composer.command("start", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const name = escapeHtml(BOT_NAME);
  const payload = ctx.match;

  if (payload && payload.startsWith("bizChat")) {
    const chatId = escapeHtml(payload.slice(7));
    await ctx.reply(
      `<b>${name}</b>\nChat ${chatId}\n\n` +
        `/track ${chatId} — arxivlash\n` +
        `/history ${chatId} — xabarlar`,
      { parse_mode: "HTML" },
    );
    return;
  }

  await ctx.reply(
    `<b>${name}</b>\n\n` +
      `Telegram Business chatlaringizdagi tahrirlangan va o'chirilgan xabarlarni arxivlaydi.\n\n` +
      `Ulash: Settings → Telegram Business → Chatbots\n` +
      `/help — buyruqlar`,
    { parse_mode: "HTML" },
  );
});

export default composer;
