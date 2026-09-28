import { Composer } from "grammy";
import { DEFAULT_TRACK_MODE, OWNER_ID } from "../../core/config.js";
import { clearChatRule, deleteMessagesByChat, listChats, setChatRule } from "../../store/message-store.js";
import { escapeHtml, formatDateTime } from "../../utils/format.js";
import { sendBlocks } from "../../utils/telegram-limits.js";

const composer = new Composer();

/** Parses a chat ID argument, which may be negative for groups. */
function parseChatId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

composer.command("chats", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chats = listChats();
  const defaultLabel = DEFAULT_TRACK_MODE === "allow" ? "✅ arxivlanadi" : "⛔️ arxivlanmaydi";

  const blocks: string[] = [
    `📋 <b>Ma'lum chatlar</b>\n\n` +
      `Qoidasi yo'q chat uchun default: ${defaultLabel}\n` +
      `Jami: ${chats.length}`,
  ];

  if (chats.length === 0) {
    blocks.push(`<i>Hali hech qanday chat ko'rilmagan.</i>`);
  }

  for (const chat of chats) {
    const effective = chat.mode ?? DEFAULT_TRACK_MODE;
    const icon = effective === "allow" ? "✅" : "⛔️";
    const source = chat.mode ? "qoida" : "default";
    const name = chat.title ? escapeHtml(chat.title) : `Chat ${chat.chatId}`;
    blocks.push(
      `${icon} <b>${name}</b>\n` +
        `🆔 <code>${chat.chatId}</code> (${source})\n` +
        `👁 Oxirgi: ${formatDateTime(chat.lastSeen)}`,
    );
  }

  blocks.push(
    `<b>Buyruqlar:</b>\n` +
      `/track &lt;chat_id&gt; — arxivlash\n` +
      `/untrack &lt;chat_id&gt; — arxivlamaslik\n` +
      `/forget &lt;chat_id&gt; — saqlangan xabarlarni o'chirish`,
  );

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

composer.command("track", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) {
    await ctx.reply("Ishlatilishi: <code>/track &lt;chat_id&gt;</code>", { parse_mode: "HTML" });
    return;
  }

  setChatRule(chatId, "allow");
  await ctx.reply(`✅ <code>${chatId}</code> endi arxivlanadi.`, { parse_mode: "HTML" });
});

composer.command("untrack", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) {
    await ctx.reply("Ishlatilishi: <code>/untrack &lt;chat_id&gt;</code>", { parse_mode: "HTML" });
    return;
  }

  setChatRule(chatId, "deny");
  await ctx.reply(
    `⛔️ <code>${chatId}</code> endi arxivlanmaydi.\n\n` +
      `Avval saqlangan xabarlar joyida qoladi. O'chirish: <code>/forget ${chatId}</code>`,
    { parse_mode: "HTML" },
  );
});

composer.command("forget", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) {
    await ctx.reply("Ishlatilishi: <code>/forget &lt;chat_id&gt;</code>", { parse_mode: "HTML" });
    return;
  }

  const removed = deleteMessagesByChat(chatId);
  await ctx.reply(
    `🧹 <code>${chatId}</code> uchun ${removed} ta yozuv o'chirildi. Bu amal qaytarilmaydi.`,
    { parse_mode: "HTML" },
  );
});

composer.command("untrack_reset", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) {
    await ctx.reply("Ishlatilishi: <code>/untrack_reset &lt;chat_id&gt;</code>", { parse_mode: "HTML" });
    return;
  }

  clearChatRule(chatId);
  const defaultLabel = DEFAULT_TRACK_MODE === "allow" ? "arxivlanadi" : "arxivlanmaydi";
  await ctx.reply(
    `↩️ <code>${chatId}</code> qoidasi olib tashlandi, default qo'llanadi (${defaultLabel}).`,
    { parse_mode: "HTML" },
  );
});

export default composer;
