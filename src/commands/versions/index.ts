import { Composer } from "grammy";
import { OWNER_ID } from "../../core/config.js";
import { getOwnerConnectionId, getVersions } from "../../store/message-store.js";
import { formatDate, formatDateTime } from "../../utils/format.js";
import { quote, sendBlocks } from "../../utils/telegram-limits.js";

const composer = new Composer();

composer.command("versions", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const parts = ctx.match.trim().split(/\s+/).filter(Boolean);
  if (parts.length !== 2 || !/^-?\d+$/.test(parts[0]!) || !/^\d+$/.test(parts[1]!)) {
    await ctx.reply(
      "Ishlatilishi: <code>/versions &lt;chat_id&gt; &lt;message_id&gt;</code>\n\n" +
        "Chat ID'ni <code>/chats</code> dan oling.",
      { parse_mode: "HTML" },
    );
    return;
  }

  const chatId = Number(parts[0]);
  const messageId = Number(parts[1]);

  const connectionId = getOwnerConnectionId();
  if (!connectionId) {
    await ctx.reply("Faol business connection topilmadi.");
    return;
  }

  const versions = getVersions(connectionId, chatId, messageId);
  if (versions.length === 0) {
    await ctx.reply("Bu xabar uchun saqlangan versiya yo'q.");
    return;
  }

  const blocks: string[] = [
    `🕓 <b>Tahrir tarixi</b>\n\n` +
      `💬 Chat: <code>${chatId}</code>\n` +
      `🆔 Message: <code>${messageId}</code>\n` +
      `📊 Versiyalar: ${versions.length}`,
  ];

  for (const version of versions) {
    const when = version.editDate ? formatDate(version.editDate) : formatDateTime(version.storedAt);
    const label = version.version === 1 ? "asl" : `tahrir ${version.version - 1}`;
    const content = version.text || version.caption || "";

    blocks.push(`<b>v${version.version}</b> (${label}) — ${when}`);
    blocks.push(...(content ? quote(content) : [`<i>matn yo'q (media)</i>`]));
  }

  await sendBlocks(ctx.api, ctx.chat.id, blocks);
});

export default composer;
