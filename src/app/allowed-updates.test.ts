/**
 * Tests that the bot subscribes to, and registers, everything its features expect.
 *
 * Two silent failures are guarded here. Telegram delivers nothing for an update
 * type left out of `allowed_updates`, so a handler for a missing type never
 * runs. And a feature that is never `use`d by the handler barrel is equally
 * dead, which a type-check cannot catch because every feature exports the same
 * `Composer` shape.
 *
 * Both checks read the feature sources, so a case also guards the scan itself:
 * a regex that stops matching cannot make the others pass vacuously.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-updates-"));
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = "123";
process.env.OWNER_ID = "123";
process.env.DB_PATH = path.join(tmpDir, "updates.db");

const appDir = path.dirname(new URL(import.meta.url).pathname);
const featuresDir = path.join(appDir, "..", "features");

let allowed: readonly string[];
let closeDb: () => void;

beforeAll(async () => {
  allowed = (await import("./handlers.js")).ALLOWED_UPDATES;
  closeDb = (await import("../shared/db/client.js")).closeDb;
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

interface FeatureSource {
  slice: string;
  file: string;
  source: string;
}

function featureSources(): FeatureSource[] {
  const found: FeatureSource[] = [];
  for (const slice of fs.readdirSync(featuresDir)) {
    const sliceDir = path.join(featuresDir, slice);
    if (!fs.statSync(sliceDir).isDirectory()) continue;
    for (const file of fs.readdirSync(sliceDir)) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      found.push({ slice, file, source: fs.readFileSync(path.join(sliceDir, file), "utf8") });
    }
  }
  return found;
}

function updateHandlerFeatures(): FeatureSource[] {
  return featureSources().filter(
    (entry) => /composer\.on\(/.test(entry.source) || /composer\.callbackQuery\(/.test(entry.source),
  );
}

function registeredUpdateTypes(): string[] {
  const types = new Set<string>();
  for (const { source } of updateHandlerFeatures()) {
    for (const match of source.matchAll(/composer\.on\(\s*"([a-z_]+)(?::[a-z_:]+)?"/g)) {
      types.add(match[1]!);
    }
    if (/composer\.callbackQuery\(/.test(source)) types.add("callback_query");
  }
  return [...types];
}

describe("ALLOWED_UPDATES", () => {
  test("covers every update type the features subscribe to", () => {
    const missing = registeredUpdateTypes().filter((type) => !allowed.includes(type));
    expect(missing).toEqual([]);
  });

  test("includes message so the command features receive updates", () => {
    expect(allowed).toContain("message");
  });

  test("includes callback_query so the expand button works", () => {
    expect(allowed).toContain("callback_query");
  });

  test("finds the subscriptions it is meant to check", () => {
    expect(registeredUpdateTypes()).toContain("deleted_business_messages");
    expect(registeredUpdateTypes()).toContain("edited_business_message");
    expect(registeredUpdateTypes()).toContain("callback_query");
  });

  test("lists no duplicates", () => {
    expect([...new Set(allowed)]).toHaveLength(allowed.length);
  });
});

describe("handler registration", () => {
  test("imports every feature that handles an update", () => {
    const barrel = fs.readFileSync(path.join(appDir, "handlers.ts"), "utf8");
    const unregistered = updateHandlerFeatures()
      .map((entry) => `${entry.slice}/${entry.file.replace(/\.ts$/, ".js")}`)
      .filter((specifier) => !barrel.includes(specifier));

    expect(unregistered).toEqual([]);
  });

  test("uses every composer it imports", () => {
    const barrel = fs.readFileSync(path.join(appDir, "handlers.ts"), "utf8");
    const imported = [...barrel.matchAll(/^import (\w+) from "\.\.\/features\//gm)].map((m) => m[1]!);

    expect(imported.length).toBeGreaterThan(0);
    for (const name of imported) {
      expect(barrel).toContain(`composer.use(${name})`);
    }
  });
});
