/**
 * The application logger.
 *
 * Output is structured JSON, which is what a VPS log collector and `docker
 * logs` both want; set `LOG_PRETTY=1` for human-readable lines while
 * developing. The level comes from `LOG_LEVEL` and defaults to `info`.
 *
 * This module reads `process.env` directly rather than the validated config, so
 * that configuration errors can be logged without the two modules depending on
 * each other.
 *
 * @example
 * ```ts
 * log.info({ removed }, "retention sweep");
 * log.error({ updateId, err: cause }, "update failed");
 * ```
 */

import { pino } from "pino";

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  ...(process.env.LOG_PRETTY === "1"
    ? { transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } }
    : {}),
});
