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

// oxlint-disable-next-line import/no-unassigned-import
import "dotenv/config";
import { defineEnv } from "envin";
import * as z from "zod";
import { log } from "../lib/logger.js";

export default defineEnv({
  server: {
    BOT_TOKEN: z.string().min(1),
    ADMIN_CHAT_ID: z.string().min(1),
    OWNER_ID: z.coerce.number().int().positive().optional(),
    BOT_NAME: z.string().min(1).default("Business Chat Archive"),
    DB_PATH: z.string().min(1).default("data/messages.db"),
    RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
    DEFAULT_TRACK_MODE: z.enum(["allow", "deny"]).default("allow"),
    HEALTH_PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    BACKUP_DIR: z.string().min(1).default("data/backups"),
    BACKUP_INTERVAL_HOURS: z.coerce.number().int().min(0).default(24),
    BACKUP_KEEP: z.coerce.number().int().min(1).default(7),
  },
  env: process.env,
  onError: (issues) => {
    const problems = issues.map((issue) => ({
      key: issue.path?.join(".") || "(root)",
      message: issue.message,
    }));
    log.fatal({ problems }, "invalid environment variables, see .env.example");
    process.exit(1);
  },
});
