/**
 * The archive: every query and retention rule the bot runs.
 *
 * Tables are declared in `./schema.ts`; this module is the only place that
 * reads or writes them, so the rest of the bot works with plain objects and
 * never with rows.
 *
 * Media and the sender are kept as JSON text because Telegram's shapes are
 * large, nested and only ever read back whole. Content columns that are
 * searched — `text` and `caption` — stay as real columns.
 *
 * Every delete path reaches all of the tables that hold content: removing one
 * message, one chat, one connection, or a retention sweep each drop the
 * matching edit chain, and a chat also drops its notification details.
 *
 * @example
 * ```ts
 * storeMessage(connectionId, chatId, message);
 * getVersions(connectionId, chatId, messageId); // [v1, v2, v3]
 *
 * cleanupOldMessages(30 * 24 * 60 * 60 * 1000);
 * ```
 */

import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import type { User } from "grammy/types";
import { DEFAULT_TRACK_MODE, OWNER_ID } from "../core/config.js";
import { closeDb, db } from "./db.js";
import {
  businessConnections,
  chatRules,
  chats,
  messageVersions,
  messages,
  notificationDetails,
} from "./schema.js";

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

interface IncomingMessage {
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

export interface StoredConnection {
  id: string;
  userId: number;
  isEnabled: boolean;
}

export type TrackMode = "allow" | "deny";

export interface KnownChat {
  chatId: number;
  title: string | null;
  lastSeen: Date;
  mode: TrackMode | null;
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

export interface NotificationDetails {
  compact: string;
  expanded: string;
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

  db.insert(messages)
    .values({
      key,
      messageId: message.message_id,
      chatId,
      businessConnectionId,
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
    })
    .onConflictDoUpdate({
      target: messages.key,
      set: {
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
      },
    })
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
  db.delete(notificationDetails).where(eq(notificationDetails.chatId, chatId)).run();
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

export function getConnection(id: string): StoredConnection | undefined {
  const row = db.select().from(businessConnections).where(eq(businessConnections.id, id)).get();
  return row ? { id: row.id, userId: row.userId, isEnabled: row.isEnabled } : undefined;
}

export function saveConnection(conn: StoredConnection): void {
  db.insert(businessConnections)
    .values({ id: conn.id, userId: conn.userId, isEnabled: conn.isEnabled, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: businessConnections.id,
      set: { userId: conn.userId, isEnabled: conn.isEnabled, updatedAt: Date.now() },
    })
    .run();
}

export function isOwnerConnection(id: string): boolean {
  const conn = getConnection(id);
  return !!conn && conn.userId === OWNER_ID && conn.isEnabled;
}

export function getOwnerConnectionId(): string | undefined {
  const row = db
    .select({ id: businessConnections.id })
    .from(businessConnections)
    .where(and(eq(businessConnections.userId, OWNER_ID), eq(businessConnections.isEnabled, true)))
    .orderBy(desc(businessConnections.updatedAt))
    .limit(1)
    .get();
  return row?.id;
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
    .select({
      chatId: chats.chatId,
      title: chats.title,
      lastSeen: chats.lastSeen,
      mode: chatRules.mode,
    })
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

export function saveNotificationDetails(chatId: number, details: NotificationDetails): string {
  const token = randomBytes(8).toString("hex");
  db.insert(notificationDetails)
    .values({ token, chatId, compact: details.compact, expanded: details.expanded, createdAt: Date.now() })
    .run();
  return token;
}

export function getNotificationDetails(token: string): NotificationDetails | undefined {
  const row = db
    .select({ compact: notificationDetails.compact, expanded: notificationDetails.expanded })
    .from(notificationDetails)
    .where(eq(notificationDetails.token, token))
    .get();
  return row ? { compact: row.compact, expanded: row.expanded } : undefined;
}

export function cleanupNotificationDetails(ttlMs: number): number {
  return db
    .delete(notificationDetails)
    .where(lt(notificationDetails.createdAt, Date.now() - ttlMs))
    .returning({ token: notificationDetails.token })
    .all().length;
}

export function closeStore(): void {
  closeDb();
}
