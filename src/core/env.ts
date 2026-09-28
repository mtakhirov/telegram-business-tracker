/**
 * Environment schema, validated once at startup.
 *
 * A misconfigured deployment fails immediately with a readable list of what is
 * wrong, rather than throwing on the first update hours later. Only
 * `BOT_TOKEN` and `ADMIN_CHAT_ID` are required; everything else has a default
 * that suits a single-owner install.
 *
 * @example Inspecting the schema interactively
 * ```sh
 * bunx @envin/cli@latest dev -c src/core/env.ts
 * ```
 *
 * @example A missing value
 * ```text
 * Invalid environment variables:
 *    BOT_TOKEN: Invalid input: expected string, received undefined
 * ```
 */

import "dotenv/config";
import { defineEnv } from "envin";
import * as z from "zod";

export default defineEnv({
  server: {
    BOT_TOKEN: z.string().min(1),
    ADMIN_CHAT_ID: z.string().min(1),
    OWNER_ID: z.coerce.number().int().positive().optional(),
    BOT_NAME: z.string().min(1).default("Business Chat Archive"),
    DB_PATH: z.string().min(1).default("data/messages.db"),
    RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
    DEFAULT_TRACK_MODE: z.enum(["allow", "deny"]).default("allow"),
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
