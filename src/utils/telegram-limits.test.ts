import { describe, expect, test } from "bun:test";
import { MAX_MESSAGE_LENGTH, contentBlocks, diffBlocks, packBlocks, splitText } from "./telegram-limits.js";

describe("splitText", () => {
  test("returns the text unchanged when it fits", () => {
    expect(splitText("salom", 100)).toEqual(["salom"]);
  });

  test("prefers newline boundaries", () => {
    const chunks = splitText("aaaa\nbbbb\ncccc", 10);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join("\n")).toBe("aaaa\nbbbb\ncccc");
  });

  test("falls back to space boundaries", () => {
    const chunks = splitText("aaaa bbbb cccc", 10);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join(" ")).toBe("aaaa bbbb cccc");
  });

  test("hard cuts text with no boundary", () => {
    const chunks = splitText("x".repeat(25), 10);
    expect(chunks).toEqual(["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
  });

  test("never cuts through an HTML entity", () => {
    // &amp; straddles the limit; the cut must move before the ampersand.
    const chunks = splitText(`${"x".repeat(8)}&amp;${"y".repeat(20)}`, 10);
    for (const chunk of chunks) {
      expect(chunk).not.toMatch(/&[a-z]*$/);
    }
    expect(chunks.join("")).toBe(`${"x".repeat(8)}&amp;${"y".repeat(20)}`);
  });

  test("keeps every chunk within the limit", () => {
    for (const chunk of splitText("word ".repeat(2000), 4096)) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });
});

describe("contentBlocks", () => {
  test("returns nothing for empty content", () => {
    expect(contentBlocks("")).toEqual([]);
  });

  test("escapes HTML without wrapping the content", () => {
    expect(contentBlocks("<b>hi</b> & bye")).toEqual(["&lt;b&gt;hi&lt;/b&gt; &amp; bye"]);
  });

  test("splits long content into blocks within the limit", () => {
    const blocks = contentBlocks("a ".repeat(4000), MAX_MESSAGE_LENGTH);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
    }
  });
});

describe("packBlocks", () => {
  test("joins blocks that fit into one message", () => {
    expect(packBlocks(["a", "b"], 100)).toEqual(["a\n\nb"]);
  });

  test("starts a new message when the limit is reached", () => {
    expect(packBlocks(["aaaa", "bbbb"], 5)).toEqual(["aaaa", "bbbb"]);
  });

  test("skips empty blocks", () => {
    expect(packBlocks(["a", "", "b"], 100)).toEqual(["a\n\nb"]);
  });

  test("keeps each message within the limit", () => {
    const blocks = Array.from({ length: 50 }, (_, index) => `block-${index}`.repeat(20));
    for (const message of packBlocks(blocks, 500)) {
      expect(message.length).toBeLessThanOrEqual(500);
    }
  });
});

describe("diffBlocks", () => {
  test("strikes the old text above the new one", () => {
    expect(diffBlocks("salom qalaysan", "salom, qalaysan?")).toEqual([
      "<s>salom qalaysan</s>\n\nsalom, qalaysan?",
    ]);
  });

  test("escapes both sides", () => {
    expect(diffBlocks("<b>", "a & b")).toEqual(["<s>&lt;b&gt;</s>\n\na &amp; b"]);
  });

  test("returns the new content alone when there is no old text", () => {
    expect(diffBlocks(null, "yangi")).toEqual(["yangi"]);
  });

  test("splits into separate blocks when combined is too long", () => {
    const blocks = diffBlocks("a ".repeat(3000), "b ".repeat(3000), MAX_MESSAGE_LENGTH);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
      // Each <s> must open and close inside a single block.
      expect(block.split("<s>").length).toBe(block.split("</s>").length);
    }
  });
});
