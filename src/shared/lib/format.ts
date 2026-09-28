/**
 * Rendering primitives shared by every notification and command reply.
 *
 * Three concerns live here: naming a person, naming a moment, and naming a
 * message's media. Timestamps are always resolved in Asia/Tashkent, which has
 * no DST, so comparing calendar days by shifting 24 hours is exact. Media is
 * described by a plain lowercase word rather than an emoji, and any file name
 * or title it embeds is HTML-escaped at the source.
 *
 * @example Naming a moment
 * ```ts
 * formatWhen(sentToday);      // "14:32"
 * formatWhen(sentYesterday);  // "kecha 14:32"
 * formatWhen(sentLastMonth);  // "20.09 14:32"
 * formatExact(sentLastMonth); // "20.09.2026 14:32:11"
 * ```
 *
 * @example Naming media
 * ```ts
 * getMediaInfo({ photo: [{ file_id: "A" }, { file_id: "B" }] });
 * // { type: "photo", fileId: "B", word: "rasm" }
 *
 * getMediaInfo({ document: { file_id: "D", file_name: "hisobot.pdf" } });
 * // { type: "document", fileId: "D", word: "fayl: hisobot.pdf" }
 * ```
 */

import type { User } from "grammy/types";

export function getUserDisplayName(user?: User): string {
  if (!user) return "Noma'lum";
  const parts = [user.first_name];
  if (user.last_name) parts.push(user.last_name);
  const name = parts.join(" ");
  return user.username ? `${name} (@${user.username})` : name;
}

const TIME_ZONE = "Asia/Tashkent";
const DAY_MS = 24 * 60 * 60 * 1000;

const zoneFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function sameDay(a: Record<string, string>, b: Record<string, string>): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function zoneParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of zoneFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

export function formatWhen(date: Date, now: Date = new Date()): string {
  const target = zoneParts(date);
  const today = zoneParts(now);
  const time = `${target.hour}:${target.minute}`;

  if (sameDay(target, today)) return time;
  if (sameDay(target, zoneParts(new Date(now.getTime() - DAY_MS)))) return `kecha ${time}`;
  if (target.year === today.year) return `${target.day}.${target.month} ${time}`;
  return `${target.day}.${target.month}.${target.year!.slice(-2)} ${time}`;
}

export function formatWhenSeconds(timestamp: number, now?: Date): string {
  return formatWhen(new Date(timestamp * 1000), now);
}

const exactFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatExact(date: Date): string {
  const p = zoneParts(date);
  const seconds = exactFormatter.formatToParts(date).find((part) => part.type === "second")!.value;
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${seconds}`;
}

export function formatExactSeconds(timestamp: number): string {
  return formatExact(new Date(timestamp * 1000));
}

export function escapeHtml(text: string): string {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface ContentMessage {
  text?: string | null;
  caption?: string | null;
  photo?: unknown[] | null;
  video?: unknown | null;
  document?: { file_name?: string } | null;
  sticker?: { emoji?: string } | null;
  voice?: unknown | null;
  audio?: { title?: string } | null;
  animation?: unknown | null;
}

export type MediaType = "photo" | "video" | "document" | "voice" | "audio" | "animation" | "sticker";

export interface MediaInfo {
  type: MediaType;
  fileId: string;
  word: string;
}

function mediaWord(kind: string, detail?: string): string {
  const trimmed = detail?.trim();
  return trimmed ? `${kind}: ${escapeHtml(trimmed)}` : kind;
}

export function getMediaInfo(msg: ContentMessage): MediaInfo | null {
  if (msg.animation && (msg.animation as { file_id?: string }).file_id) {
    return { type: "animation", fileId: (msg.animation as { file_id: string }).file_id, word: "GIF" };
  }
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1] as { file_id: string };
    return { type: "photo", fileId: largest.file_id, word: "rasm" };
  }
  if (msg.video && (msg.video as { file_id?: string }).file_id) {
    return { type: "video", fileId: (msg.video as { file_id: string }).file_id, word: "video" };
  }
  if (msg.document && (msg.document as { file_id?: string }).file_id) {
    return {
      type: "document",
      fileId: (msg.document as { file_id: string }).file_id,
      word: mediaWord("fayl", msg.document.file_name),
    };
  }
  if (msg.voice && (msg.voice as { file_id?: string }).file_id) {
    return { type: "voice", fileId: (msg.voice as { file_id: string }).file_id, word: "ovozli xabar" };
  }
  if (msg.audio && (msg.audio as { file_id?: string }).file_id) {
    return {
      type: "audio",
      fileId: (msg.audio as { file_id: string }).file_id,
      word: mediaWord("audio", msg.audio.title),
    };
  }
  if (msg.sticker && (msg.sticker as { file_id?: string }).file_id) {
    return {
      type: "sticker",
      fileId: (msg.sticker as { file_id: string }).file_id,
      word: mediaWord("sticker", msg.sticker.emoji),
    };
  }
  return null;
}
