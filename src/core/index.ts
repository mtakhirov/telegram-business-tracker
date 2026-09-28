import { bot } from "./bot.js";
import commands from "../commands/index.js";
import handlers from "../handlers/index.js";

// Register commands and handlers via Composer
bot.use(commands);
bot.use(handlers);

// Error handler
bot.catch((err) => {
  console.error("Bot xatosi:", err);
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
