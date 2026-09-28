import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in .env file`);
  }
  return value;
}

function parseInteger(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} must be an integer, got "${value}"`);
  }
  return parsed;
}

export const BOT_TOKEN = requireEnv("BOT_TOKEN");
export const ADMIN_CHAT_ID = requireEnv("ADMIN_CHAT_ID");

// Telegram user ID of the only account allowed to connect this bot via Telegram Business.
// Falls back to ADMIN_CHAT_ID when that is a private chat (private chat ID == user ID).
const ownerRaw = process.env.OWNER_ID || ADMIN_CHAT_ID;
export const OWNER_ID = parseInteger("OWNER_ID", ownerRaw);
if (OWNER_ID <= 0) {
  throw new Error("OWNER_ID is required when ADMIN_CHAT_ID is a group or channel");
}

// How long stored messages are kept before automatic cleanup.
export const RETENTION_DAYS = parseInteger("RETENTION_DAYS", process.env.RETENTION_DAYS || "30");
if (RETENTION_DAYS < 1) {
  throw new Error("RETENTION_DAYS must be at least 1");
}
