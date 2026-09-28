/**
 * Tests for the outgoing API defaults.
 *
 * The recording transformer is installed before the one under test, because
 * grammY runs transformers in reverse installation order and the recorder has
 * to observe the payload after it was modified.
 */

import { describe, expect, test } from "bun:test";
import { Api } from "grammy";
import { disableLinkPreviews } from "./api-defaults.js";

interface Call {
  method: string;
  payload: Record<string, unknown>;
}

function recordingApi(): { api: Api; calls: Call[] } {
  const calls: Call[] = [];
  const api = new Api("dummy-token");

  api.config.use((_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return Promise.resolve({ ok: true, result: { message_id: 1 } } as never);
  });
  api.config.use(disableLinkPreviews);

  return { api, calls };
}

describe("disableLinkPreviews", () => {
  test("disables the preview on sendMessage", async () => {
    const { api, calls } = recordingApi();
    await api.sendMessage(1, "qarang https://example.com");

    expect(calls[0]!.payload.link_preview_options).toEqual({ is_disabled: true });
  });

  test("disables the preview on editMessageText", async () => {
    const { api, calls } = recordingApi();
    await api.editMessageText(1, 2, "yangilandi https://example.com");

    expect(calls[0]!.payload.link_preview_options).toEqual({ is_disabled: true });
  });

  test("leaves an explicit link_preview_options alone", async () => {
    const { api, calls } = recordingApi();
    await api.sendMessage(1, "https://example.com", {
      link_preview_options: { is_disabled: false, prefer_large_media: true },
    });

    expect(calls[0]!.payload.link_preview_options).toEqual({
      is_disabled: false,
      prefer_large_media: true,
    });
  });

  test("does not touch methods that cannot show a preview", async () => {
    const { api, calls } = recordingApi();
    await api.sendPhoto(1, "FILE_ID", { caption: "https://example.com" });

    expect(calls[0]!.payload).not.toHaveProperty("link_preview_options");
  });

  test("keeps the rest of the payload intact", async () => {
    const { api, calls } = recordingApi();
    await api.sendMessage(1, "salom", { parse_mode: "HTML" });

    expect(calls[0]!.payload.text).toBe("salom");
    expect(calls[0]!.payload.parse_mode).toBe("HTML");
    expect(calls[0]!.payload.chat_id).toBe(1);
  });
});
