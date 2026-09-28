/**
 * The `/help` reply, rendered from the shared command list.
 */

import { Composer } from "grammy";
import { OWNER_ID } from "../../shared/config/index.js";
import { escapeHtml } from "../../shared/lib/format.js";
import { sendBlocks } from "../../shared/telegram/limits.js";
import { COMMANDS } from "../../shared/telegram/command-list.js";

const composer = new Composer();

composer.command("help", async (ctx) => {
  if (ctx.from?.id !== OWNER_ID) return;

  const lines = COMMANDS.map((spec) => {
    const args = spec.args ? ` ${escapeHtml(spec.args)}` : "";
    return `/${spec.command}${args} — ${spec.description}`;
  });

  await sendBlocks(ctx.api, ctx.chat.id, [`<b>Buyruqlar</b>`, lines.join("\n")]);
});

export default composer;
