/**
 * Reacting to the bot being connected to or disconnected from a business account.
 *
 * This is the gate for the whole archive: a connection from anyone other than
 * `OWNER_ID` is refused, nothing about it is stored, and the attempt is
 * reported with the stranger's user id so it can be acted on. Disconnecting
 * purges everything recorded under that connection.
 *
 * The owner check reads the `business_connections` table, which starts empty,
 * so an install that upgraded from an earlier version must disconnect and
 * reconnect once before messages are archived again.
 */

import { Composer } from "grammy";
import { ADMIN_CHAT_ID, OWNER_ID } from "../core/config.js";
import { getUserDisplayName } from "../utils/format.js";
import { eventHeader, metaLine, userLink } from "../utils/notify-format.js";
import { saveConnection, deleteMessagesByConnection } from "../store/message-store.js";

const composer = new Composer();

composer.on("business_connection", async (ctx) => {
  const conn = ctx.businessConnection!;

  if (conn.user.id !== OWNER_ID) {
    await ctx.api.sendMessage(
      ADMIN_CHAT_ID,
      `${eventHeader("🚫", "Ruxsatsiz ulanish urinishi")}\n` +
        `${metaLine(userLink(conn.user, getUserDisplayName(conn.user)), `user ${conn.user.id}`)}\n\n` +
        `Hech narsa saqlanmadi.`,
      { parse_mode: "HTML" },
    );
    return;
  }

  saveConnection({ id: conn.id, userId: conn.user.id, isEnabled: conn.is_enabled });

  if (conn.is_enabled) {
    await ctx.api.sendMessage(ADMIN_CHAT_ID, eventHeader("🔗", "Ulandi"), { parse_mode: "HTML" });
    return;
  }

  const removed = deleteMessagesByConnection(conn.id);
  await ctx.api.sendMessage(ADMIN_CHAT_ID, `${eventHeader("🔗", "Uzildi")} — ${removed} yozuv o'chirildi`, {
    parse_mode: "HTML",
  });
});

export default composer;
