import { describe, expect, test } from "bun:test";
import { escapeHtml, formatWhen, getMediaInfo, getUserDisplayName } from "./format.js";

describe("escapeHtml", () => {
  test("escapes the characters Telegram parses as markup", () => {
    expect(escapeHtml(`<b>&</b>`)).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  test("escapes ampersands before angle brackets", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  test("returns an empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });
});

describe("getUserDisplayName", () => {
  test("falls back when there is no user", () => {
    expect(getUserDisplayName(undefined)).toBe("Noma'lum");
  });

  test("joins first and last name", () => {
    expect(getUserDisplayName({ id: 1, is_bot: false, first_name: "Ali", last_name: "Valiev" })).toBe("Ali Valiev");
  });

  test("appends the username when present", () => {
    expect(getUserDisplayName({ id: 1, is_bot: false, first_name: "Ali", username: "ali" })).toBe("Ali (@ali)");
  });
});

describe("formatWhen", () => {
  const now = new Date("2026-09-28T12:00:00Z"); // 17:00 in Asia/Tashkent

  test("shows time only for today", () => {
    expect(formatWhen(new Date("2026-09-28T09:32:00Z"), now)).toBe("14:32");
  });

  test("prefixes yesterday", () => {
    expect(formatWhen(new Date("2026-09-27T09:32:00Z"), now)).toBe("kecha 14:32");
  });

  test("adds day and month within the year", () => {
    expect(formatWhen(new Date("2026-09-20T09:32:00Z"), now)).toBe("20.09 14:32");
  });

  test("adds a two-digit year before that", () => {
    expect(formatWhen(new Date("2025-09-20T09:32:00Z"), now)).toBe("20.09.25 14:32");
  });

  test("uses the Tashkent day boundary", () => {
    // 20:00 UTC is already the next day in Tashkent (01:00).
    expect(formatWhen(new Date("2026-09-27T20:00:00Z"), now)).toBe("01:00");
  });

  test("pads to two digits", () => {
    expect(formatWhen(new Date("2026-09-28T04:05:00Z"), now)).toBe("09:05");
  });
});

describe("getMediaInfo", () => {
  test("picks the largest photo size", () => {
    const info = getMediaInfo({ photo: [{ file_id: "small" }, { file_id: "large" }] });
    expect(info?.type).toBe("photo");
    expect(info?.fileId).toBe("large");
  });

  test("returns null when there is no media", () => {
    expect(getMediaInfo({ text: "salom" })).toBeNull();
  });

  test("names plain types without emoji", () => {
    expect(getMediaInfo({ photo: [{ file_id: "P" }] })?.word).toBe("rasm");
    expect(getMediaInfo({ video: { file_id: "V" } as never })?.word).toBe("video");
    expect(getMediaInfo({ voice: { file_id: "V" } as never })?.word).toBe("ovozli xabar");
    expect(getMediaInfo({ animation: { file_id: "A" } as never })?.word).toBe("GIF");
  });

  test("appends and escapes a document name", () => {
    expect(getMediaInfo({ document: { file_id: "D", file_name: "a<b>.pdf" } as never })?.word).toBe(
      "fayl: a&lt;b&gt;.pdf",
    );
  });

  test("appends and escapes an audio title", () => {
    expect(getMediaInfo({ audio: { file_id: "A", title: "rock & roll" } as never })?.word).toBe(
      "audio: rock &amp; roll",
    );
  });

  test("falls back to the bare kind with no detail", () => {
    expect(getMediaInfo({ document: { file_id: "D" } as never })?.word).toBe("fayl");
    expect(getMediaInfo({ audio: { file_id: "A" } as never })?.word).toBe("audio");
  });

  test("ignores a whitespace-only detail", () => {
    expect(getMediaInfo({ document: { file_id: "D", file_name: "   " } as never })?.word).toBe("fayl");
  });
});
