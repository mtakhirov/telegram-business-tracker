/**
 * The shared bot instance and its outgoing API behaviour.
 *
 * Three transformers wrap every call: link previews are suppressed, 429
 * responses are retried honouring `retry_after`, and calls are throttled so a
 * burst — deleting a chat full of media at once — cannot trip Telegram's rate
 * limits.
 *
 * @example
 * ```ts
 * import { bot } from "./bot.js";
 *
 * bot.use(handlers);
 * bot.start({ allowed_updates: [...ALLOWED_UPDATES] });
 * ```
 */

import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { BOT_TOKEN } from "../shared/config/index.js";
import { disableLinkPreviews } from "../shared/telegram/api-defaults.js";

export const bot = new Bot(BOT_TOKEN);

bot.api.config.use(disableLinkPreviews);
bot.api.config.use(autoRetry());
bot.api.config.use(apiThrottler());
