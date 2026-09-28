/**
 * Sending archived media with its notification text.
 *
 * A caption caps at 1024 characters, well below a message's 4096. When the
 * header and body fit that budget they travel with the media; otherwise the
 * media carries the header alone and the body follows as separate messages, so
 * nothing is silently dropped.
 *
 * Stickers are the exception: Telegram accepts no caption on them, so the text
 * always follows as its own message.
 *
 * @example
 * ```ts
 * await sendMediaWithBlocks(api, adminChatId, media, header, contentBlocks(caption));
 * ```
 */

import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import type { MediaInfo } from "../lib/format.js";
import { MAX_CAPTION_LENGTH, packBlocks, sendBlocks } from "./limits.js";

export async function sendMediaWithBlocks(
  api: Api,
  chatId: number | string,
  media: MediaInfo,
  header: string,
  bodyBlocks: string[] = [],
): Promise<void> {
  const combined = packBlocks([header, ...bodyBlocks], MAX_CAPTION_LENGTH);
  if (combined.length <= 1) {
    await sendMedia(api, chatId, media, combined[0] ?? header);
    return;
  }
  await sendMedia(api, chatId, media, header);
  await sendBlocks(api, chatId, bodyBlocks);
}

export async function sendMedia(
  api: Api,
  chatId: number | string,
  media: MediaInfo,
  caption: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<void> {
  const opts = { caption, parse_mode: "HTML" as const, reply_markup: replyMarkup };

  switch (media.type) {
    case "photo":
      await api.sendPhoto(chatId, media.fileId, opts);
      break;
    case "video":
      await api.sendVideo(chatId, media.fileId, opts);
      break;
    case "document":
      await api.sendDocument(chatId, media.fileId, opts);
      break;
    case "voice":
      await api.sendVoice(chatId, media.fileId, opts);
      break;
    case "audio":
      await api.sendAudio(chatId, media.fileId, opts);
      break;
    case "animation":
      await api.sendAnimation(chatId, media.fileId, opts);
      break;
    case "sticker":
      await api.sendSticker(chatId, media.fileId);
      await api.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: replyMarkup });
      break;
  }
}
