import "dotenv/config";
import { defineEnv } from "envin";
import * as z from "zod";

/**
 * Raw environment schema. Validated once at startup so a misconfigured
 * deployment fails immediately instead of at the first update.
 *
 * Live preview: `bunx @envin/cli@latest dev -c src/core/env.ts`
 */
export default defineEnv({
  server: {
    /** Bot token from @BotFather. */
    BOT_TOKEN: z.string().min(1),
    /** Chat that receives notifications: your user ID, or a group/channel ID. */
    ADMIN_CHAT_ID: z.string().min(1),
    /**
     * Telegram user ID of the only account allowed to connect this bot.
     * Defaults to ADMIN_CHAT_ID when that is your own user ID.
     */
    OWNER_ID: z.coerce.number().int().positive().optional(),
    /** Display name used in the bot's own messages. */
    BOT_NAME: z.string().min(1).default("Business Chat Archive"),
    /** Days to keep stored messages before automatic cleanup. */
    RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
  },
  env: process.env,
  onError: (issues) => {
    console.error("❌ Invalid environment variables:");
    for (const issue of issues) {
      const key = issue.path?.join(".") || "(root)";
      console.error(`   ${key}: ${issue.message}`);
    }
    console.error("\nSee .env.example for the expected values.");
    process.exit(1);
  },
});
