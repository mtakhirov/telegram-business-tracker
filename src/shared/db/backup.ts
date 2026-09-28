/**
 * Point-in-time snapshots of the database.
 *
 * `VACUUM INTO` writes a consistent, already-compacted copy while the bot keeps
 * running, so a snapshot never needs the process stopped and never captures a
 * half-written WAL. It refuses to overwrite, so names carry milliseconds and a
 * manual run alongside the scheduled one cannot collide. The oldest snapshots
 * are pruned so the directory cannot grow without limit.
 *
 * A snapshot sitting next to the database survives corruption and mistakes, not
 * the loss of the disk — copy `BACKUP_DIR` off the machine for that.
 *
 * @example
 * ```ts
 * createBackup();   // data/backups/messages-20260928-151900.db
 * pruneBackups(7);  // keep the newest seven
 * ```
 */

import fs from "node:fs";
import path from "node:path";
import { BACKUP_DIR } from "../config/index.js";
import { log } from "../lib/logger.js";
import { rawDb } from "./client.js";

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function stamp(date: Date): string {
  const ms = pad(date.getMilliseconds(), 3);
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${ms}`
  );
}

export function createBackup(directory = BACKUP_DIR): string {
  const dir = path.resolve(directory);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  const destination = path.join(dir, `messages-${stamp(new Date())}.db`);
  rawDb.exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
  fs.chmodSync(destination, 0o600);

  return destination;
}

export function pruneBackups(keep: number, directory = BACKUP_DIR): number {
  const dir = path.resolve(directory);
  if (!fs.existsSync(dir)) return 0;

  const snapshots = fs
    .readdirSync(dir)
    .filter((name) => /^messages-\d{8}-\d{6}(?:-\d{3})?\.db$/.test(name))
    .toSorted()
    .toReversed();

  let removed = 0;
  for (const name of snapshots.slice(keep)) {
    fs.rmSync(path.join(dir, name), { force: true });
    removed += 1;
  }
  return removed;
}

export function runBackup(keep: number, directory = BACKUP_DIR): string {
  const file = createBackup(directory);
  const pruned = pruneBackups(keep, directory);
  log.info({ file, pruned }, "database snapshot written");
  return file;
}
