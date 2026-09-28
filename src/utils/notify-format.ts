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
 * `🗑 <b>O'chirildi</b> — Ali Valiev`.
 *
 * `subjectHtml` must already be HTML-safe — pass `escapeHtml(name)` or the
 * result of `userLink`.
 */
export function eventHeader(emoji: string, event: string, subjectHtml?: string | null): string {
  const head = `${emoji} <b>${event}</b>`;
  return subjectHtml ? `${head} — ${subjectHtml}` : head;
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

/**
 * Links a person's name to their Telegram profile.
 *
 * A `t.me` link always resolves, so it wins when a username exists. The
 * `tg://user?id=` fallback is only guaranteed to open for users who have
 * contacted the bot, which chat counterparties generally have not — the id is
 * therefore still printed as text in the expanded view.
 */
export function userLink(user: LinkableUser | undefined, text: string): string {
  const safeText = escapeHtml(text);
  if (!user) return safeText;

  const href =
    user.username && USERNAME_PATTERN.test(user.username)
      ? `https://t.me/${user.username}`
      : `tg://user?id=${user.id}`;

  return `<a href="${href}">${safeText}</a>`;
}

/**
 * Header subject for a chat: a profile link for a private chat, whose id is the
 * counterparty's user id, and plain escaped text for a group or channel.
 */
export function chatSubject(chat: LinkableChat): string {
  const label = chatLabel(chat);
  if (chat.title) return escapeHtml(label);
  return userLink({ id: chat.id, username: chat.username }, label);
}
