/**
 * Outgoing defaults applied to every Bot API call.
 *
 * Telegram renders a preview card for the first URL in a message unless the
 * call says otherwise. Archived chat content routinely contains links, and a
 * preview would both bury the notification and make Telegram fetch the target,
 * so previews are switched off for every method that can show one. An explicit
 * `link_preview_options` passed by a caller is left untouched.
 *
 * grammY runs transformers in reverse installation order, so the one installed
 * last is the outermost and sees a payload first. Installing this one early
 * keeps it innermost, where it observes whatever the other transformers
 * produced and is the last to touch the payload before it leaves.
 *
 * @example
 * ```ts
 * const bot = new Bot(token);
 * bot.api.config.use(disableLinkPreviews);
 *
 * await bot.api.sendMessage(chatId, "qarang https://example.com");
 * // sent as { link_preview_options: { is_disabled: true }, ... }
 * ```
 */

import type { Transformer } from "grammy";

const PREVIEW_METHODS = new Set(["sendMessage", "editMessageText"]);

export const disableLinkPreviews: Transformer = (prev, method, payload, signal) => {
  if (PREVIEW_METHODS.has(method) && payload && !("link_preview_options" in payload)) {
    return prev(method, { ...payload, link_preview_options: { is_disabled: true } }, signal);
  }
  return prev(method, payload, signal);
};
