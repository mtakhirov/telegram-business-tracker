/**
 * Writes one database snapshot and prunes old ones, then exits.
 *
 * The bot also snapshots on its own schedule; this entry point exists for a
 * manual run or a cron job on a host that would rather drive backups itself.
 *
 * @example
 * ```sh
 * bun run db:backup
 * BACKUP_DIR=/mnt/backups BACKUP_KEEP=30 bun run db:backup
 * ```
 */

import { BACKUP_KEEP } from "../src/shared/config/index.js";
import { closeDb } from "../src/shared/db/client.js";
import { runBackup } from "../src/shared/db/backup.js";

runBackup(BACKUP_KEEP);
closeDb();
