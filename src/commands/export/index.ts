import { Composer, InputFile } from "grammy";
import { BOT_NAME, OWNER_ID } from "../../core/config.js";
import { exportMessages } from "../../store/message-store.js";
import { getMediaInfo } from "../../utils/format.js";

const composer = new Composer();

// Bots may upload documents up to 50 MB; stay below it and ask for a narrower
// export instead of failing the API call.
const MAX_EXPORT_BYTES = 45 * 1024 * 1024;

composer.command("export", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const arg = ctx.match.trim();
  if (arg && !/^-?\d+$/.test(arg)) {
    await ctx.reply("Ishlatilishi: /export [chat_id]");
    return;
  }

  const chatId = arg ? Number(arg) : undefined;
  const messages = exportMessages(chatId);

  if (messages.length === 0) {
    await ctx.reply("Eksport qilishga ma'lumot yo'q.");
    return;
  }

  const payload = {
    botName: BOT_NAME,
    exportedAt: new Date().toISOString(),
    chatId: chatId ?? null,
    messageCount: messages.length,
    messages: messages.map((message) => {
      const media = getMediaInfo(message);
      return {
        chatId: message.chatId,
        messageId: message.messageId,
        date: new Date(message.date * 1000).toISOString(),
        storedAt: message.storedAt.toISOString(),
        from: message.from
          ? {
              id: message.from.id,
              firstName: message.from.first_name,
              lastName: message.from.last_name ?? null,
              username: message.from.username ?? null,
            }
          : null,
        text: message.text,
        caption: message.caption,
        media: media ? { type: media.type, fileId: media.fileId } : null,
        versions: message.versions.map((version) => ({
          version: version.version,
          text: version.text,
          caption: version.caption,
          editDate: version.editDate ? new Date(version.editDate * 1000).toISOString() : null,
          storedAt: version.storedAt.toISOString(),
        })),
      };
    }),
  };

  const json = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
  if (json.byteLength > MAX_EXPORT_BYTES) {
    const mb = (json.byteLength / 1024 / 1024).toFixed(1);
    await ctx.reply(`Eksport juda katta (${mb} MB) — bitta chatni eksport qiling: /export &lt;chat_id&gt;`, {
      parse_mode: "HTML",
    });
    return;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = chatId === undefined ? `export-${stamp}.json` : `export-${chatId}-${stamp}.json`;

  await ctx.replyWithDocument(new InputFile(json, name), {
    caption: `${messages.length} xabar eksport qilindi`,
  });
});

export default composer;
