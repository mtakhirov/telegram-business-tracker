import { escapeHtml } from "./format.js";

/**
 * Joins meta fields with a middle dot, dropping the empty ones, e.g.
 * `Chat 555 · msg 1042 · 14:32 · rasm`.
 */
export function metaLine(...parts: (string | number | null | undefined | false)[]): string {
  return parts.filter((part) => part !== null && part !== undefined && part !== false && part !== "").join(" · ");
}

/**
 * One event emoji, the event in bold, and the subject it happened to:
 * `🗑 <b>O'chirildi</b> — Ali Valiev`. The subject is escaped.
 */
export function eventHeader(emoji: string, event: string, subject?: string | null): string {
  const head = `${emoji} <b>${event}</b>`;
  return subject ? `${head} — ${escapeHtml(subject)}` : head;
}

/**
 * Attaches a meta line to the first block so the two render on consecutive
 * lines. Blocks are otherwise joined by a blank line when packed.
 */
export function withMeta(meta: string, blocks: string[]): string[] {
  if (blocks.length === 0) return [meta];
  return [`${meta}\n${blocks[0]}`, ...blocks.slice(1)];
}

/** Appends a note to the last block, on its own line. */
export function withNote(blocks: string[], note: string): string[] {
  if (blocks.length === 0) return [note];
  const last = blocks.length - 1;
  return [...blocks.slice(0, last), `${blocks[last]}\n${note}`];
}

/** Chat display name, falling back to the id when the chat has no title. */
export function chatLabel(chat: { id: number; title?: string; first_name?: string }): string {
  return chat.title || chat.first_name || `Chat ${chat.id}`;
}
