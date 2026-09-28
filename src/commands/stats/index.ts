/**
 * The `/stats` reply: archive size, start time and retention window.
 *
 * The start time is captured when the module is first loaded, which happens
 * during startup, so it reports when the bot actually came up.
 */

import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";
import { OWNER_ID, RETENTION_DAYS } from "../../core/config.js";
import { formatWhen } from "../../utils/format.js";

const composer = new Composer();

const STARTED_AT = new Date();

composer.command("stats", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  await ctx.reply(
    `<b>Statistika</b>\n\n` +
      `Xabarlar: ${getStoreSize()}\n` +
      `Ishga tushdi: ${formatWhen(STARTED_AT)}\n` +
      `Retention: ${RETENTION_DAYS} kun`,
    { parse_mode: "HTML" },
  );
});

export default composer;
