/**
 * The "ℹ️ Batafsil" button on a notification.
 *
 * Pressing it swaps the stored expanded rendering into the message and turns
 * the button into "▲ Yashirish"; pressing that restores the compact one. A
 * media notification carries its text in a caption, so it is edited with
 * `editMessageCaption` rather than `editMessageText`.
 *
 * Details expire on their own schedule, so an old button answers with a notice
 * instead of failing silently.
 */

import { Composer, GrammyError } from "grammy";
import { OWNER_ID } from "../core/config.js";
import { getNotificationDetails } from "../store/message-store.js";
import { TOGGLE_PATTERN, collapseKeyboard, expandKeyboard } from "../utils/notify.js";

const composer = new Composer();

composer.callbackQuery(TOGGLE_PATTERN, async (ctx) => {
  if (ctx.from.id !== OWNER_ID) {
    await ctx.answerCallbackQuery();
    return;
  }

  const [, mode, token] = ctx.match as RegExpMatchArray;
  const details = getNotificationDetails(token!);
  if (!details) {
    await ctx.answerCallbackQuery({ text: "Ma'lumot eskirgan", show_alert: true });
    return;
  }

  const expand = mode === "x";
  const text = expand ? details.expanded : details.compact;
  const reply_markup = expand ? collapseKeyboard(token!) : expandKeyboard(token!);

  try {
    const message = ctx.callbackQuery.message;
    if (message && "caption" in message) {
      await ctx.editMessageCaption({ caption: text, parse_mode: "HTML", reply_markup });
    } else {
      await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup });
    }
  } catch (error) {
    const unchanged = error instanceof GrammyError && error.description.includes("message is not modified");
    if (!unchanged) throw error;
  }

  await ctx.answerCallbackQuery();
});

export default composer;
