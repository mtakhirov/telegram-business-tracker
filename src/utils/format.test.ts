import { describe, expect, test } from "bun:test";
import { escapeHtml, getContentDescription, getMediaInfo, getMediaLabel, getUserDisplayName } from "./format.js";

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
    expect(info).toEqual({ type: "photo", fileId: "large", label: "📷 Rasm" });
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
