import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";
import { OWNER_ID, RETENTION_DAYS } from "../../core/config.js";
import { formatWhen } from "../../utils/format.js";

const composer = new Composer();

// Captured once when the module loads at startup — the real bot start time.
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
