import { Composer } from "grammy";
import { getStoreSize } from "../../store/message-store.js";
import { OWNER_ID } from "../../core/config.js";

const composer = new Composer();

composer.command("start", async (ctx) => {
  // Private tool: ignore everyone except the owner, and reveal nothing.
  if (ctx.from?.id !== OWNER_ID) return;

  const payload = ctx.match;

  if (payload && payload.startsWith("bizChat")) {
    const chatId = payload.slice(7);
    await ctx.reply(
      `🤖 <b>Business Chat Tracker</b>\n\n` +
        `Chat <code>#${chatId}</code> boshqarilmoqda.\n\n` +
        `Bu bot business chatdagi barcha xabarlarni kuzatib boradi:\n` +
        `• ✏️ Tahrirlangan xabarlar\n` +
        `• 🗑 O'chirilgan xabarlar\n\n` +
        `Barcha bildirishnomalar admin chatga yuboriladi.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  await ctx.reply(
    `🤖 <b>Business Chat Tracker Bot</b>\n\n` +
      `Bu bot Telegram Business orqali ulangan chatlardagi:\n` +
      `• ✏️ <b>Tahrirlangan</b> xabarlarni\n` +
      `• 🗑 <b>O'chirilgan</b> xabarlarni\n` +
      `kuzatib boradi va sizga xabar beradi.\n\n` +
      `<b>Qanday sozlash kerak:</b>\n` +
      `1. Telegram Premium obunangiz bo'lishi kerak\n` +
      `2. Telegram Settings → Telegram Business → Chatbots\n` +
      `3. Shu botni tanlang va ulab qo'ying\n` +
      `4. Bot avtomatik ravishda barcha business chatlardagi o'zgarishlarni kuzatadi\n\n` +
      `📊 Hozirda xotirada: <b>${getStoreSize()}</b> ta xabar`,
    { parse_mode: "HTML" },
  );
});

export default composer;
