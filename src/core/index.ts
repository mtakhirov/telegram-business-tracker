import { bot } from "./bot.js";
import commands from "../commands/index.js";
import handlers, { ALLOWED_UPDATES } from "../handlers/index.js";
import { cleanupNotificationDetails, cleanupOldMessages, closeStore } from "../store/message-store.js";
import { COMMANDS } from "../commands/list.js";
import { OWNER_ID, RETENTION_DAYS } from "./config.js";

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
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * DAY_MS;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Notification details only back the "Batafsil" button, so they expire well
// before the archive itself does.
const DETAILS_TTL_MS = 7 * DAY_MS;

function runCleanup(): void {
  const removed = cleanupOldMessages(RETENTION_MS);
  if (removed > 0) {
    console.log(`🧹 Eskirgan ${removed} ta xabar o'chirildi`);
  }
  cleanupNotificationDetails(DETAILS_TTL_MS);
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

// Publish the command menu to the owner's chat only, since every command is
// owner-only. A failure here must not stop the bot from starting.
async function publishCommands(): Promise<void> {
  try {
    await bot.api.setMyCommands(
      COMMANDS.map(({ command, description }) => ({ command, description })),
      { scope: { type: "chat", chat_id: OWNER_ID } },
    );
  } catch (error) {
    console.warn("Buyruqlar menyusini o'rnatib bo'lmadi:", error instanceof Error ? error.message : error);
  }
}

void publishCommands();

// Start bot
console.log("🚀 Bot ishga tushmoqda...");
bot.start({ allowed_updates: [...ALLOWED_UPDATES] });
