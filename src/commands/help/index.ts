/**
 * The `/help` reply, rendered from the shared command list.
 */

import { Composer } from "grammy";
import { OWNER_ID } from "../../core/config.js";
import { escapeHtml } from "../../utils/format.js";
import { sendBlocks } from "../../utils/telegram-limits.js";
import { COMMANDS } from "../list.js";

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
