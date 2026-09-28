import { Composer } from "grammy";
import { BOT_NAME, OWNER_ID } from "../../core/config.js";
import { escapeHtml } from "../../utils/format.js";

const composer = new Composer();

composer.command("start", async (ctx) => {
  // Private tool: ignore everyone except the owner, and reveal nothing.
  if (ctx.from?.id !== OWNER_ID) return;

  const name = escapeHtml(BOT_NAME);
  const payload = ctx.match;

  // Deep link from a business chat's management button.
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
