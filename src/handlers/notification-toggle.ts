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
    // A double tap re-sends the state the message is already in.
    const unchanged = error instanceof GrammyError && error.description.includes("message is not modified");
    if (!unchanged) throw error;
  }

  await ctx.answerCallbackQuery();
});

export default composer;
