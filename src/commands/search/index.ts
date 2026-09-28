import { Composer } from "grammy";
import { OWNER_ID } from "../../core/config.js";
import { listChatMessages, searchMessages, type StoredMessage } from "../../store/message-store.js";
import { escapeHtml, formatWhenSeconds, getMediaInfo, getUserDisplayName } from "../../utils/format.js";
import { metaLine, withMeta } from "../../utils/notify-format.js";
import { contentBlocks, sendBlocks } from "../../utils/telegram-limits.js";

const composer = new Composer();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SNIPPET_LENGTH = 300;

/** Meta line plus a trimmed excerpt, rendered on consecutive lines. */
function resultBlocks(message: StoredMessage, options: { showChat: boolean }): string[] {
  const media = getMediaInfo(message);
  const raw = message.text || message.caption || "";
  const snippet = raw.length > SNIPPET_LENGTH ? `${raw.slice(0, SNIPPET_LENGTH)}…` : raw;

  // In a private chat the chat id equals the counterparty's user id, so a
  // different sender id means the message was the owner's own.
  const sender =
    message.from && message.from.id !== message.chatId ? getUserDisplayName(message.from) : null;

  const meta = metaLine(
    options.showChat ? `Chat ${message.chatId}` : null,
    `msg ${message.messageId}`,
    sender,
    formatWhenSeconds(message.date),
    media?.word,
  );

  return withMeta(meta, contentBlocks(snippet));
}

composer.command("search", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const query = ctx.match.trim();
  if (query.length < 2) {
    await ctx.reply("Ishlatilishi: /search &lt;so'z&gt; — kamida 2 belgi", { parse_mode: "HTML" });
    return;
  }

  const results = searchMessages(query, DEFAULT_LIMIT);
  if (results.length === 0) {
    await ctx.reply(`Qidiruv: ${escapeHtml(query)} — natija yo'q`, { parse_mode: "HTML" });
    return;
  }

  const blocks = [`<b>Qidiruv:</b> ${escapeHtml(query)} — ${results.length} natija`];
  for (const message of results) blocks.push(...resultBlocks(message, { showChat: true }));

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

composer.command("history", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const parts = ctx.match.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || !/^-?\d+$/.test(parts[0]!)) {
    await ctx.reply("Ishlatilishi: /history &lt;chat_id&gt; [limit]", { parse_mode: "HTML" });
    return;
  }

  const chatId = Number(parts[0]);
  const requested = parts[1] ? Number(parts[1]) : DEFAULT_LIMIT;
  const limit = Number.isSafeInteger(requested) ? Math.min(Math.max(requested, 1), MAX_LIMIT) : DEFAULT_LIMIT;

  const messages = listChatMessages(chatId, limit);
  if (messages.length === 0) {
    await ctx.reply(`Chat ${chatId} — saqlangan xabar yo'q`);
    return;
  }

  const blocks = [`<b>Chat ${chatId}</b> — oxirgi ${messages.length} xabar`];
  for (const message of messages) blocks.push(...resultBlocks(message, { showChat: false }));

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

export default composer;
