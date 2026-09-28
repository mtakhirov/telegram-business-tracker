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
 * Escapes raw content and splits it into blocks that each render within
 * `limit`. Returns nothing for empty content.
 */
export function contentBlocks(rawContent: string, limit = MAX_MESSAGE_LENGTH): string[] {
  if (!rawContent) return [];
  return splitText(escapeHtml(rawContent), limit);
}

/** Wraps content in `<s>…</s>` blocks that each render within `limit`. */
function struckBlocks(rawContent: string, limit: number): string[] {
  const wrapperLen = "<s></s>".length;
  const inner = Math.max(1, limit - wrapperLen);
  return splitText(escapeHtml(rawContent), inner).map((piece) => `<s>${piece}</s>`);
}

/**
 * Renders an edit as struck-through old content above the new content. Both fit
 * one block when short; otherwise each side gets its own blocks, so a `<s>` tag
 * is never split across messages.
 */
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
