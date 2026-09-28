import { describe, expect, test } from "bun:test";
import { chatLabel, eventHeader, metaLine, userLink, withMeta, withNote } from "./notify-format.js";

describe("userLink", () => {
  test("prefers a t.me link when a username exists", () => {
    expect(userLink({ id: 555, username: "ali" }, "Ali Valiev")).toBe(
      `<a href="https://t.me/ali">Ali Valiev</a>`,
    );
  });

  test("falls back to the id link without a username", () => {
    expect(userLink({ id: 555 }, "Ali Valiev")).toBe(`<a href="tg://user?id=555">Ali Valiev</a>`);
  });

  test("rejects a malformed username rather than building a bad URL", () => {
    expect(userLink({ id: 555, username: "bad name/../x" }, "Ali")).toBe(
      `<a href="tg://user?id=555">Ali</a>`,
    );
  });

  test("escapes the visible name", () => {
    expect(userLink({ id: 555 }, "a<b>&c")).toBe(`<a href="tg://user?id=555">a&lt;b&gt;&amp;c</a>`);
  });

  test("returns the plain escaped name with no user", () => {
    expect(userLink(undefined, "a<b>")).toBe("a&lt;b&gt;");
  });
});

describe("metaLine", () => {
  test("joins with a middle dot and drops empties", () => {
    expect(metaLine("Chat 555", null, "msg 1042", undefined, false, "", "14:32")).toBe(
      "Chat 555 · msg 1042 · 14:32",
    );
  });
});

describe("eventHeader", () => {
  test("keeps the subject HTML as given", () => {
    expect(eventHeader("🗑", "O'chirildi", `<a href="tg://user?id=1">Ali</a>`)).toBe(
      `🗑 <b>O'chirildi</b> — <a href="tg://user?id=1">Ali</a>`,
    );
  });

  test("omits the dash without a subject", () => {
    expect(eventHeader("🔗", "Ulandi")).toBe("🔗 <b>Ulandi</b>");
  });
});

describe("chatLabel", () => {
  test("prefers a group title", () => {
    expect(chatLabel({ id: -100, title: "Sotuv" })).toBe("Sotuv");
  });

  test("uses the first name of a private chat", () => {
    expect(chatLabel({ id: 555, first_name: "Ali" })).toBe("Ali");
  });

  test("falls back to the id", () => {
    expect(chatLabel({ id: 555 })).toBe("Chat 555");
  });
});

describe("withMeta and withNote", () => {
  test("joins the meta to the first block", () => {
    expect(withMeta("msg 1", ["a", "b"])).toEqual(["msg 1\na", "b"]);
  });

  test("returns the meta alone with no blocks", () => {
    expect(withMeta("msg 1", [])).toEqual(["msg 1"]);
  });

  test("appends the note to the last block", () => {
    expect(withNote(["a", "b"], "eslatma")).toEqual(["a", "b\neslatma"]);
  });
});
