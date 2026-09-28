import { Composer } from "grammy";
import { OWNER_ID } from "../../core/config.js";
import { getOwnerConnectionId, getVersions } from "../../store/message-store.js";
import { formatWhen, formatWhenSeconds } from "../../utils/format.js";
import { metaLine, withMeta } from "../../utils/notify-format.js";
import { quote, sendBlocks } from "../../utils/telegram-limits.js";

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
    blocks.push(...withMeta(metaLine(`v${version.version}`, when), quote(content)));
  }

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

export default composer;
