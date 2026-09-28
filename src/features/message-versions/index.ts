/**
 * The `/versions` reply: the full edit chain of one message.
 *
 * `v1` is the text as first received; each later version is an edit. The first
 * version has no edit timestamp, so it falls back to when the bot stored it.
 *
 * @example
 * ```text
 * /versions 555 1042
 * ```
 */

import { Composer } from "grammy";
import { OWNER_ID } from "../../shared/config/index.js";
import { getOwnerConnectionId } from "../../entities/connection/repository.js";
import { getVersions } from "../../entities/message/repository.js";
import { formatWhen, formatWhenSeconds } from "../../shared/lib/format.js";
import { metaLine, withMeta } from "../../shared/telegram/notify-format.js";
import { contentBlocks, sendBlocks } from "../../shared/telegram/limits.js";

const composer = new Composer();

composer.command("versions", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const parts = ctx.match.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 2 || !/^-?\d+$/.test(parts[0]!) || !/^\d+$/.test(parts[1]!)) {
    await ctx.reply("Ishlatilishi: /versions &lt;chat_id&gt; &lt;message_id&gt;", { parse_mode: "HTML" });
    return;
  }

  const chatId = Number(parts[0]);
  const messageId = Number(parts[1]);

  const connectionId = getOwnerConnectionId();
  if (!connectionId) {
    await ctx.reply("Faol business connection yo'q");
    return;
  }

  const versions = getVersions(connectionId, chatId, messageId);
  if (versions.length === 0) {
    await ctx.reply(`Chat ${chatId} · msg ${messageId} — saqlangan versiya yo'q`);
    return;
  }

  const blocks: string[] = [
    `<b>Tahrir tarixi</b> — ${versions.length} versiya\n${metaLine(`Chat ${chatId}`, `msg ${messageId}`)}`,
  ];

  for (const version of versions) {
    const when = version.editDate ? formatWhenSeconds(version.editDate) : formatWhen(version.storedAt);
    const content = version.text || version.caption || "";
    blocks.push(...withMeta(metaLine(`v${version.version}`, when), contentBlocks(content)));
  }

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

export default composer;
