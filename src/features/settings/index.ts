/**
 * Reading and changing the runtime settings from a chat.
 *
 * Each setting shows where its current value comes from, so it is obvious
 * whether the bot is following `.env` or an override stored in the database.
 * `reset` removes the override and hands the setting back to the environment.
 *
 * Changes apply immediately: retention is read on every cleanup pass and the
 * archiving default on every message, so nothing here needs a restart.
 *
 * @example
 * ```text
 * /settings                  show every setting and its source
 * /settings retention 7      keep messages for 7 days
 * /settings track deny       archive only chats added with /track
 * /settings reset retention  fall back to RETENTION_DAYS from .env
 * ```
 */

import { Composer } from "grammy";
import {
  clearSetting,
  getDefaultTrackMode,
  getRetentionDays,
  setSetting,
  type SettingKey,
} from "../../entities/settings/repository.js";
import { OWNER_ID } from "../../shared/config/index.js";

const composer = new Composer();

const ALIASES: Record<string, SettingKey> = {
  retention: "retentionDays",
  track: "defaultTrackMode",
};

const USAGE =
  "Ishlatilishi:\n" +
  "/settings — joriy qiymatlar\n" +
  "/settings retention &lt;kun&gt;\n" +
  "/settings track &lt;allow|deny&gt;\n" +
  "/settings reset &lt;retention|track&gt;";

function source(fromEnv: boolean): string {
  return fromEnv ? ".env" : "o'zgartirilgan";
}

function overview(): string {
  const retention = getRetentionDays();
  const track = getDefaultTrackMode();

  return (
    `<b>Sozlamalar</b>\n\n` +
    `retention: ${retention.value} kun (${source(retention.fromEnv)})\n` +
    `track: ${track.value} (${source(track.fromEnv)})\n\n` +
    USAGE
  );
}

composer.command("settings", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const [name, value] = ctx.match.trim().split(/\s+/).filter(Boolean);

  if (!name) {
    await ctx.reply(overview(), { parse_mode: "HTML" });
    return;
  }

  if (name === "reset") {
    const key = value ? ALIASES[value] : undefined;
    if (!key) {
      await ctx.reply(USAGE, { parse_mode: "HTML" });
      return;
    }
    clearSetting(key);
    await ctx.reply(`↩️ ${value} default qiymatga qaytdi\n\n${overview()}`, { parse_mode: "HTML" });
    return;
  }

  const key = ALIASES[name];
  if (!key || !value) {
    await ctx.reply(USAGE, { parse_mode: "HTML" });
    return;
  }

  if (key === "retentionDays") {
    const days = Number(value);
    if (!Number.isSafeInteger(days) || days < 1) {
      await ctx.reply("retention kamida 1 kun bo'lishi kerak");
      return;
    }
    setSetting(key, String(days));
    await ctx.reply(`✓ retention: ${days} kun\n\n${overview()}`, { parse_mode: "HTML" });
    return;
  }

  if (value !== "allow" && value !== "deny") {
    await ctx.reply("track faqat allow yoki deny bo'ladi");
    return;
  }
  setSetting(key, value);
  await ctx.reply(`✓ track: ${value}\n\n${overview()}`, { parse_mode: "HTML" });
});

export default composer;
