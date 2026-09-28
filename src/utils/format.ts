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

// en-GB keeps the parts numeric and ASCII, whatever the host locale is.
const zoneFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function zoneParts(date: Date): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of zoneFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return parts;
}

/**
 * Short timestamp relative to `now`: time only for today, "kecha HH:MM" for
 * yesterday, "DD.MM HH:MM" within the year, "DD.MM.YY HH:MM" before that.
 *
 * Day boundaries are compared in Asia/Tashkent, which has no DST, so shifting
 * by 24 h to find yesterday is exact.
 */
export function formatWhen(date: Date, now: Date = new Date()): string {
  const target = zoneParts(date);
  const today = zoneParts(now);
  const time = `${target.hour}:${target.minute}`;

  const sameDay = (a: Record<string, string>, b: Record<string, string>) =>
    a.year === b.year && a.month === b.month && a.day === b.day;

  if (sameDay(target, today)) return time;
  if (sameDay(target, zoneParts(new Date(now.getTime() - DAY_MS)))) return `kecha ${time}`;
  if (target.year === today.year) return `${target.day}.${target.month} ${time}`;
  return `${target.day}.${target.month}.${target.year!.slice(-2)} ${time}`;
}

/** `formatWhen` for a Telegram timestamp, which is in seconds. */
export function formatWhenSeconds(timestamp: number, now?: Date): string {
  return formatWhen(new Date(timestamp * 1000), now);
}

export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  /**
   * Plain lowercase type word for a meta line, e.g. "rasm", "fayl: hisobot.pdf".
   * Already HTML-escaped where it embeds a file name or title.
   */
  word: string;
}

/** "fayl" alone, or "fayl: hisobot.pdf" when a name is available. */
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
    return { type: "document", fileId: (msg.document as { file_id: string }).file_id, word: mediaWord("fayl", msg.document.file_name) };
  }
  if (msg.voice && (msg.voice as { file_id?: string }).file_id) {
    return { type: "voice", fileId: (msg.voice as { file_id: string }).file_id, word: "ovozli xabar" };
  }
  if (msg.audio && (msg.audio as { file_id?: string }).file_id) {
    return { type: "audio", fileId: (msg.audio as { file_id: string }).file_id, word: mediaWord("audio", msg.audio.title) };
  }
  if (msg.sticker && (msg.sticker as { file_id?: string }).file_id) {
    return { type: "sticker", fileId: (msg.sticker as { file_id: string }).file_id, word: mediaWord("sticker", msg.sticker.emoji) };
  }
  return null;
}

