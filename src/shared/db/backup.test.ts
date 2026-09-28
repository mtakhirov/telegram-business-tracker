/**
 * Tests for database snapshots.
 *
 * A snapshot has to be a database in its own right, not a file copy that
 * happens to exist, so one case opens the result and reads a row back out of
 * it.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-backup-"));
const backupDir = path.join(tmpDir, "backups");
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = "123";
process.env.OWNER_ID = "123";
process.env.DB_PATH = path.join(tmpDir, "backup.db");
process.env.BACKUP_DIR = backupDir;

let backup: typeof import("./backup.js");
let closeDb: () => void;

beforeAll(async () => {
  const repository = await import("../../entities/message/repository.js");
  repository.storeMessage("conn-1", 555, { message_id: 1, date: 1_700_000_000, text: "salom" });

  backup = await import("./backup.js");
  closeDb = (await import("./client.js")).closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const snapshots = () => fs.readdirSync(backupDir).filter((name) => name.endsWith(".db"));

describe("createBackup", () => {
  test("writes a snapshot that is itself a readable database", () => {
    const file = backup.createBackup();

    const copy = new Database(file, { readonly: true });
    const row = copy.query("SELECT text FROM messages LIMIT 1").get() as { text: string };
    copy.close();

    expect(row.text).toBe("salom");
  });

  test("restricts the snapshot to the owner", () => {
    const file = backup.createBackup();
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });

  test("does not collide with a snapshot taken in the same second", () => {
    const before = snapshots().length;
    backup.createBackup();
    backup.createBackup();
    expect(snapshots()).toHaveLength(before + 2);
  });

  test("names snapshots so they sort by time", () => {
    for (const name of snapshots()) {
      expect(name).toMatch(/^messages-\d{8}-\d{6}-\d{3}\.db$/);
    }
  });
});

describe("pruneBackups", () => {
  test("keeps the newest and removes the rest", () => {
    const before = snapshots().length;
    expect(before).toBeGreaterThan(1);

    const removed = backup.pruneBackups(1);

    expect(removed).toBe(before - 1);
    expect(snapshots()).toHaveLength(1);
  });

  test("does nothing when there is less than the limit", () => {
    expect(backup.pruneBackups(10)).toBe(0);
  });

  test("ignores a directory that does not exist", () => {
    expect(backup.pruneBackups(1, path.join(tmpDir, "missing"))).toBe(0);
  });
});
