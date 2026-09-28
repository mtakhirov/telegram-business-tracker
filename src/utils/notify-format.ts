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

/** Chat display name, falling back to the id when the chat has no title. */
export function chatLabel(chat: { id: number; title?: string; first_name?: string }): string {
  return chat.title || chat.first_name || `Chat ${chat.id}`;
}
