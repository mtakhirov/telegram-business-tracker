/**
 * Known chats and the per-chat archiving decision.
 *
 * Every chat the bot observes is recorded here as metadata only — id, title and
 * when it was last seen — so `/chats` can offer a chat that is not archived
 * yet. No message content is stored.
 *
 * A chat with no rule falls back to `DEFAULT_TRACK_MODE`, which makes the
 * archive opt-in when that is set to `deny`.
 *
 * @example
 * ```ts
 * touchChat(chatId, "Ali Valiev");
 * isChatTracked(chatId); // DEFAULT_TRACK_MODE
 *
 * setChatRule(chatId, "deny");
 * isChatTracked(chatId); // false
 *
 * clearChatRule(chatId);
 * isChatTracked(chatId); // DEFAULT_TRACK_MODE again
 * ```
 */

import { desc, eq } from "drizzle-orm";
import { DEFAULT_TRACK_MODE } from "../../shared/config/index.js";
import { db } from "../../shared/db/client.js";
import { chatRules, chats } from "../../shared/db/schema.js";

export type TrackMode = "allow" | "deny";

export interface KnownChat {
  chatId: number;
  title: string | null;
  lastSeen: Date;
  mode: TrackMode | null;
}

export function touchChat(chatId: number, title: string | null): void {
  const lastSeen = Date.now();
  db.insert(chats)
    .values({ chatId, title, lastSeen })
    .onConflictDoUpdate({ target: chats.chatId, set: { title, lastSeen } })
    .run();
}

export function isChatTracked(chatId: number): boolean {
  const row = db.select({ mode: chatRules.mode }).from(chatRules).where(eq(chatRules.chatId, chatId)).get();
  return (row?.mode ?? DEFAULT_TRACK_MODE) === "allow";
}

export function listChats(): KnownChat[] {
  return db
    .select({ chatId: chats.chatId, title: chats.title, lastSeen: chats.lastSeen, mode: chatRules.mode })
    .from(chats)
    .leftJoin(chatRules, eq(chatRules.chatId, chats.chatId))
    .orderBy(desc(chats.lastSeen))
    .all()
    .map((row) => ({
      chatId: row.chatId,
      title: row.title,
      lastSeen: new Date(row.lastSeen),
      mode: row.mode,
    }));
}

export function setChatRule(chatId: number, mode: TrackMode): void {
  const updatedAt = Date.now();
  db.insert(chatRules)
    .values({ chatId, mode, updatedAt })
    .onConflictDoUpdate({ target: chatRules.chatId, set: { mode, updatedAt } })
    .run();
}

export function clearChatRule(chatId: number): void {
  db.delete(chatRules).where(eq(chatRules.chatId, chatId)).run();
}
