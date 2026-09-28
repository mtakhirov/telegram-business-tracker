import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";
import { BOT_NAME, OWNER_ID } from "../../core/config.js";
import { escapeHtml } from "../../utils/format.js";

const composer = new Composer();

// Captured once when the module loads at startup — the real bot start time.
const STARTED_AT = new Date();

composer.command("stats", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  await ctx.reply(
    `📊 <b>${escapeHtml(BOT_NAME)} — statistika</b>\n\n` +
      `💾 Xotiradagi xabarlar: <b>${getStoreSize()}</b>\n` +
      `⏱ Bot ishga tushgan vaqt: <b>${STARTED_AT.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}</b>`,
    { parse_mode: "HTML" },
  );
});

export default composer;
