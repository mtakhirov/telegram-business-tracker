import type { Api } from "grammy";
import type { MediaInfo } from "./format.js";

export async function sendMedia(
  api: Api,
  chatId: number | string,
  media: MediaInfo,
  caption: string,
): Promise<void> {
  const opts = { caption, parse_mode: "HTML" as const };

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
      await api.sendMessage(chatId, caption, { parse_mode: "HTML" });
      break;
  }
}
