/**
 * Application entry point: wiring, scheduled work and shutdown.
 *
 * Errors are logged as the update id plus the error itself and never the whole
 * context, which would spill other people's message text into the logs.
 * Retention runs on start and hourly after that, independent of traffic, so a
 * quiet bot still forgets on schedule. Notification details carry a shorter
 * limit than the archive because they duplicate content the archive has
 * already purged.
 *
 * @example
 * ```sh
 * bun run dev                  # watch mode, straight from source
 * bun run build && bun start   # compiled
 * ```
 */

import { bot } from "./bot.js";
import commands from "./commands.js";
import handlers, { ALLOWED_UPDATES } from "./handlers.js";
import { cleanupOldMessages } from "../entities/message/repository.js";
import { cleanupNotificationDetails } from "../entities/notification/repository.js";
import { closeDb } from "../shared/db/client.js";
import { COMMANDS } from "../shared/telegram/command-list.js";
import { OWNER_ID, RETENTION_DAYS } from "../shared/config/index.js";

bot.use(commands);
bot.use(handlers);

bot.catch((err) => {
  const updateId = err.ctx?.update?.update_id ?? "?";
  const cause = err.error instanceof Error ? err.error.message : String(err.error);
  console.error(`Bot xatosi (update ${updateId}):`, cause);
});

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * DAY_MS;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

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

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} qabul qilindi, to'xtatilmoqda...`);
  clearInterval(cleanupTimer);
  await bot.stop();
  closeDb();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

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

console.log("🚀 Bot ishga tushmoqda...");
bot.start({ allowed_updates: [...ALLOWED_UPDATES] });
