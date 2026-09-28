/**
 * Fitting HTML notification text into Telegram's size limits.
 *
 * A message caps at 4096 characters and a media caption at 1024, and the Bot
 * API rejects anything longer outright. Content therefore arrives here as a
 * list of self-contained blocks — each with balanced tags — which `packBlocks`
 * greedily packs into as few messages as the limits allow.
 *
 * Splitting happens on escaped text and never inside an HTML entity or tag: a
 * cut through `&amp;` or between `<s>` and `</s>` would make Telegram reject
 * the whole message with a parse error.
 *
 * @example Packing a notification into messages
 * ```ts
 * const blocks = ["🗑 <b>O'chirildi</b> — Ali", ...contentBlocks(longText)];
 * await sendBlocks(api, adminChatId, blocks);
 * ```
 *
 * @example Rendering an edit
 * ```ts
 * diffBlocks("salom qalaysan", "salom, qalaysan?");
 * // ["<s>salom qalaysan</s>\n\nsalom, qalaysan?"]
 * ```
 */

import type { Api } from "grammy";
import { escapeHtml } from "./format.js";

export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_CAPTION_LENGTH = 1024;

export function splitText(text: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut <= 0) cut = rest.lastIndexOf(" ", limit);
    if (cut <= 0) {
      cut = limit;
      const amp = rest.lastIndexOf("&", cut);
      if (amp > 0 && amp > cut - 8 && rest.indexOf(";", amp) >= cut) {
        cut = amp;
      }
    }
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^[\n ]/, "");
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
}

export function contentBlocks(rawContent: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (!rawContent) return [];
  return splitText(escapeHtml(rawContent), limit);
}

function struckBlocks(rawContent: string, limit: number): string[] {
  const wrapperLen = "<s></s>".length;
  const inner = Math.max(1, limit - wrapperLen);
  return splitText(escapeHtml(rawContent), inner).map((piece) => `<s>${piece}</s>`);
}

export function diffBlocks(
  oldContent: string | null,
  newContent: string,
  limit = MAX_MESSAGE_LENGTH,
): string[] {
  if (!oldContent) return contentBlocks(newContent, limit);

  const combined = `<s>${escapeHtml(oldContent)}</s>\n\n${escapeHtml(newContent)}`;
  if (combined.length <= limit) return [combined];

  return [...struckBlocks(oldContent, limit), ...contentBlocks(newContent, limit)];
}

export function packBlocks(blocks: string[], limit = MAX_MESSAGE_LENGTH): string[] {
  const messages: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (!block) continue;
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= limit) {
      current = candidate;
    } else {
      if (current) messages.push(current);
      current = block;
    }
  }
  if (current) messages.push(current);
  return messages;
}

export async function sendBlocks(
  api: Api,
  chatId: number | string,
  blocks: string[],
  limit = MAX_MESSAGE_LENGTH,
): Promise<void> {
  for (const message of packBlocks(blocks, limit)) {
    await api.sendMessage(chatId, message, { parse_mode: "HTML" });
  }
}
