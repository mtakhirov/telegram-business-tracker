/**
 * Tests for what each command actually replies.
 *
 * Commands run against a real grammY `Context` whose `Api` is intercepted, so
 * these assert the text Telegram would receive rather than the shape of an
 * internal helper. Every command is also checked to stay silent for anyone but
 * the owner, which is the bot's only access control.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Api, Context } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "spy-bot-commands-"));
const OWNER = 123;
process.env.BOT_TOKEN = "test-token";
process.env.ADMIN_CHAT_ID = String(OWNER);
process.env.OWNER_ID = String(OWNER);
process.env.DEFAULT_TRACK_MODE = "allow";
process.env.BOT_NAME = "Test Archive";
process.env.DB_PATH = path.join(tmpDir, "commands.db");

const CONN = "conn-1";
const CHAT = 555;

let commands: { middleware: () => (ctx: Context, next: () => Promise<void>) => Promise<void> };
let store: typeof import("../entities/message/repository.js") &
  typeof import("../entities/chat/repository.js") &
  typeof import("../entities/connection/repository.js") &
  typeof import("../entities/settings/repository.js");
let closeDb: () => void;

const me = { id: 1, is_bot: true, first_name: "bot", username: "testbot" } as UserFromGetMe;
const owner = { id: OWNER, is_bot: false, first_name: "Men" };
const stranger = { id: 999, is_bot: false, first_name: "Notanish" };
const counterparty = { id: CHAT, is_bot: false, first_name: "Ali Valiev", username: "alivaliev" };

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

async function run(text: string, from = owner): Promise<Call[]> {
  const calls: Call[] = [];
  const api = new Api("dummy-token");
  api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true, result: { message_id: 1 } } as never);
  });

  const update = {
    update_id: 1,
    message: {
      message_id: 9,
      date: Math.floor(Date.now() / 1000),
      chat: { id: from.id, type: "private" as const, first_name: from.first_name },
      from,
      text,
      entities: [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0]!.length }],
    },
  } as Update;

  await commands.middleware()(new Context(update, api, me), async () => {});
  return calls;
}

const body = (calls: Call[]) =>
  calls.map((call) => (call.payload.text ?? call.payload.caption) as string).join("\n");

beforeAll(async () => {
  commands = (await import("./commands.js")).default;
  store = {
    ...(await import("../entities/message/repository.js")),
    ...(await import("../entities/chat/repository.js")),
    ...(await import("../entities/connection/repository.js")),
    ...(await import("../entities/settings/repository.js")),
  };
  closeDb = (await import("../shared/db/client.js")).closeDb;

  store.saveConnection({ id: CONN, userId: OWNER, isEnabled: true });

  const now = Math.floor(Date.now() / 1000);
  store.touchChat(CHAT, "Ali Valiev");
  store.touchChat(-1001234, "Sotuv bo'limi");
  store.storeMessage(CONN, CHAT, {
    message_id: 1042,
    date: now - 120,
    from: counterparty,
    text: "kitob o'qidim",
  });
  store.storeMessage(CONN, CHAT, {
    message_id: 1043,
    date: now - 60,
    from: owner,
    text: "men ham kitob oldim",
  });
  store.storeMessage(CONN, CHAT, { message_id: 2001, date: now - 300, from: counterparty, text: "v1" });
  store.storeMessage(CONN, CHAT, {
    message_id: 2001,
    date: now - 300,
    edit_date: now - 200,
    from: counterparty,
    text: "v2",
  });
});

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("owner gating", () => {
  const everyCommand = [
    "/start",
    "/help",
    "/stats",
    "/chats",
    "/track 1",
    "/untrack 1",
    "/untrack_reset 1",
    "/forget 1",
    "/search kitob",
    "/history 555",
    "/versions 555 2001",
    "/export",
    "/settings",
  ];

  test("stays silent for anyone but the owner", async () => {
    for (const command of everyCommand) {
      expect(await run(command, stranger)).toHaveLength(0);
    }
  });

  test("answers the owner", async () => {
    for (const command of everyCommand) {
      expect((await run(command)).length).toBeGreaterThan(0);
    }
  });
});

describe("/start and /help", () => {
  test("names the bot from BOT_NAME", async () => {
    expect(body(await run("/start"))).toContain("<b>Test Archive</b>");
  });

  test("answers a business chat deep link with that chat's commands", async () => {
    const text = body(await run("/start bizChat555"));
    expect(text).toContain("Chat 555");
    expect(text).toContain("/track 555");
  });

  test("lists every registered command", async () => {
    const text = body(await run("/help"));
    const { COMMANDS } = await import("../shared/telegram/command-list.js");
    for (const spec of COMMANDS) {
      expect(text).toContain(`/${spec.command}`);
    }
  });
});

describe("/stats", () => {
  test("reports the archive size and retention window", async () => {
    const text = body(await run("/stats"));
    expect(text).toContain(`Xabarlar: ${store.getStoreSize()}`);
    expect(text).toContain("Retention:");
  });
});

describe("/chats", () => {
  test("links a private chat and leaves a group unlinked", async () => {
    const text = body(await run("/chats"));
    expect(text).toContain(`<a href="tg://user?id=555">Ali Valiev</a>`);
    expect(text).toContain("Sotuv bo'limi");
    expect(text).not.toContain(`user?id=-1001234`);
  });

  test("marks a chat that has an explicit rule", async () => {
    await run("/untrack 555");
    expect(body(await run("/chats"))).toContain("(qoida)");
    await run("/untrack_reset 555");
  });
});

describe("track rules", () => {
  test("track and untrack flip whether a chat is archived", async () => {
    await run("/untrack 4242");
    expect(store.isChatTracked(4242)).toBe(false);

    await run("/track 4242");
    expect(store.isChatTracked(4242)).toBe(true);
  });

  test("untrack_reset falls back to the default", async () => {
    await run("/untrack 4242");
    await run("/untrack_reset 4242");
    expect(store.isChatTracked(4242)).toBe(true);
  });

  test("rejects an argument that is not a chat id", async () => {
    expect(body(await run("/track abc"))).toContain("Ishlatilishi");
  });
});

describe("/search and /history", () => {
  test("finds a message and shows where it came from", async () => {
    const text = body(await run("/search kitob"));
    expect(text).toContain("2 natija");
    expect(text).toContain("msg 1042");
    expect(text).toContain("kitob o'qidim");
  });

  test("names the sender only when it is not the counterparty", async () => {
    const text = body(await run("/search kitob"));
    expect(text).toContain(`<a href="tg://user?id=123">Men</a>`);
  });

  test("reports no match rather than an empty list", async () => {
    expect(body(await run("/search yo'qnarsa"))).toContain("natija yo'q");
  });

  test("requires at least two characters", async () => {
    expect(body(await run("/search a"))).toContain("kamida 2 belgi");
  });

  test("history lists a chat's newest messages", async () => {
    const text = body(await run("/history 555"));
    expect(text).toContain("Chat 555");
    expect(text).toContain("msg 1043");
  });

  test("history honours a limit", async () => {
    expect(body(await run("/history 555 1"))).toContain("oxirgi 1 xabar");
  });
});

describe("/versions", () => {
  test("shows the whole edit chain", async () => {
    const text = body(await run("/versions 555 2001"));
    expect(text).toContain("2 versiya");
    expect(text).toContain("v1");
    expect(text).toContain("v2");
  });

  test("reports a message with no stored versions", async () => {
    expect(body(await run("/versions 555 9999"))).toContain("saqlangan versiya yo'q");
  });
});

describe("/export", () => {
  test("sends the archive as a document", async () => {
    const calls = await run("/export");
    expect(calls[0]!.method).toBe("sendDocument");
    expect(calls[0]!.payload.caption).toMatch(/^\d+ xabar eksport qilindi$/);
  });

  test("reports an empty chat instead of sending a file", async () => {
    expect(body(await run("/export 7777"))).toContain("ma'lumot yo'q");
  });
});

describe("/settings", () => {
  test("shows both values and where they come from", async () => {
    const text = body(await run("/settings"));
    expect(text).toContain("retention: 30 kun (.env)");
    expect(text).toContain("track: allow (.env)");
  });

  test("changes retention and marks it as overridden", async () => {
    expect(body(await run("/settings retention 7"))).toContain("retention: 7 kun (o'zgartirilgan)");
    expect(store.getRetentionDays()).toEqual({ value: 7, fromEnv: false });
  });

  test("changes the archiving default", async () => {
    await run("/settings track deny");
    expect(store.getDefaultTrackMode().value).toBe("deny");
    expect(store.isChatTracked(88_888)).toBe(false);
  });

  test("reset returns a setting to the environment", async () => {
    await run("/settings reset track");
    expect(store.getDefaultTrackMode()).toEqual({ value: "allow", fromEnv: true });
  });

  test("refuses a retention below one day", async () => {
    expect(body(await run("/settings retention 0"))).toContain("kamida 1 kun");
  });

  test("refuses a track mode that is not allow or deny", async () => {
    expect(body(await run("/settings track maybe"))).toContain("allow yoki deny");
  });
});

describe("/forget", () => {
  test("deletes a chat's messages and says how many", async () => {
    store.storeMessage(CONN, 6060, { message_id: 1, date: 1, from: counterparty, text: "ketadi" });
    expect(store.getMessage(CONN, 6060, 1)).toBeDefined();

    expect(body(await run("/forget 6060"))).toContain("1 yozuv o'chirildi");
    expect(store.getMessage(CONN, 6060, 1)).toBeUndefined();
  });
});
