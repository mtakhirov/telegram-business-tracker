import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { BOT_TOKEN } from "./config.js";

export const bot = new Bot(BOT_TOKEN);

// Retry on 429 (respecting retry_after) and throttle outgoing calls so bursts —
// e.g. deleting many media at once — do not trip Telegram rate limits.
bot.api.config.use(autoRetry());
bot.api.config.use(apiThrottler());
