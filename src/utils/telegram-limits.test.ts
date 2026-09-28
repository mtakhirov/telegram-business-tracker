import { describe, expect, test } from "bun:test";
import { MAX_MESSAGE_LENGTH, packBlocks, quote, quoteDiff, splitText } from "./telegram-limits.js";

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

describe("quote", () => {
  test("returns nothing for empty content", () => {
    expect(quote("")).toEqual([]);
  });

  test("escapes HTML inside the blockquote", () => {
    expect(quote("<b>hi</b> & bye")).toEqual(["<blockquote>&lt;b&gt;hi&lt;/b&gt; &amp; bye</blockquote>"]);
  });

  test("splits long content into several blocks within the limit", () => {
    const blocks = quote("a ".repeat(4000), MAX_MESSAGE_LENGTH);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
      expect(block.startsWith("<blockquote>")).toBe(true);
      expect(block.endsWith("</blockquote>")).toBe(true);
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

describe("quoteDiff", () => {
  test("puts struck old text above new text in one blockquote", () => {
    expect(quoteDiff("salom qalaysan", "salom, qalaysan?")).toEqual([
      "<blockquote><s>salom qalaysan</s>\nsalom, qalaysan?</blockquote>",
    ]);
  });

  test("escapes both sides", () => {
    expect(quoteDiff("<b>", "a & b")).toEqual(["<blockquote><s>&lt;b&gt;</s>\na &amp; b</blockquote>"]);
  });

  test("quotes only the new text when there is no old text", () => {
    expect(quoteDiff(null, "yangi")).toEqual(["<blockquote>yangi</blockquote>"]);
  });

  test("splits into separate blocks when combined is too long", () => {
    const blocks = quoteDiff("a ".repeat(3000), "b ".repeat(3000), MAX_MESSAGE_LENGTH);
    expect(blocks.length).toBeGreaterThan(1);
    for (const block of blocks) {
      expect(block.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
      // Each <s> must open and close inside a single block.
      const opens = block.split("<s>").length - 1;
      const closes = block.split("</s>").length - 1;
      expect(opens).toBe(closes);
    }
  });
});
