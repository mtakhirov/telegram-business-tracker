/**
 * Sending a notification that can be expanded in place.
 *
 * Every notification is rendered twice: a compact form that shows only the
 * event, the subject and the content, and an expanded form that adds the meta
 * line and the follow-up commands. The compact form goes out with an
 * "ℹ️ Batafsil" button, and both renderings are stored so pressing it can swap
 * one for the other later.
 *
 * The toggle rewrites a single message, so the button is only attached when
 * both renderings fit one message. Anything longer is sent expanded from the
 * start, where the meta line is a small part of the whole anyway.
 *
 * @example
 * ```ts
 * await sendNotification(api, adminChatId, {
 *   sourceChatId: chat.id,
 *   compact: [header, ...contentBlocks(text)],
 *   expanded: [`${header}\n${meta}`, ...contentBlocks(text), `/history ${chat.id}`],
 * });
 * ```
 */

import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import type { MediaInfo } from "../../shared/lib/format.js";
import { saveNotificationDetails } from "../archive.js";
import { sendMedia, sendMediaWithBlocks } from "../../shared/telegram/send-media.js";
import {
  MAX_CAPTION_LENGTH,
  MAX_MESSAGE_LENGTH,
  packBlocks,
  sendBlocks,
} from "../../shared/telegram/limits.js";

export const EXPAND_PREFIX = "nd:x:";
export const COLLAPSE_PREFIX = "nd:o:";

export const TOGGLE_PATTERN = /^nd:(x|o):([0-9a-f]{16})$/;

function toggleKeyboard(prefix: string, token: string, label: string): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: label, callback_data: `${prefix}${token}` }]] };
}

export const expandKeyboard = (token: string): InlineKeyboardMarkup =>
  toggleKeyboard(EXPAND_PREFIX, token, "ℹ️ Batafsil");

export const collapseKeyboard = (token: string): InlineKeyboardMarkup =>
  toggleKeyboard(COLLAPSE_PREFIX, token, "▲ Yashirish");

export interface NotificationOptions {
  sourceChatId: number;
  compact: string[];
  expanded: string[];
  media?: MediaInfo | null;
}

export async function sendNotification(
  api: Api,
  target: number | string,
  options: NotificationOptions,
): Promise<void> {
  const limit = options.media ? MAX_CAPTION_LENGTH : MAX_MESSAGE_LENGTH;
  const compact = packBlocks(options.compact, limit);
  const expanded = packBlocks(options.expanded, limit);

  if (compact.length === 1 && expanded.length === 1) {
    const token = saveNotificationDetails(options.sourceChatId, {
      compact: compact[0]!,
      expanded: expanded[0]!,
    });
    const markup = expandKeyboard(token);

    if (options.media) {
      await sendMedia(api, target, options.media, compact[0]!, markup);
    } else {
      await api.sendMessage(target, compact[0]!, { parse_mode: "HTML", reply_markup: markup });
    }
    return;
  }

  if (options.media) {
    await sendMediaWithBlocks(api, target, options.media, options.expanded[0]!, options.expanded.slice(1));
  } else {
    await sendBlocks(api, target, options.expanded);
  }
}
