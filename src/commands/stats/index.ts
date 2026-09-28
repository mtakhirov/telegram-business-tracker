import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";
import { OWNER_ID } from "../../core/config.js";

const composer = new Composer();

// Captured once when the module loads at startup — the real bot start time.
const STARTED_AT = new Date();

composer.command("stats", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  await ctx.reply(
    `📊 <b>Bot statistikasi</b>\n\n` +
      `💾 Xotiradagi xabarlar: <b>${getStoreSize()}</b>\n` +
      `⏱ Bot ishga tushgan vaqt: <b>${STARTED_AT.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}</b>`,
    { parse_mode: "HTML" },
  );
});

export default composer;
