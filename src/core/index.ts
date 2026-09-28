import { bot } from "./bot.js";
import commands from "../commands/index.js";
import handlers from "../handlers/index.js";

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
