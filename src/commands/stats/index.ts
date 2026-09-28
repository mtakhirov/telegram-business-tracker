import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";

const composer = new Composer();

composer.command("stats", async (ctx) => {
  await ctx.reply(
    `📊 <b>Bot statistikasi</b>\n\n` +
      `💾 Xotiradagi xabarlar: <b>${getStoreSize()}</b>\n` +
      `⏱ Bot ishga tushgan vaqt: <b>${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}</b>`,
    { parse_mode: "HTML" },
  );
});

export default composer;
