/**
 * Effective configuration, derived once from the validated environment.
 *
 * `OWNER_ID` is the security boundary: only that account may connect the bot
 * over Telegram Business, and only it may run commands. It falls back to
 * `ADMIN_CHAT_ID`, which is correct when notifications go to the owner's own
 * chat, because a private chat id equals the user id. Pointing
 * `ADMIN_CHAT_ID` at a group makes that fallback meaningless, so the module
 * refuses to load without an explicit `OWNER_ID`.
 *
 * @example
 * ```ts
 * import { OWNER_ID, RETENTION_DAYS } from "./config.js";
 *
 * if (ctx.from?.id !== OWNER_ID) return;
 * ```
 */

import env from "./env.js";

export const BOT_TOKEN = env.BOT_TOKEN;
export const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID;
export const BOT_NAME = env.BOT_NAME;
export const DB_PATH = env.DB_PATH;
export const RETENTION_DAYS = env.RETENTION_DAYS;
export const DEFAULT_TRACK_MODE = env.DEFAULT_TRACK_MODE;
export const HEALTH_PORT = env.HEALTH_PORT;

export const OWNER_ID = env.OWNER_ID ?? Number(ADMIN_CHAT_ID);
if (!Number.isSafeInteger(OWNER_ID) || OWNER_ID <= 0) {
  throw new Error("OWNER_ID is required when ADMIN_CHAT_ID is a group or channel");
}
