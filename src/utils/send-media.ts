import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import type { MediaInfo } from "./format.js";
import { MAX_CAPTION_LENGTH, packBlocks, sendBlocks } from "./telegram-limits.js";

/**
 * Send media with a `header` (short HTML, must fit a caption) plus optional
 * body blocks. When header + body fit the caption limit they go together;
 * otherwise the media carries the header alone and the body follows as separate
 * text messages so nothing is dropped.
 */
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
      // Sticker doesn't support caption, send sticker + text separately
      await api.sendSticker(chatId, media.fileId);
      await api.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: replyMarkup });
      break;
  }
}
