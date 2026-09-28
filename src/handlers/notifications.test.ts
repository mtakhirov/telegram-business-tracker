/**
 * Tests for what a notification actually looks like.
 *
 * Handlers run against a real grammY `Context` whose `Api` is intercepted by a
 * transformer, so these assert the exact text and buttons Telegram would
 * receive. Timestamps are taken from the current time so the "today" branch of
 * `formatWhen` is used, and the expected value is built with the same helper —
 * the formatting itself is covered by its own tests.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Api, Context } from "grammy";
import type { InlineKeyboardMarkup, Update, UserFromGetMe } from "grammy/types";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-notify-"));
const ADMIN = 123;
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = String(ADMIN);
process.env.OWNER_ID = String(ADMIN);
process.env.DEFAULT_TRACK_MODE = "allow";
process.env.DB_PATH = path.join(tmpDir, "notify.db");

const CONN = "conn-1";
const CHAT = 555;
const GROUP = -1001234;

let store: typeof import("../store/message-store.js");
let formatExactSeconds: (typeof import("../utils/format.js"))["formatExactSeconds"];
let formatWhenSeconds: (typeof import("../utils/format.js"))["formatWhenSeconds"];
let handlers: Record<
  string,
  { middleware: () => (ctx: Context, next: () => Promise<void>) => Promise<void> }
>;

const me = { id: 1, is_bot: true, first_name: "bot", username: "testbot" } as UserFromGetMe;
const privateChat = { id: CHAT, first_name: "Ali Valiev", username: "alivaliev", type: "private" as const };
const groupChat = { id: GROUP, title: "Sotuv bo'limi", type: "supergroup" as const };
const counterparty = { id: CHAT, is_bot: false, first_name: "Ali Valiev", username: "alivaliev" };
const owner = { id: ADMIN, is_bot: false, first_name: "Men" };

const ALI_LINK = `<a href="https://t.me/alivaliev">Ali Valiev</a>`;
const ALI_SENDER_LINK = `<a href="https://t.me/alivaliev">Ali Valiev (@alivaliev)</a>`;
const OWNER_LINK = `<a href="tg://user?id=${ADMIN}">Men</a>`;

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

async function run(handler: keyof typeof handlers, update: Partial<Update>): Promise<Call[]> {
  const calls: Call[] = [];
  const api = new Api("dummy-token");
  api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true, result: { message_id: 1 } } as never);
  });

  const ctx = new Context({ update_id: 1, ...update } as Update, api, me);
  await handlers[handler]!.middleware()(ctx, async () => {});
  return calls;
}

const body = (call: Call) => (call.payload.text ?? call.payload.caption) as string;

function token(call: Call): string {
  const markup = call.payload.reply_markup as InlineKeyboardMarkup | undefined;
  const button = markup?.inline_keyboard?.[0]?.[0];
  expect(button?.text).toBe("ℹ️ Batafsil");
  const data = (button as { callback_data: string }).callback_data;
  expect(data).toMatch(/^nd:x:[0-9a-f]{16}$/);
  return data.slice("nd:x:".length);
}

const expandedOf = (call: Call) => store.getNotificationDetails(token(call))!.expanded;

beforeAll(async () => {
  store = await import("../store/message-store.js");
  const format = await import("../utils/format.js");
  formatExactSeconds = format.formatExactSeconds;
  formatWhenSeconds = format.formatWhenSeconds;
  handlers = {
    deleted: (await import("./deleted-business-messages.js")).default,
    edited: (await import("./edited-business-message.js")).default,
    connection: (await import("./business-connection.js")).default,
  } as typeof handlers;

  store.saveConnection({ id: CONN, userId: ADMIN, isEnabled: true });
});

afterAll(() => {
  store.closeStore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const recently = () => Math.floor(Date.now() / 1000) - 60;

describe("deleted notifications", () => {
  test("collapses the meta behind the button", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, { message_id: 1042, date, from: counterparty, text: "salom, qalaysan" });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: privateChat, message_ids: [1042] },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("sendMessage");
    expect(calls[0]!.payload.chat_id).toBe(String(ADMIN));
    expect(body(calls[0]!)).toBe(`🗑 <b>O'chirildi</b> — ${ALI_LINK}\n\nsalom, qalaysan`);
  });

  test("expands to meta and follow-up commands", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, { message_id: 1043, date, from: counterparty, text: "yana bir xabar" });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: privateChat, message_ids: [1043] },
    });

    expect(expandedOf(calls[0]!)).toBe(
      `🗑 <b>O'chirildi</b> — ${ALI_LINK}\n` +
        `Chat 555 · msg 1043 · ${formatExactSeconds(date)}\n\n` +
        `yana bir xabar\n\n` +
        `/history 555\n/versions 555 1043`,
    );
  });

  test("drops the row only after a successful send", () => {
    expect(store.getMessage(CONN, CHAT, 1042)).toBeUndefined();
  });

  test("shows only the contents in a collapsed digest", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, { message_id: 2001, date, from: counterparty, text: "ulardan" });
    store.storeMessage(CONN, CHAT, { message_id: 2002, date, from: owner, text: "mendan" });

    const calls = await run("deleted", {
      deleted_business_messages: {
        business_connection_id: CONN,
        chat: privateChat,
        message_ids: [2001, 2002, 2999],
      },
    });

    expect(body(calls[0]!)).toBe(`🗑 <b>3 xabar o'chirildi</b> — ${ALI_LINK}\n\nulardan\n\nmendan`);
    expect(expandedOf(calls[0]!)).toBe(
      `🗑 <b>3 xabar o'chirildi</b> — ${ALI_LINK}\n` +
        `Chat 555\n\n` +
        `msg 2001 · ${formatWhenSeconds(date)}\nulardan\n\n` +
        `msg 2002 · ${OWNER_LINK} · ${formatWhenSeconds(date)}\nmendan\n\n` +
        `msg 2999 · arxivda yo'q\n\n` +
        `/history 555`,
    );
  });

  test("leaves a group title unlinked and always names the sender", async () => {
    const date = recently();
    store.storeMessage(CONN, GROUP, {
      message_id: 3001,
      date,
      from: counterparty,
      text: "narxni keyin aytaman",
    });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: groupChat, message_ids: [3001] },
    });

    expect(body(calls[0]!)).toBe(`🗑 <b>O'chirildi</b> — Sotuv bo'limi\n\nnarxni keyin aytaman`);
    expect(expandedOf(calls[0]!)).toBe(
      `🗑 <b>O'chirildi</b> — Sotuv bo'limi\n` +
        `Chat -1001234 · msg 3001 · ${ALI_SENDER_LINK} · ${formatExactSeconds(date)}\n\n` +
        `narxni keyin aytaman\n\n` +
        `/history -1001234\n/versions -1001234 3001`,
    );
  });

  test("puts the media word in the expanded meta line only", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, {
      message_id: 4001,
      date,
      from: counterparty,
      caption: "rasm izohi",
      photo: [{ file_id: "SMALL" }, { file_id: "LARGE" }],
    });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: privateChat, message_ids: [4001] },
    });

    expect(calls[0]!.method).toBe("sendPhoto");
    expect(calls[0]!.payload.photo).toBe("LARGE");
    expect(body(calls[0]!)).toBe(`🗑 <b>O'chirildi</b> — ${ALI_LINK}\n\nrasm izohi`);
    expect(expandedOf(calls[0]!)).toContain(`· ${formatExactSeconds(date)} · rasm`);
  });

  test("sends nothing for an untracked chat", async () => {
    store.setChatRule(9090, "deny");
    const calls = await run("deleted", {
      deleted_business_messages: {
        business_connection_id: CONN,
        chat: { id: 9090, first_name: "Bobur", type: "private" as const },
        message_ids: [1],
      },
    });
    expect(calls).toHaveLength(0);
  });

  test("sends nothing for a connection that is not the owner's", async () => {
    store.saveConnection({ id: "conn-other", userId: 999, isEnabled: true });
    const calls = await run("deleted", {
      deleted_business_messages: {
        business_connection_id: "conn-other",
        chat: privateChat,
        message_ids: [1],
      },
    });
    expect(calls).toHaveLength(0);
  });
});

describe("edited notifications", () => {
  test("strikes the old text above the new one", async () => {
    const date = recently();
    const editDate = date + 30;
    store.storeMessage(CONN, CHAT, { message_id: 5001, date, from: counterparty, text: "salom qalaysan" });

    const calls = await run("edited", {
      edited_business_message: {
        business_connection_id: CONN,
        chat: privateChat,
        from: counterparty,
        message_id: 5001,
        date,
        edit_date: editDate,
        text: "salom, qalaysan?",
      },
    });

    expect(body(calls[0]!)).toBe(
      `✏️ <b>Tahrirlandi</b> — ${ALI_LINK}\n\n<s>salom qalaysan</s>\n\nsalom, qalaysan?`,
    );
    expect(expandedOf(calls[0]!)).toBe(
      `✏️ <b>Tahrirlandi</b> — ${ALI_LINK}\n` +
        `Chat 555 · msg 5001 · ${formatExactSeconds(editDate)}\n\n` +
        `<s>salom qalaysan</s>\n\nsalom, qalaysan?\n\n` +
        `/history 555\n/versions 555 5001`,
    );
  });

  test("notes a missing original on the same block", async () => {
    const date = recently();
    const calls = await run("edited", {
      edited_business_message: {
        business_connection_id: CONN,
        chat: privateChat,
        from: counterparty,
        message_id: 5999,
        date,
        edit_date: date,
        text: "yangi matn",
      },
    });

    expect(body(calls[0]!)).toBe(`✏️ <b>Tahrirlandi</b> — ${ALI_LINK}\n\nyangi matn\nasl nusxa arxivda yo'q`);
  });

  test("stores the new version even though the original was missing", () => {
    expect(store.getMessage(CONN, CHAT, 5999)?.text).toBe("yangi matn");
  });
});

describe("notification details", () => {
  test("expire once past their TTL", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, { message_id: 6001, date, from: counterparty, text: "eskiradi" });
    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: privateChat, message_ids: [6001] },
    });
    const id = token(calls[0]!);

    expect(store.getNotificationDetails(id)).toBeDefined();
    await Bun.sleep(5);
    store.cleanupNotificationDetails(1);
    expect(store.getNotificationDetails(id)).toBeUndefined();
  });

  test("are purged along with a chat", async () => {
    const date = recently();
    store.storeMessage(CONN, 7777, { message_id: 7001, date, from: counterparty, text: "tozalanadi" });
    const calls = await run("deleted", {
      deleted_business_messages: {
        business_connection_id: CONN,
        chat: { id: 7777, first_name: "Vali", type: "private" as const },
        message_ids: [7001],
      },
    });
    const id = token(calls[0]!);

    expect(store.getNotificationDetails(id)).toBeDefined();
    store.deleteMessagesByChat(7777);
    expect(store.getNotificationDetails(id)).toBeUndefined();
  });
});

const connectionUpdate = (isEnabled: boolean, user = owner, id = CONN) => ({
  business_connection: {
    id,
    user,
    user_chat_id: user.id,
    date: recently(),
    is_enabled: isEnabled,
    rights: {},
  },
});

describe("connection notifications", () => {
  test("announces a connection in one line", async () => {
    const calls = await run("connection", connectionUpdate(true));
    expect(body(calls[0]!)).toBe("🔗 <b>Ulandi</b>");
  });

  test("reports how much was purged on disconnect", async () => {
    store.storeMessage(CONN, CHAT, {
      message_id: 8001,
      date: recently(),
      from: counterparty,
      text: "qoladi",
    });
    const calls = await run("connection", connectionUpdate(false));
    expect(body(calls[0]!)).toMatch(/^🔗 <b>Uzildi<\/b> — \d+ yozuv o'chirildi$/);
    expect(store.getMessage(CONN, CHAT, 8001)).toBeUndefined();
  });

  test("links the stranger in the rejection alert", async () => {
    const stranger = { id: 99887766, is_bot: false, first_name: "Notanish", username: "stranger" };
    const calls = await run("connection", connectionUpdate(true, stranger, "conn-evil"));

    expect(body(calls[0]!)).toBe(
      `🚫 <b>Ruxsatsiz ulanish urinishi</b>\n` +
        `<a href="https://t.me/stranger">Notanish (@stranger)</a> · user 99887766\n\n` +
        `Hech narsa saqlanmadi.`,
    );
    expect(store.getConnection("conn-evil")).toBeUndefined();
  });
});
