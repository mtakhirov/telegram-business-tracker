import type { User } from "grammy/types";

export function getUserDisplayName(user?: User): string {
  if (!user) return "Noma'lum";
  const parts = [user.first_name];
  if (user.last_name) parts.push(user.last_name);
  const name = parts.join(" ");
  return user.username ? `${name} (@${user.username})` : name;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Formats a Telegram timestamp, which is in seconds. */
export function formatDate(timestamp: number): string {
  return formatDateTime(new Date(timestamp * 1000));
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

export function getContentDescription(msg: ContentMessage): string {
  if (msg.text) return msg.text;
  if (msg.caption) return `[Media + caption]: ${msg.caption}`;
  if (msg.photo) return "[📷 Rasm]";
  if (msg.video) return "[🎥 Video]";
  if (msg.document) return `[📎 Fayl: ${msg.document.file_name || "nomsiz"}]`;
  if (msg.sticker) return `[😀 Sticker: ${msg.sticker.emoji || ""}]`;
  if (msg.voice) return "[🎤 Ovozli xabar]";
  if (msg.audio) return `[🎵 Audio: ${msg.audio.title || "nomsiz"}]`;
  if (msg.animation) return "[🎞 GIF]";
  return "[📨 Boshqa turdagi xabar]";
}

export type MediaType = "photo" | "video" | "document" | "voice" | "audio" | "animation" | "sticker";

export interface MediaInfo {
  type: MediaType;
  fileId: string;
  label: string;
}

export function getMediaInfo(msg: ContentMessage): MediaInfo | null {
  if (msg.animation && (msg.animation as { file_id?: string }).file_id) {
    return { type: "animation", fileId: (msg.animation as { file_id: string }).file_id, label: "🎞 GIF" };
  }
  if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1] as { file_id: string };
    return { type: "photo", fileId: largest.file_id, label: "📷 Rasm" };
  }
  if (msg.video && (msg.video as { file_id?: string }).file_id) {
    return { type: "video", fileId: (msg.video as { file_id: string }).file_id, label: "🎥 Video" };
  }
  if (msg.document && (msg.document as { file_id?: string }).file_id) {
    return { type: "document", fileId: (msg.document as { file_id: string }).file_id, label: `📎 ${escapeHtml(msg.document.file_name || "Fayl")}` };
  }
  if (msg.voice && (msg.voice as { file_id?: string }).file_id) {
    return { type: "voice", fileId: (msg.voice as { file_id: string }).file_id, label: "🎤 Ovozli xabar" };
  }
  if (msg.audio && (msg.audio as { file_id?: string }).file_id) {
    return { type: "audio", fileId: (msg.audio as { file_id: string }).file_id, label: `🎵 ${escapeHtml(msg.audio.title || "Audio")}` };
  }
  if (msg.sticker && (msg.sticker as { file_id?: string }).file_id) {
    return { type: "sticker", fileId: (msg.sticker as { file_id: string }).file_id, label: `😀 Sticker ${escapeHtml(msg.sticker.emoji || "")}` };
  }
  return null;
}

export function getMediaLabel(msg: ContentMessage): string | null {
  const info = getMediaInfo(msg);
  return info ? `[${info.label}]` : null;
}
