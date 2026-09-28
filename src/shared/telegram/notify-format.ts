/**
 * Building the header and meta line of a notification.
 *
 * A notification leads with one event emoji, the event in bold and the subject
 * it happened to. Everything else — chat id, message id, sender, timestamp,
 * media word — is joined into a single middle-dot meta line, and empty fields
 * simply drop out.
 *
 * Names link to a Telegram profile. A `t.me/<username>` link always resolves,
 * so it wins whenever a username exists; the `tg://user?id=` fallback only
 * opens for users who have contacted the bot, which chat counterparties
 * generally have not, so the numeric id is still printed as text.
 *
 * Subjects passed to `eventHeader` must already be HTML-safe: pass
 * `escapeHtml(name)` or the output of `userLink`.
 *
 * @example
 * ```ts
 * eventHeader("🗑", "O'chirildi", chatSubject(chat));
 * // 🗑 <b>O'chirildi</b> — <a href="https://t.me/alivaliev">Ali Valiev</a>
 *
 * metaLine(`Chat ${chat.id}`, `msg ${messageId}`, null, "14:32", "rasm");
 * // Chat 555 · msg 1042 · 14:32 · rasm
 * ```
 */

import { escapeHtml } from "../lib/format.js";

export function metaLine(...parts: (string | number | null | undefined | false)[]): string {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== false && part !== "")
    .join(" · ");
}

export function eventHeader(emoji: string, event: string, subjectHtml?: string | null): string {
  const head = `${emoji} <b>${event}</b>`;
  return subjectHtml ? `${head} — ${subjectHtml}` : head;
}

export function withMeta(meta: string, blocks: string[]): string[] {
  if (blocks.length === 0) return [meta];
  return [`${meta}\n${blocks[0]}`, ...blocks.slice(1)];
}

export function withNote(blocks: string[], note: string): string[] {
  if (blocks.length === 0) return [note];
  const last = blocks.length - 1;
  return [...blocks.slice(0, last), `${blocks[last]}\n${note}`];
}

export function chatLabel(chat: { id: number; title?: string; first_name?: string }): string {
  return chat.title || chat.first_name || `Chat ${chat.id}`;
}

export interface LinkableChat {
  id: number;
  title?: string;
  first_name?: string;
  username?: string;
}

export interface LinkableUser {
  id: number;
  username?: string;
}

const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,32}$/;

export function userLink(user: LinkableUser | undefined, text: string): string {
  const safeText = escapeHtml(text);
  if (!user) return safeText;

  const href =
    user.username && USERNAME_PATTERN.test(user.username)
      ? `https://t.me/${user.username}`
      : `tg://user?id=${user.id}`;

  return `<a href="${href}">${safeText}</a>`;
}

export function chatSubject(chat: LinkableChat): string {
  const label = chatLabel(chat);
  if (chat.title) return escapeHtml(label);
  return userLink({ id: chat.id, username: chat.username }, label);
}
