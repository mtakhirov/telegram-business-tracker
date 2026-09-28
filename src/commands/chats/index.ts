/**
 * Deciding which chats are archived.
 *
 * A chat with no rule falls back to `DEFAULT_TRACK_MODE`, so `deny` makes the
 * archive opt-in. `/untrack` only stops future archiving; `/forget` is the one
 * that erases what was already stored, and it cannot be undone.
 *
 * A positive chat id is a private chat and doubles as the user id, which is
 * what the profile links are built from. The chats table stores no username,
 * so those links always take the id form.
 *
 * @example
 * ```text
 * /chats                 list every known chat and its rule
 * /track 555             archive this chat
 * /untrack 555           stop archiving it
 * /untrack_reset 555     drop the rule, fall back to the default
 * /forget 555            delete what was stored for it
 * ```
 */

import { Composer, type CommandContext, type Context } from "grammy";
import { DEFAULT_TRACK_MODE, OWNER_ID } from "../../core/config.js";
import { clearChatRule, deleteMessagesByChat, listChats, setChatRule } from "../../store/message-store.js";
import { escapeHtml } from "../../utils/format.js";
import { metaLine, userLink } from "../../utils/notify-format.js";
import { sendBlocks } from "../../utils/telegram-limits.js";

const composer = new Composer();

const MODE_WORD = { allow: "arxivlanadi", deny: "arxivlanmaydi" } as const;

function parseChatId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function usage(ctx: CommandContext<Context>, command: string): Promise<void> {
  await ctx.reply(`Ishlatilishi: /${command} &lt;chat_id&gt;`, { parse_mode: "HTML" });
}

composer.command("chats", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chats = listChats();
  const blocks: string[] = [`<b>Chatlar</b> — ${chats.length} ta, default: ${MODE_WORD[DEFAULT_TRACK_MODE]}`];

  if (chats.length === 0) {
    blocks.push(`<i>Hali hech qanday chat ko'rilmagan.</i>`);
  } else {
    blocks.push(
      chats
        .map((chat) => {
          const effective = chat.mode ?? DEFAULT_TRACK_MODE;
          const icon = effective === "allow" ? "✓" : "✗";
          const label = chat.title ?? `Chat ${chat.chatId}`;
          const name = chat.chatId > 0 ? userLink({ id: chat.chatId }, label) : escapeHtml(label);
          const rule = chat.mode ? " (qoida)" : "";
          return `${metaLine(`${icon} ${name}`, `${chat.chatId}`)}${rule}`;
        })
        .join("\n"),
    );
  }

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

composer.command("track", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) return usage(ctx, "track");

  setChatRule(chatId, "allow");
  await ctx.reply(`✓ ${chatId} arxivlanadi`);
});

composer.command("untrack", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) return usage(ctx, "untrack");

  setChatRule(chatId, "deny");
  await ctx.reply(`✗ ${chatId} arxivlanmaydi — o'chirish: /forget ${chatId}`);
});

composer.command("untrack_reset", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) return usage(ctx, "untrack_reset");

  clearChatRule(chatId);
  await ctx.reply(`↩️ ${chatId} default qoidaga qaytdi (${MODE_WORD[DEFAULT_TRACK_MODE]})`);
});

composer.command("forget", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const chatId = parseChatId(ctx.match);
  if (chatId === null) return usage(ctx, "forget");

  const removed = deleteMessagesByChat(chatId);
  await ctx.reply(`🧹 ${chatId} — ${removed} yozuv o'chirildi (qaytarilmaydi)`);
});

export default composer;
