import { bot } from "./bot.js";
import commands from "../commands/index.js";
import handlers from "../handlers/index.js";
import { cleanupOldMessages, closeStore } from "../store/message-store.js";
import { RETENTION_DAYS } from "./config.js";

// Register commands and handlers via Composer
bot.use(commands);
bot.use(handlers);

// Error handler. Log only the update id and the error itself — never the whole
// context, which would leak other people's private message text into the logs.
bot.catch((err) => {
  const updateId = err.ctx?.update?.update_id ?? "?";
  const cause = err.error instanceof Error ? err.error.message : String(err.error);
  console.error(`Bot xatosi (update ${updateId}):`, cause);
});

// Time-based retention cleanup: drop messages older than RETENTION_DAYS, on
// start and hourly thereafter. Runs regardless of how many messages arrive.
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function runCleanup(): void {
  const removed = cleanupOldMessages(RETENTION_MS);
  if (removed > 0) {
    console.log(`🧹 Eskirgan ${removed} ta xabar o'chirildi`);
  }
}

runCleanup();
const cleanupTimer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);

// Graceful shutdown: stop polling and close the database so updates are not
// reprocessed on restart and no writes are lost mid-flush.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} qabul qilindi, to'xtatilmoqda...`);
  clearInterval(cleanupTimer);
  await bot.stop();
  closeStore();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

// Start bot
console.log("🚀 Bot ishga tushmoqda...");
bot.start({
  allowed_updates: [
    "message",
    "business_connection",
    "business_message",
    "edited_business_message",
    "deleted_business_messages",
  ],
});
