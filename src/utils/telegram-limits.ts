import type { Api } from "grammy";
import { escapeHtml } from "./format.js";

// Bot API hard limits.
export const MAX_MESSAGE_LENGTH = 4096;
export const MAX_CAPTION_LENGTH = 1024;

/**
 * Split text into chunks no longer than `limit`, preferring newline then space
 * boundaries. A hard cut is a last resort and never lands inside an HTML entity
 * such as `&amp;`, so escaped text stays valid after splitting.
 */
export function splitText(text: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n", limit);
    if (cut <= 0) cut = rest.lastIndexOf(" ", limit);
    if (cut <= 0) {
      cut = limit;
      // Avoid cutting through an entity like &amp; that straddles the boundary.
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

/**
 * Wrap raw (unescaped) content in one or more `<blockquote>` blocks, each of
 * which renders within `limit` characters.
 */
export function quote(rawContent: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (!rawContent) return [];
  const wrapperLen = "<blockquote></blockquote>".length;
  const inner = Math.max(1, limit - wrapperLen);
  return splitText(escapeHtml(rawContent), inner).map((piece) => `<blockquote>${piece}</blockquote>`);
}

/**
 * Greedily pack self-contained HTML blocks (each with balanced tags) into
 * messages no longer than `limit`, joined by a blank line.
 */
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

/** Pack blocks and send them as one or more HTML messages. */
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
