import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import type { MediaInfo } from "./format.js";
import { saveNotificationDetails } from "../store/message-store.js";
import { sendMedia, sendMediaWithBlocks } from "./send-media.js";
import { MAX_CAPTION_LENGTH, MAX_MESSAGE_LENGTH, packBlocks, sendBlocks } from "./telegram-limits.js";

export const EXPAND_PREFIX = "nd:x:";
export const COLLAPSE_PREFIX = "nd:o:";

/** Matches both callback payloads; group 1 is the mode, group 2 the token. */
export const TOGGLE_PATTERN = /^nd:(x|o):([0-9a-f]{16})$/;

function toggleKeyboard(prefix: string, token: string, label: string): InlineKeyboardMarkup {
  return { inline_keyboard: [[{ text: label, callback_data: `${prefix}${token}` }]] };
}

export const expandKeyboard = (token: string): InlineKeyboardMarkup =>
  toggleKeyboard(EXPAND_PREFIX, token, "ℹ️ Batafsil");

export const collapseKeyboard = (token: string): InlineKeyboardMarkup =>
  toggleKeyboard(COLLAPSE_PREFIX, token, "▲ Yashirish");

export interface NotificationOptions {
  /** The chat the notification is about, so /forget can purge its details. */
  sourceChatId: number;
  /** Headline and content, with the meta line hidden. */
  compact: string[];
  /** The same notification with the meta line and follow-up commands. */
  expanded: string[];
  media?: MediaInfo | null;
}

/**
 * Sends a notification that can be expanded in place.
 *
 * The toggle rewrites one message, so the button is only attached when both
 * renderings fit a single message. A longer notification is sent expanded
 * straight away — its meta line is a small part of it anyway.
 */
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
