import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The store opens its database at import time, so the environment must be set
// before the dynamic import below.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-test-"));
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = "123";
process.env.OWNER_ID = "123";
process.env.DEFAULT_TRACK_MODE = "allow";
process.env.DB_PATH = path.join(tmpDir, "test.db");

type Store = typeof import("./message-store.js");
let store: Store;

beforeAll(async () => {
  store = await import("./message-store.js");
});

afterAll(() => {
  store.closeStore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const CONN = "conn-1";
const CHAT = 555;

describe("messages", () => {
  test("stores and reads a message back", () => {
    store.storeMessage(CONN, CHAT, { message_id: 1, date: 1700000001, text: "salom" });
    expect(store.getMessage(CONN, CHAT, 1)?.text).toBe("salom");
  });

  test("returns undefined for an unknown message", () => {
    expect(store.getMessage(CONN, CHAT, 999)).toBeUndefined();
  });

  test("deletes a message and its versions", () => {
    store.storeMessage(CONN, CHAT, { message_id: 2, date: 1700000002, text: "o'chadi" });
    store.deleteMessage(CONN, CHAT, 2);
    expect(store.getMessage(CONN, CHAT, 2)).toBeUndefined();
    expect(store.getVersions(CONN, CHAT, 2)).toEqual([]);
  });
});

describe("edit history", () => {
  test("appends a version per content change", () => {
    store.storeMessage(CONN, CHAT, { message_id: 10, date: 1700000010, text: "v1" });
    store.storeMessage(CONN, CHAT, { message_id: 10, date: 1700000010, edit_date: 1700000011, text: "v2" });
    store.storeMessage(CONN, CHAT, { message_id: 10, date: 1700000010, edit_date: 1700000012, text: "v3" });

    expect(store.getVersions(CONN, CHAT, 10).map((v) => v.text)).toEqual(["v1", "v2", "v3"]);
  });

  test("skips a repeat with identical content", () => {
    store.storeMessage(CONN, CHAT, { message_id: 11, date: 1700000020, text: "same" });
    store.storeMessage(CONN, CHAT, { message_id: 11, date: 1700000020, text: "same" });
    expect(store.getVersions(CONN, CHAT, 11)).toHaveLength(1);
  });

  test("keeps only the newest state in the message row", () => {
    expect(store.getMessage(CONN, CHAT, 10)?.text).toBe("v3");
  });
});

describe("chat rules", () => {
  test("uses DEFAULT_TRACK_MODE when no rule exists", () => {
    expect(store.isChatTracked(4242)).toBe(true);
  });

  test("honours an explicit deny then allow", () => {
    store.setChatRule(4242, "deny");
    expect(store.isChatTracked(4242)).toBe(false);
    store.setChatRule(4242, "allow");
    expect(store.isChatTracked(4242)).toBe(true);
  });

  test("falls back to the default after the rule is cleared", () => {
    store.setChatRule(4242, "deny");
    store.clearChatRule(4242);
    expect(store.isChatTracked(4242)).toBe(true);
  });

  test("lists known chats with the latest title", () => {
    store.touchChat(777, "Bob");
    store.touchChat(777, "Bob Renamed");
    const entry = store.listChats().find((chat) => chat.chatId === 777);
    expect(entry?.title).toBe("Bob Renamed");
  });
});

describe("search", () => {
  test("matches text and captions", () => {
    store.storeMessage(CONN, CHAT, { message_id: 20, date: 1700000030, text: "kitob o'qidim" });
    store.storeMessage(CONN, CHAT, { message_id: 21, date: 1700000031, caption: "kitob rasmi" });
    expect(store.searchMessages("kitob", 10).map((m) => m.messageId).sort()).toEqual([20, 21]);
  });

  test("treats LIKE wildcards literally", () => {
    store.storeMessage(CONN, CHAT, { message_id: 22, date: 1700000032, text: "100% aniq" });
    store.storeMessage(CONN, CHAT, { message_id: 23, date: 1700000033, text: "snake_case" });

    expect(store.searchMessages("%", 50).map((m) => m.messageId)).toEqual([22]);
    expect(store.searchMessages("_", 50).map((m) => m.messageId)).toEqual([23]);
  });

  test("respects the limit", () => {
    expect(store.searchMessages("kitob", 1)).toHaveLength(1);
  });
});

describe("owner connection", () => {
  test("resolves the enabled connection for the owner", () => {
    store.saveConnection({ id: CONN, userId: 123, isEnabled: true });
    expect(store.getOwnerConnectionId()).toBe(CONN);
    expect(store.isOwnerConnection(CONN)).toBe(true);
  });

  test("rejects a connection owned by someone else", () => {
    store.saveConnection({ id: "conn-other", userId: 999, isEnabled: true });
    expect(store.isOwnerConnection("conn-other")).toBe(false);
  });

  test("rejects a disabled owner connection", () => {
    store.saveConnection({ id: "conn-off", userId: 123, isEnabled: false });
    expect(store.isOwnerConnection("conn-off")).toBe(false);
  });
});

describe("retention", () => {
  test("removes rows older than the window", async () => {
    store.storeMessage(CONN, 888, { message_id: 30, date: 1700000040, text: "eski" });
    await Bun.sleep(5);

    // A 1 ms window makes the row above older than the cutoff.
    expect(store.cleanupOldMessages(1)).toBeGreaterThan(0);
    expect(store.getMessage(CONN, 888, 30)).toBeUndefined();
  });

  test("keeps rows inside the window", () => {
    store.storeMessage(CONN, 888, { message_id: 31, date: 1700000041, text: "yangi" });
    store.cleanupOldMessages(60_000);
    expect(store.getMessage(CONN, 888, 31)?.text).toBe("yangi");
  });

  test("drops the edit chain along with the message", async () => {
    store.storeMessage(CONN, 888, { message_id: 32, date: 1700000042, text: "v1" });
    store.storeMessage(CONN, 888, { message_id: 32, date: 1700000042, edit_date: 1700000043, text: "v2" });
    await Bun.sleep(5);

    store.cleanupOldMessages(1);
    expect(store.getVersions(CONN, 888, 32)).toEqual([]);
  });
});

describe("export", () => {
  test("attaches the edit chain to each message", () => {
    store.storeMessage(CONN, 1010, { message_id: 40, date: 1700000050, text: "a" });
    store.storeMessage(CONN, 1010, { message_id: 40, date: 1700000050, edit_date: 1700000051, text: "b" });

    const exported = store.exportMessages(1010);
    expect(exported).toHaveLength(1);
    expect(exported[0]?.versions.map((v) => v.text)).toEqual(["a", "b"]);
  });

  test("scopes the export to one chat", () => {
    expect(store.exportMessages(1010).every((m) => m.chatId === 1010)).toBe(true);
  });
});
