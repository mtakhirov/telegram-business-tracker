import { describe, expect, test } from "bun:test";
import {
  escapeHtml,
  formatWhen,
  getContentDescription,
  getMediaInfo,
  getMediaLabel,
  getUserDisplayName,
} from "./format.js";

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
    const user = { id: 1, is_bot: false, first_name: "Ali", last_name: "Valiev" };
    expect(getUserDisplayName(user)).toBe("Ali Valiev");
  });

  test("appends the username when present", () => {
    const user = { id: 1, is_bot: false, first_name: "Ali", username: "ali" };
    expect(getUserDisplayName(user)).toBe("Ali (@ali)");
  });
});

describe("getMediaInfo", () => {
  test("escapes a document file name in the label", () => {
    const info = getMediaInfo({ document: { file_id: "D1", file_name: "a<b>.pdf" } as never });
    expect(info?.type).toBe("document");
    expect(info?.label).toBe("📎 a&lt;b&gt;.pdf");
  });

  test("escapes an audio title in the label", () => {
    const info = getMediaInfo({ audio: { file_id: "A1", title: "rock & roll" } as never });
    expect(info?.label).toBe("🎵 rock &amp; roll");
  });

  test("picks the largest photo size", () => {
    const info = getMediaInfo({ photo: [{ file_id: "small" }, { file_id: "large" }] });
    expect(info?.type).toBe("photo");
    expect(info?.fileId).toBe("large");
  });

  test("returns null when there is no media", () => {
    expect(getMediaInfo({ text: "salom" })).toBeNull();
  });
});

describe("getMediaLabel", () => {
  test("brackets the media label", () => {
    expect(getMediaLabel({ voice: { file_id: "V1" } as never })).toBe("[🎤 Ovozli xabar]");
  });

  test("returns null for text messages", () => {
    expect(getMediaLabel({ text: "salom" })).toBeNull();
  });
});

describe("getContentDescription", () => {
  test("prefers text", () => {
    expect(getContentDescription({ text: "salom" })).toBe("salom");
  });

  test("describes a caption", () => {
    expect(getContentDescription({ caption: "izoh" })).toBe("[Media + caption]: izoh");
  });

  test("names a document without a file name", () => {
    expect(getContentDescription({ document: {} })).toBe("[📎 Fayl: nomsiz]");
  });

  test("falls back for unknown content", () => {
    expect(getContentDescription({})).toBe("[📨 Boshqa turdagi xabar]");
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
});

describe("media words", () => {
  test("names a plain type without emoji", () => {
    expect(getMediaInfo({ photo: [{ file_id: "P" }] })?.word).toBe("rasm");
    expect(getMediaInfo({ voice: { file_id: "V" } as never })?.word).toBe("ovozli xabar");
  });

  test("appends and escapes a document name", () => {
    expect(getMediaInfo({ document: { file_id: "D", file_name: "a<b>.pdf" } as never })?.word).toBe(
      "fayl: a&lt;b&gt;.pdf",
    );
  });

  test("falls back to the bare kind with no detail", () => {
    expect(getMediaInfo({ document: { file_id: "D" } as never })?.word).toBe("fayl");
  });
});
