import { Composer } from "grammy";
import { OWNER_ID } from "../../core/config.js";
import { listChatMessages, searchMessages, type StoredMessage } from "../../store/message-store.js";
import { formatDate, getContentDescription, getUserDisplayName, escapeHtml } from "../../utils/format.js";
import { quote, sendBlocks } from "../../utils/telegram-limits.js";

const composer = new Composer();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SNIPPET_LENGTH = 300;

/** One result block: where it came from, when, and a trimmed excerpt. */
function resultBlock(message: StoredMessage): string[] {
  const user = getUserDisplayName(message.from);
  const raw = message.text || message.caption || getContentDescription(message);
  const snippet = raw.length > SNIPPET_LENGTH ? `${raw.slice(0, SNIPPET_LENGTH)}…` : raw;

  return [
    `💬 <code>${message.chatId}</code> · 🆔 <code>${message.messageId}</code>\n` +
      `👤 ${escapeHtml(user)} · 📅 ${formatDate(message.date)}`,
    ...quote(snippet),
  ];
}

composer.command("search", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const query = ctx.match.trim();
  if (query.length < 2) {
    await ctx.reply(
      "Ishlatilishi: <code>/search &lt;so'z&gt;</code>\n\nKamida 2 belgi kiriting.",
      { parse_mode: "HTML" },
    );
    return;
  }

  const results = searchMessages(query, DEFAULT_LIMIT);
  if (results.length === 0) {
    await ctx.reply(`🔍 <b>${escapeHtml(query)}</b> bo'yicha natija yo'q.`, { parse_mode: "HTML" });
    return;
  }

  const blocks = [`🔍 <b>${escapeHtml(query)}</b> — ${results.length} natija`];
  for (const message of results) blocks.push(...resultBlock(message));

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

composer.command("history", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const parts = ctx.match.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || !/^-?\d+$/.test(parts[0]!)) {
    await ctx.reply(
      "Ishlatilishi: <code>/history &lt;chat_id&gt; [limit]</code>\n\n" +
        "Chat ID'ni <code>/chats</code> dan oling.",
      { parse_mode: "HTML" },
    );
    return;
  }

  const chatId = Number(parts[0]);
  const requested = parts[1] ? Number(parts[1]) : DEFAULT_LIMIT;
  const limit = Number.isSafeInteger(requested) ? Math.min(Math.max(requested, 1), MAX_LIMIT) : DEFAULT_LIMIT;

  const messages = listChatMessages(chatId, limit);
  if (messages.length === 0) {
    await ctx.reply(`<code>${chatId}</code> uchun saqlangan xabar yo'q.`, { parse_mode: "HTML" });
    return;
  }

  const blocks = [`📜 <b>Chat <code>${chatId}</code></b> — oxirgi ${messages.length} xabar`];
  for (const message of messages) blocks.push(...resultBlock(message));

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

export default composer;
