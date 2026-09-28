import env from "./env.js";

export const BOT_TOKEN = env.BOT_TOKEN;
export const ADMIN_CHAT_ID = env.ADMIN_CHAT_ID;
export const BOT_NAME = env.BOT_NAME;
export const RETENTION_DAYS = env.RETENTION_DAYS;
export const DEFAULT_TRACK_MODE = env.DEFAULT_TRACK_MODE;

// The only account allowed to connect this bot via Telegram Business.
// Falls back to ADMIN_CHAT_ID when that is a private chat (private chat ID == user ID).
export const OWNER_ID = env.OWNER_ID ?? Number(ADMIN_CHAT_ID);
if (!Number.isSafeInteger(OWNER_ID) || OWNER_ID <= 0) {
  throw new Error("OWNER_ID is required when ADMIN_CHAT_ID is a group or channel");
}
