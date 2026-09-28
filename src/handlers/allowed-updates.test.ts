import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Importing the handler barrel reaches config and the store.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-updates-"));
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = "123";
process.env.OWNER_ID = "123";
process.env.DB_PATH = path.join(tmpDir, "updates.db");

const handlersDir = path.dirname(new URL(import.meta.url).pathname);

let allowed: readonly string[];
let closeStore: () => void;

beforeAll(async () => {
  allowed = (await import("./index.js")).ALLOWED_UPDATES;
  closeStore = (await import("../store/message-store.js")).closeStore;
});

afterAll(() => {
  closeStore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Update types the handler files actually subscribe to. Telegram only delivers
 * what `allowed_updates` names, so a handler for a type left out never runs and
 * fails silently — exactly how the expand button shipped broken.
 */
function registeredUpdateTypes(): string[] {
  const types = new Set<string>();

  for (const file of fs.readdirSync(handlersDir)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts") || file === "index.ts") continue;
    const source = fs.readFileSync(path.join(handlersDir, file), "utf8");

    for (const match of source.matchAll(/composer\.on\(\s*"([a-z_]+)(?::[a-z_:]+)?"/g)) {
      types.add(match[1]!);
    }
    if (/composer\.callbackQuery\(/.test(source)) types.add("callback_query");
  }

  return [...types];
}

describe("ALLOWED_UPDATES", () => {
  test("covers every update type the handlers subscribe to", () => {
    const missing = registeredUpdateTypes().filter((type) => !allowed.includes(type));
    expect(missing).toEqual([]);
  });

  test("includes message so the command handlers receive updates", () => {
    expect(allowed).toContain("message");
  });

  test("includes callback_query so the expand button works", () => {
    expect(allowed).toContain("callback_query");
  });

  test("finds the handler subscriptions it is meant to check", () => {
    // Guards the scan itself: if the regex stops matching, the test above
    // would pass vacuously.
    expect(registeredUpdateTypes()).toContain("deleted_business_messages");
    expect(registeredUpdateTypes()).toContain("callback_query");
  });

  test("lists no duplicates", () => {
    expect([...new Set(allowed)]).toHaveLength(allowed.length);
  });
});
