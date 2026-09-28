import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Api, Context } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";

// Handlers reach config and the store at import time, so the environment has
// to be in place before the dynamic imports below.
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
let formatWhenSeconds: typeof import("../utils/format.js")["formatWhenSeconds"];
let handlers: Record<string, { middleware: () => (ctx: Context, next: () => Promise<void>) => Promise<void> }>;

const me = { id: 1, is_bot: true, first_name: "bot", username: "testbot" } as UserFromGetMe;
const privateChat = { id: CHAT, first_name: "Ali Valiev", type: "private" as const };
const groupChat = { id: GROUP, title: "Sotuv bo'limi", type: "supergroup" as const };
const counterparty = { id: CHAT, is_bot: false, first_name: "Ali Valiev" };
const owner = { id: ADMIN, is_bot: false, first_name: "Men" };

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

/** Runs a handler against one update and returns the API calls it made. */
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

beforeAll(async () => {
  store = await import("../store/message-store.js");
  formatWhenSeconds = (await import("../utils/format.js")).formatWhenSeconds;
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

/** A timestamp a minute ago, so the "today" branch of formatWhen is used. */
const recently = () => Math.floor(Date.now() / 1000) - 60;

describe("deleted notifications", () => {
  test("renders a single text deletion", async () => {
    const date = recently();
    store.storeMessage(CONN, CHAT, { message_id: 1042, date, from: counterparty, text: "salom, qalaysan" });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: privateChat, message_ids: [1042] },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("sendMessage");
    expect(calls[0]!.payload.chat_id).toBe(String(ADMIN));
    expect(body(calls[0]!)).toBe(
      `🗑 <b>O'chirildi</b> — Ali Valiev\n` +
        `Chat 555 · msg 1042 · ${formatWhenSeconds(date)}\n\n` +
        `salom, qalaysan`,
    );
  });

  test("drops the row only after a successful send", async () => {
    expect(store.getMessage(CONN, CHAT, 1042)).toBeUndefined();
  });

  test("names the sender only when it is not the counterparty", async () => {
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

    expect(body(calls[0]!)).toBe(
      `🗑 <b>3 xabar o'chirildi</b> — Ali Valiev\n` +
        `Chat 555\n\n` +
        `msg 2001 · ${formatWhenSeconds(date)}\nulardan\n\n` +
        `msg 2002 · Men · ${formatWhenSeconds(date)}\nmendan\n\n` +
        `msg 2999 · arxivda yo'q`,
    );
  });

  test("always names the sender in a group", async () => {
    const date = recently();
    store.storeMessage(CONN, GROUP, { message_id: 3001, date, from: counterparty, text: "narxni keyin aytaman" });

    const calls = await run("deleted", {
      deleted_business_messages: { business_connection_id: CONN, chat: groupChat, message_ids: [3001] },
    });

    expect(body(calls[0]!)).toBe(
      `🗑 <b>O'chirildi</b> — Sotuv bo'limi\n` +
        `Chat -1001234 · msg 3001 · Ali Valiev · ${formatWhenSeconds(date)}\n\n` +
        `narxni keyin aytaman`,
    );
  });

  test("puts the media word in the meta line", async () => {
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
    expect(body(calls[0]!)).toBe(
      `🗑 <b>O'chirildi</b> — Ali Valiev\n` +
        `Chat 555 · msg 4001 · ${formatWhenSeconds(date)} · rasm\n\n` +
        `rasm izohi`,
    );
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
      `✏️ <b>Tahrirlandi</b> — Ali Valiev\n` +
        `Chat 555 · msg 5001 · ${formatWhenSeconds(editDate)}\n\n` +
        `<s>salom qalaysan</s>\nsalom, qalaysan?`,
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

    expect(body(calls[0]!)).toBe(
      `✏️ <b>Tahrirlandi</b> — Ali Valiev\n` +
        `Chat 555 · msg 5999 · ${formatWhenSeconds(date)}\n\n` +
        `yangi matn\nasl nusxa arxivda yo'q`,
    );
  });

  test("stores the new version even though the original was missing", () => {
    expect(store.getMessage(CONN, CHAT, 5999)?.text).toBe("yangi matn");
  });
});

describe("connection notifications", () => {
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

  test("announces a connection in one line", async () => {
    const calls = await run("connection", connectionUpdate(true));
    expect(body(calls[0]!)).toBe("🔗 <b>Ulandi</b>");
  });

  test("reports how much was purged on disconnect", async () => {
    store.storeMessage(CONN, CHAT, { message_id: 7001, date: recently(), from: counterparty, text: "qoladi" });
    const calls = await run("connection", connectionUpdate(false));
    expect(body(calls[0]!)).toMatch(/^🔗 <b>Uzildi<\/b> — \d+ yozuv o'chirildi$/);
    expect(store.getMessage(CONN, CHAT, 7001)).toBeUndefined();
  });

  test("rejects a non-owner and keeps the alert explicit", async () => {
    const stranger = { id: 99887766, is_bot: false, first_name: "Notanish", username: "stranger" };
    const calls = await run("connection", connectionUpdate(true, stranger, "conn-evil"));

    expect(body(calls[0]!)).toBe(
      `🚫 <b>Ruxsatsiz ulanish urinishi</b>\n` +
        `Notanish (@stranger) · user 99887766\n\n` +
        `Hech narsa saqlanmadi.`,
    );
    expect(store.getConnection("conn-evil")).toBeUndefined();
  });
});
