/**
 * Archived messages and their edit chains.
 *
 * `messages` holds the latest state of each message; because a row is
 * overwritten in place on every edit, `message_versions` keeps the append-only
 * chain that would otherwise be lost. A version is only appended when the text
 * or caption actually changed, so a repeated update does not inflate the chain.
 *
 * Media and the sender are stored as JSON text because Telegram's shapes are
 * large, nested and only ever read back whole. The columns that are searched —
 * `text` and `caption` — stay as real columns, and a search escapes LIKE
 * wildcards so a query for `%` matches a literal percent sign.
 *
 * Deleting a message always drops its versions with it. Deleting a whole chat
 * or connection does the same, which is why both ids are duplicated onto the
 * version rows.
 *
 * @example
 * ```ts
 * storeMessage(connectionId, chatId, message);
 * storeMessage(connectionId, chatId, { ...message, text: "edited" });
 *
 * getVersions(connectionId, chatId, message.message_id);
 * // [{ version: 1, text: "original" }, { version: 2, text: "edited" }]
 * ```
 */

import { asc, desc, eq, lt, sql } from "drizzle-orm";
import type { User } from "grammy/types";
import { db } from "../../shared/db/client.js";
import { messageVersions, messages } from "../../shared/db/schema.js";

export interface StoredMessage {
  messageId: number;
  chatId: number;
  businessConnectionId: string;
  from?: User;
  date: number;
  text: string | null;
  caption: string | null;
  photo: unknown[] | null;
  video: unknown | null;
  document: { file_name?: string } | null;
  sticker: { emoji?: string } | null;
  voice: unknown | null;
  audio: { title?: string } | null;
  animation: unknown | null;
  storedAt: Date;
}

export interface IncomingMessage {
  message_id: number;
  from?: User;
  date: number;
  edit_date?: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  video?: unknown;
  document?: unknown;
  sticker?: unknown;
  voice?: unknown;
  audio?: unknown;
  animation?: unknown;
}

export interface MessageVersion {
  version: number;
  text: string | null;
  caption: string | null;
  editDate: number | null;
  storedAt: Date;
}

export interface ExportedMessage extends StoredMessage {
  versions: MessageVersion[];
}

type MessageRow = typeof messages.$inferSelect;
type VersionRow = typeof messageVersions.$inferSelect;

function getKey(businessConnectionId: string, chatId: number, messageId: number): string {
  return `${businessConnectionId}:${chatId}:${messageId}`;
}

function toJson(value: unknown): string | null {
  return value == null ? null : JSON.stringify(value);
}

function fromJson<T>(value: string | null): T | null {
  return value ? (JSON.parse(value) as T) : null;
}

function toStoredMessage(row: MessageRow): StoredMessage {
  return {
    messageId: row.messageId,
    chatId: row.chatId,
    businessConnectionId: row.businessConnectionId,
    from: fromJson<User>(row.fromJson) ?? undefined,
    date: row.date,
    text: row.text,
    caption: row.caption,
    photo: fromJson<unknown[]>(row.photo),
    video: fromJson<unknown>(row.video),
    document: fromJson<{ file_name?: string }>(row.document),
    sticker: fromJson<{ emoji?: string }>(row.sticker),
    voice: fromJson<unknown>(row.voice),
    audio: fromJson<{ title?: string }>(row.audio),
    animation: fromJson<unknown>(row.animation),
    storedAt: new Date(row.storedAt),
  };
}

function toMessageVersion(row: VersionRow): MessageVersion {
  return {
    version: row.version,
    text: row.text,
    caption: row.caption,
    editDate: row.editDate,
    storedAt: new Date(row.storedAt),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function getMessage(
  businessConnectionId: string,
  chatId: number,
  messageId: number,
): StoredMessage | undefined {
  const row = db
    .select()
    .from(messages)
    .where(eq(messages.key, getKey(businessConnectionId, chatId, messageId)))
    .get();
  return row ? toStoredMessage(row) : undefined;
}

function appendVersion(
  key: string,
  businessConnectionId: string,
  chatId: number,
  message: IncomingMessage,
  now: number,
): void {
  const text = message.text || null;
  const caption = message.caption || null;

  const latest = db
    .select({
      version: messageVersions.version,
      text: messageVersions.text,
      caption: messageVersions.caption,
    })
    .from(messageVersions)
    .where(eq(messageVersions.key, key))
    .orderBy(desc(messageVersions.version))
    .limit(1)
    .get();

  if (latest && latest.text === text && latest.caption === caption) return;

  db.insert(messageVersions)
    .values({
      key,
      chatId,
      businessConnectionId,
      version: (latest?.version ?? 0) + 1,
      text,
      caption,
      editDate: message.edit_date ?? null,
      storedAt: now,
    })
    .run();
}

export function storeMessage(businessConnectionId: string, chatId: number, message: IncomingMessage): void {
  const key = getKey(businessConnectionId, chatId, message.message_id);
  const now = Date.now();

  const content = {
    fromJson: toJson(message.from),
    date: message.date,
    text: message.text || null,
    caption: message.caption || null,
    photo: toJson(message.photo),
    video: toJson(message.video),
    document: toJson(message.document),
    sticker: toJson(message.sticker),
    voice: toJson(message.voice),
    audio: toJson(message.audio),
    animation: toJson(message.animation),
    storedAt: now,
  };

  db.insert(messages)
    .values({ key, messageId: message.message_id, chatId, businessConnectionId, ...content })
    .onConflictDoUpdate({ target: messages.key, set: content })
    .run();

  appendVersion(key, businessConnectionId, chatId, message, now);
}

export function deleteMessage(businessConnectionId: string, chatId: number, messageId: number): void {
  const key = getKey(businessConnectionId, chatId, messageId);
  db.delete(messages).where(eq(messages.key, key)).run();
  db.delete(messageVersions).where(eq(messageVersions.key, key)).run();
}

export function deleteMessagesByConnection(businessConnectionId: string): number {
  db.delete(messageVersions).where(eq(messageVersions.businessConnectionId, businessConnectionId)).run();
  return db
    .delete(messages)
    .where(eq(messages.businessConnectionId, businessConnectionId))
    .returning({ key: messages.key })
    .all().length;
}

export function deleteMessagesByChat(chatId: number): number {
  db.delete(messageVersions).where(eq(messageVersions.chatId, chatId)).run();
  return db.delete(messages).where(eq(messages.chatId, chatId)).returning({ key: messages.key }).all().length;
}

export function cleanupOldMessages(retentionMs: number): number {
  const cutoff = Date.now() - retentionMs;
  db.delete(messageVersions).where(lt(messageVersions.storedAt, cutoff)).run();
  return db.delete(messages).where(lt(messages.storedAt, cutoff)).returning({ key: messages.key }).all()
    .length;
}

export function getStoreSize(): number {
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .get();
  return row?.count ?? 0;
}

export function searchMessages(query: string, limit: number): StoredMessage[] {
  const pattern = `%${escapeLike(query)}%`;
  return db
    .select()
    .from(messages)
    .where(
      sql`${messages.text} LIKE ${pattern} ESCAPE '\\' OR ${messages.caption} LIKE ${pattern} ESCAPE '\\'`,
    )
    .orderBy(desc(messages.date))
    .limit(limit)
    .all()
    .map(toStoredMessage);
}

export function listChatMessages(chatId: number, limit: number): StoredMessage[] {
  return db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(desc(messages.date))
    .limit(limit)
    .all()
    .map(toStoredMessage);
}

export function getVersions(
  businessConnectionId: string,
  chatId: number,
  messageId: number,
): MessageVersion[] {
  return db
    .select()
    .from(messageVersions)
    .where(eq(messageVersions.key, getKey(businessConnectionId, chatId, messageId)))
    .orderBy(asc(messageVersions.version))
    .all()
    .map(toMessageVersion);
}

export function exportMessages(chatId?: number): ExportedMessage[] {
  const messageRows =
    chatId === undefined
      ? db.select().from(messages).orderBy(asc(messages.date)).all()
      : db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(asc(messages.date)).all();

  const versionRows =
    chatId === undefined
      ? db
          .select()
          .from(messageVersions)
          .orderBy(asc(messageVersions.key), asc(messageVersions.version))
          .all()
      : db
          .select()
          .from(messageVersions)
          .where(eq(messageVersions.chatId, chatId))
          .orderBy(asc(messageVersions.key), asc(messageVersions.version))
          .all();

  const versionsByKey = new Map<string, MessageVersion[]>();
  for (const row of versionRows) {
    const list = versionsByKey.get(row.key) ?? [];
    list.push(toMessageVersion(row));
    versionsByKey.set(row.key, list);
  }

  const exported: ExportedMessage[] = [];
  for (const row of messageRows) {
    const message = toStoredMessage(row);
    const key = getKey(message.businessConnectionId, message.chatId, message.messageId);
    exported.push(Object.assign(message, { versions: versionsByKey.get(key) ?? [] }));
  }
  return exported;
}
