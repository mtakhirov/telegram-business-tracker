import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Api, Context } from "grammy";
import type { InlineKeyboardMarkup, Update, UserFromGetMe } from "grammy/types";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-toggle-"));
const ADMIN = 123;
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = String(ADMIN);
process.env.OWNER_ID = String(ADMIN);
process.env.DB_PATH = path.join(tmpDir, "toggle.db");

let store: typeof import("../store/message-store.js");
let toggle: { middleware: () => (ctx: Context, next: () => Promise<void>) => Promise<void> };

const me = { id: 1, is_bot: true, first_name: "bot", username: "testbot" } as UserFromGetMe;
const owner = { id: ADMIN, is_bot: false, first_name: "Men" };
const stranger = { id: 999, is_bot: false, first_name: "Notanish" };

const COMPACT = "🗑 <b>O'chirildi</b> — Ali\n\nsalom";
const EXPANDED = "🗑 <b>O'chirildi</b> — Ali\nChat 555 · msg 1\n\nsalom\n\n/history 555";

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

/** Fires a button press and returns the API calls the handler made. */
async function press(
  data: string,
  options: { from?: typeof owner; asCaption?: boolean } = {},
): Promise<Call[]> {
  const calls: Call[] = [];
  const api = new Api("dummy-token");
  api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true, result: true } as never);
  });

  const chat = { id: ADMIN, type: "private" as const, first_name: "Men" };
  const message = options.asCaption
    ? { message_id: 7, date: 1, chat, from: me, caption: COMPACT, photo: [{ file_id: "P" }] }
    : { message_id: 7, date: 1, chat, from: me, text: COMPACT };

  const update = {
    update_id: 1,
    callback_query: {
      id: "cb-1",
      from: options.from ?? owner,
      chat_instance: "ci-1",
      message,
      data,
    },
  } as unknown as Update;

  await toggle.middleware()(new Context(update, api, me), async () => {});
  return calls;
}

const buttonText = (call: Call) =>
  (call.payload.reply_markup as InlineKeyboardMarkup).inline_keyboard[0]![0]!.text;

beforeAll(async () => {
  store = await import("../store/message-store.js");
  toggle = (await import("./notification-toggle.js")).default;
});

afterAll(() => {
  store.closeStore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("expand", () => {
  test("swaps in the expanded text and a collapse button", async () => {
    const token = store.saveNotificationDetails(555, { compact: COMPACT, expanded: EXPANDED });
    const calls = await press(`nd:x:${token}`);

    const edit = calls.find((call) => call.method === "editMessageText")!;
    expect(edit.payload.text).toBe(EXPANDED);
    expect(edit.payload.parse_mode).toBe("HTML");
    expect(buttonText(edit)).toBe("▲ Yashirish");
    expect(calls.some((call) => call.method === "answerCallbackQuery")).toBe(true);
  });

  test("edits the caption when the button sits on media", async () => {
    const token = store.saveNotificationDetails(555, { compact: COMPACT, expanded: EXPANDED });
    const calls = await press(`nd:x:${token}`, { asCaption: true });

    const edit = calls.find((call) => call.method === "editMessageCaption")!;
    expect(edit.payload.caption).toBe(EXPANDED);
    expect(calls.some((call) => call.method === "editMessageText")).toBe(false);
  });
});

describe("collapse", () => {
  test("restores the compact text and an expand button", async () => {
    const token = store.saveNotificationDetails(555, { compact: COMPACT, expanded: EXPANDED });
    const calls = await press(`nd:o:${token}`);

    const edit = calls.find((call) => call.method === "editMessageText")!;
    expect(edit.payload.text).toBe(COMPACT);
    expect(buttonText(edit)).toBe("ℹ️ Batafsil");
  });
});

describe("refusals", () => {
  test("reports expired details instead of editing", async () => {
    const calls = await press("nd:x:0123456789abcdef");

    expect(calls.some((call) => call.method === "editMessageText")).toBe(false);
    const answer = calls.find((call) => call.method === "answerCallbackQuery")!;
    expect(answer.payload.text).toBe("Ma'lumot eskirgan");
    expect(answer.payload.show_alert).toBe(true);
  });

  test("ignores a press from anyone but the owner", async () => {
    const token = store.saveNotificationDetails(555, { compact: COMPACT, expanded: EXPANDED });
    const calls = await press(`nd:x:${token}`, { from: stranger });

    expect(calls.some((call) => call.method === "editMessageText")).toBe(false);
    expect(calls.some((call) => call.method === "answerCallbackQuery")).toBe(true);
  });

  test("does not match unrelated callback data", async () => {
    const calls = await press("other:payload");
    expect(calls).toHaveLength(0);
  });
});
