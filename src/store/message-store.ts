import { Database } from "bun:sqlite";
import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import type { User } from "grammy/types";
import { DB_PATH, DEFAULT_TRACK_MODE, OWNER_ID } from "../core/config.js";

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

// The database holds other people's private messages: keep it readable by the bot user only.
process.umask(0o077);

const dbPath = path.resolve(DB_PATH);
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
}

const db = new Database(dbPath);

for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  try {
    if (fs.existsSync(file)) fs.chmodSync(file, 0o600);
  } catch {
    console.warn(`Could not restrict permissions of ${file}`);
  }
}

db.run("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    key TEXT PRIMARY KEY,
    message_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    business_connection_id TEXT NOT NULL,
    from_json TEXT,
    date INTEGER NOT NULL,
    text TEXT,
    caption TEXT,
    photo TEXT,
    video TEXT,
    document TEXT,
    sticker TEXT,
    voice TEXT,
    audio TEXT,
    animation TEXT,
    stored_at INTEGER NOT NULL
  )
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_messages_stored_at ON messages (stored_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages (business_connection_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, date)");

db.exec(`
  CREATE TABLE IF NOT EXISTS business_connections (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    is_enabled INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Metadata only (id, title, last seen) for every chat the bot observes, so
// /chats can offer them for tracking. No message content is kept here.
db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    chat_id   INTEGER PRIMARY KEY,
    title     TEXT,
    last_seen INTEGER NOT NULL
  )
`);

// Per-chat archiving decision. A chat with no row falls back to DEFAULT_TRACK_MODE.
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_rules (
    chat_id    INTEGER PRIMARY KEY,
    mode       TEXT NOT NULL CHECK (mode IN ('allow', 'deny')),
    updated_at INTEGER NOT NULL
  )
`);

// Append-only edit chain. `messages` keeps only the latest state, so every
// intermediate version lives here. chat_id and business_connection_id are
// duplicated so retention and every delete path can reach these rows.
db.exec(`
  CREATE TABLE IF NOT EXISTS message_versions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    key                    TEXT NOT NULL,
    chat_id                INTEGER NOT NULL,
    business_connection_id TEXT NOT NULL,
    version                INTEGER NOT NULL,
    text                   TEXT,
    caption                TEXT,
    edit_date              INTEGER,
    stored_at              INTEGER NOT NULL
  )
`);
// Collapsed and expanded text of a sent notification, so the "Batafsil" button
// can toggle it later. Kept on its own short TTL because a deleted message's
// row is purged from `messages` as soon as the notification is delivered.
db.exec(`
  CREATE TABLE IF NOT EXISTS notification_details (
    token      TEXT PRIMARY KEY,
    chat_id    INTEGER NOT NULL,
    compact    TEXT NOT NULL,
    expanded   TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_details_created ON notification_details (created_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_details_chat ON notification_details (chat_id)");

db.exec("CREATE INDEX IF NOT EXISTS idx_versions_key ON message_versions (key, version)");
db.exec("CREATE INDEX IF NOT EXISTS idx_versions_stored_at ON message_versions (stored_at)");
db.exec("CREATE INDEX IF NOT EXISTS idx_versions_chat ON message_versions (chat_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_versions_connection ON message_versions (business_connection_id)");

const stmtGet = db.prepare("SELECT * FROM messages WHERE key = ?");
const stmtInsert = db.prepare(`
  INSERT OR REPLACE INTO messages (key, message_id, chat_id, business_connection_id, from_json, date, text, caption, photo, video, document, sticker, voice, audio, animation, stored_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtDelete = db.prepare("DELETE FROM messages WHERE key = ?");
const stmtDeleteByConnection = db.prepare("DELETE FROM messages WHERE business_connection_id = ?");
const stmtCount = db.prepare("SELECT COUNT(*) as count FROM messages");
const stmtCleanup = db.prepare("DELETE FROM messages WHERE stored_at < ?");

const stmtGetConnection = db.prepare("SELECT * FROM business_connections WHERE id = ?");
const stmtOwnerConnection = db.prepare(
  "SELECT id FROM business_connections WHERE user_id = ? AND is_enabled = 1 ORDER BY updated_at DESC LIMIT 1",
);
const stmtUpsertConnection = db.prepare(`
  INSERT OR REPLACE INTO business_connections (id, user_id, is_enabled, updated_at)
  VALUES (?, ?, ?, ?)
`);

const stmtTouchChat = db.prepare(`
  INSERT INTO chats (chat_id, title, last_seen) VALUES (?, ?, ?)
  ON CONFLICT (chat_id) DO UPDATE SET title = excluded.title, last_seen = excluded.last_seen
`);
const stmtListChats = db.prepare(`
  SELECT c.chat_id, c.title, c.last_seen, r.mode
  FROM chats c LEFT JOIN chat_rules r ON r.chat_id = c.chat_id
  ORDER BY c.last_seen DESC
`);
const stmtGetChatRule = db.prepare("SELECT mode FROM chat_rules WHERE chat_id = ?");
const stmtSetChatRule = db.prepare(`
  INSERT INTO chat_rules (chat_id, mode, updated_at) VALUES (?, ?, ?)
  ON CONFLICT (chat_id) DO UPDATE SET mode = excluded.mode, updated_at = excluded.updated_at
`);
const stmtDeleteChatRule = db.prepare("DELETE FROM chat_rules WHERE chat_id = ?");
const stmtDeleteMessagesByChat = db.prepare("DELETE FROM messages WHERE chat_id = ?");

const stmtSearch = db.prepare(`
  SELECT * FROM messages
  WHERE text LIKE ? ESCAPE '\\' OR caption LIKE ? ESCAPE '\\'
  ORDER BY date DESC LIMIT ?
`);
const stmtChatMessages = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY date DESC LIMIT ?");

const stmtExportAll = db.prepare("SELECT * FROM messages ORDER BY date ASC");
const stmtExportByChat = db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY date ASC");
const stmtExportVersionsAll = db.prepare("SELECT * FROM message_versions ORDER BY key, version ASC");
const stmtExportVersionsByChat = db.prepare(
  "SELECT * FROM message_versions WHERE chat_id = ? ORDER BY key, version ASC",
);

const stmtLatestVersion = db.prepare(
  "SELECT version, text, caption FROM message_versions WHERE key = ? ORDER BY version DESC LIMIT 1",
);
const stmtInsertVersion = db.prepare(`
  INSERT INTO message_versions (key, chat_id, business_connection_id, version, text, caption, edit_date, stored_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtListVersions = db.prepare(
  "SELECT version, text, caption, edit_date, stored_at FROM message_versions WHERE key = ? ORDER BY version ASC",
);
const stmtDeleteVersionsByKey = db.prepare("DELETE FROM message_versions WHERE key = ?");
const stmtDeleteVersionsByChat = db.prepare("DELETE FROM message_versions WHERE chat_id = ?");
const stmtDeleteVersionsByConnection = db.prepare(
  "DELETE FROM message_versions WHERE business_connection_id = ?",
);
const stmtCleanupVersions = db.prepare("DELETE FROM message_versions WHERE stored_at < ?");

const stmtInsertDetails = db.prepare(`
  INSERT INTO notification_details (token, chat_id, compact, expanded, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const stmtGetDetails = db.prepare("SELECT compact, expanded FROM notification_details WHERE token = ?");
const stmtDeleteDetailsByChat = db.prepare("DELETE FROM notification_details WHERE chat_id = ?");
const stmtCleanupDetails = db.prepare("DELETE FROM notification_details WHERE created_at < ?");

function getKey(businessConnectionId: string, chatId: number, messageId: number): string {
  return `${businessConnectionId}:${chatId}:${messageId}`;
}

function toJson(value: unknown): string | null {
  return value != null ? JSON.stringify(value) : null;
}

function rowToStoredMessage(row: Record<string, unknown>): StoredMessage {
  return {
    messageId: row.message_id as number,
    chatId: row.chat_id as number,
    businessConnectionId: row.business_connection_id as string,
    from: row.from_json ? JSON.parse(row.from_json as string) : undefined,
    date: row.date as number,
    text: (row.text as string) || null,
    caption: (row.caption as string) || null,
    photo: row.photo ? JSON.parse(row.photo as string) : null,
    video: row.video ? JSON.parse(row.video as string) : null,
    document: row.document ? JSON.parse(row.document as string) : null,
    sticker: row.sticker ? JSON.parse(row.sticker as string) : null,
    voice: row.voice ? JSON.parse(row.voice as string) : null,
    audio: row.audio ? JSON.parse(row.audio as string) : null,
    animation: row.animation ? JSON.parse(row.animation as string) : null,
    storedAt: new Date(row.stored_at as number),
  };
}

export function getMessage(
  businessConnectionId: string,
  chatId: number,
  messageId: number,
): StoredMessage | undefined {
  const row = stmtGet.get(getKey(businessConnectionId, chatId, messageId)) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToStoredMessage(row) : undefined;
}

/**
 * Appends a new row to the edit chain, unless the text and caption are
 * unchanged from the latest version.
 */
function appendVersion(
  key: string,
  businessConnectionId: string,
  chatId: number,
  message: IncomingMessage,
  now: number,
): void {
  const text = message.text || null;
  const caption = message.caption || null;
  const latest = stmtLatestVersion.get(key) as
    | { version: number; text: string | null; caption: string | null }
    | undefined;

  if (latest && latest.text === text && latest.caption === caption) return;

  stmtInsertVersion.run(
    key,
    chatId,
    businessConnectionId,
    (latest?.version ?? 0) + 1,
    text,
    caption,
    message.edit_date ?? null,
    now,
  );
}

export function storeMessage(businessConnectionId: string, chatId: number, message: IncomingMessage): void {
  const key = getKey(businessConnectionId, chatId, message.message_id);
  const now = Date.now();

  stmtInsert.run(
    key,
    message.message_id,
    chatId,
    businessConnectionId,
    toJson(message.from),
    message.date,
    message.text || null,
    message.caption || null,
    toJson(message.photo),
    toJson(message.video),
    toJson(message.document),
    toJson(message.sticker),
    toJson(message.voice),
    toJson(message.audio),
    toJson(message.animation),
    now,
  );

  appendVersion(key, businessConnectionId, chatId, message, now);
}

export function deleteMessage(businessConnectionId: string, chatId: number, messageId: number): void {
  const key = getKey(businessConnectionId, chatId, messageId);
  stmtDelete.run(key);
  stmtDeleteVersionsByKey.run(key);
}

export function deleteMessagesByConnection(businessConnectionId: string): number {
  stmtDeleteVersionsByConnection.run(businessConnectionId);
  return stmtDeleteByConnection.run(businessConnectionId).changes;
}

/** Deletes messages stored more than `retentionMs` ago. Returns the number of deleted rows. */
export function cleanupOldMessages(retentionMs: number): number {
  const cutoff = Date.now() - retentionMs;
  stmtCleanupVersions.run(cutoff);
  return stmtCleanup.run(cutoff).changes;
}

export function getStoreSize(): number {
  return (stmtCount.get() as { count: number }).count;
}

export function getConnection(id: string): StoredConnection | undefined {
  const row = stmtGetConnection.get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: row.id as string,
    userId: row.user_id as number,
    isEnabled: Boolean(row.is_enabled),
  };
}

export function saveConnection(conn: StoredConnection): void {
  stmtUpsertConnection.run(conn.id, conn.userId, conn.isEnabled ? 1 : 0, Date.now());
}

/** True only for a connection owned by OWNER_ID that is currently enabled. */
export function isOwnerConnection(id: string): boolean {
  const conn = getConnection(id);
  return !!conn && conn.userId === OWNER_ID && conn.isEnabled;
}

/** The owner's active business connection, if the bot is currently connected. */
export function getOwnerConnectionId(): string | undefined {
  const row = stmtOwnerConnection.get(OWNER_ID) as { id: string } | undefined;
  return row?.id;
}

export type TrackMode = "allow" | "deny";

export interface KnownChat {
  chatId: number;
  title: string | null;
  lastSeen: Date;
  mode: TrackMode | null;
}

/** Record that a chat exists, with its current title. Metadata only. */
export function touchChat(chatId: number, title: string | null): void {
  stmtTouchChat.run(chatId, title, Date.now());
}

/** Whether this chat should be archived, falling back to DEFAULT_TRACK_MODE. */
export function isChatTracked(chatId: number): boolean {
  const row = stmtGetChatRule.get(chatId) as { mode: TrackMode } | undefined;
  return (row?.mode ?? DEFAULT_TRACK_MODE) === "allow";
}

export function listChats(): KnownChat[] {
  const rows = stmtListChats.all() as Record<string, unknown>[];
  return rows.map((row) => ({
    chatId: row.chat_id as number,
    title: (row.title as string) || null,
    lastSeen: new Date(row.last_seen as number),
    mode: (row.mode as TrackMode) ?? null,
  }));
}

export function setChatRule(chatId: number, mode: TrackMode): void {
  stmtSetChatRule.run(chatId, mode, Date.now());
}

export function clearChatRule(chatId: number): void {
  stmtDeleteChatRule.run(chatId);
}

/** Drop every stored message for one chat. Returns the number of deleted rows. */
export function deleteMessagesByChat(chatId: number): number {
  stmtDeleteVersionsByChat.run(chatId);
  stmtDeleteDetailsByChat.run(chatId);
  return stmtDeleteMessagesByChat.run(chatId).changes;
}

export interface NotificationDetails {
  compact: string;
  expanded: string;
}

/**
 * Remembers both renderings of a notification and returns the token to put in
 * the button's callback data.
 */
export function saveNotificationDetails(chatId: number, details: NotificationDetails): string {
  const token = randomBytes(8).toString("hex");
  stmtInsertDetails.run(token, chatId, details.compact, details.expanded, Date.now());
  return token;
}

export function getNotificationDetails(token: string): NotificationDetails | undefined {
  const row = stmtGetDetails.get(token) as { compact: string; expanded: string } | undefined;
  return row ? { compact: row.compact, expanded: row.expanded } : undefined;
}

/** Deletes notification details older than `ttlMs`. Returns the deleted count. */
export function cleanupNotificationDetails(ttlMs: number): number {
  return stmtCleanupDetails.run(Date.now() - ttlMs).changes;
}

/** Escapes LIKE wildcards so a query is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Substring search over stored text and captions, newest first. */
export function searchMessages(query: string, limit: number): StoredMessage[] {
  const pattern = `%${escapeLike(query)}%`;
  const rows = stmtSearch.all(pattern, pattern, limit) as Record<string, unknown>[];
  return rows.map(rowToStoredMessage);
}

/** Most recent stored messages in one chat, newest first. */
export function listChatMessages(chatId: number, limit: number): StoredMessage[] {
  const rows = stmtChatMessages.all(chatId, limit) as Record<string, unknown>[];
  return rows.map(rowToStoredMessage);
}

export interface MessageVersion {
  version: number;
  text: string | null;
  caption: string | null;
  editDate: number | null;
  storedAt: Date;
}

function rowToMessageVersion(row: Record<string, unknown>): MessageVersion {
  return {
    version: row.version as number,
    text: (row.text as string) || null,
    caption: (row.caption as string) || null,
    editDate: (row.edit_date as number) ?? null,
    storedAt: new Date(row.stored_at as number),
  };
}

export interface ExportedMessage extends StoredMessage {
  versions: MessageVersion[];
}

/** Every stored message with its edit chain attached, oldest first. */
export function exportMessages(chatId?: number): ExportedMessage[] {
  const messageRows = (chatId === undefined ? stmtExportAll.all() : stmtExportByChat.all(chatId)) as Record<
    string,
    unknown
  >[];
  const versionRows = (
    chatId === undefined ? stmtExportVersionsAll.all() : stmtExportVersionsByChat.all(chatId)
  ) as Record<string, unknown>[];

  const versionsByKey = new Map<string, MessageVersion[]>();
  for (const row of versionRows) {
    const key = row.key as string;
    const list = versionsByKey.get(key) ?? [];
    list.push(rowToMessageVersion(row));
    versionsByKey.set(key, list);
  }

  const exported: ExportedMessage[] = [];
  for (const row of messageRows) {
    const message = rowToStoredMessage(row);
    const key = getKey(message.businessConnectionId, message.chatId, message.messageId);
    exported.push(Object.assign(message, { versions: versionsByKey.get(key) ?? [] }));
  }
  return exported;
}

/** Full edit chain for one message, oldest version first. */
export function getVersions(
  businessConnectionId: string,
  chatId: number,
  messageId: number,
): MessageVersion[] {
  const rows = stmtListVersions.all(getKey(businessConnectionId, chatId, messageId)) as Record<
    string,
    unknown
  >[];
  return rows.map(rowToMessageVersion);
}

export function closeStore(): void {
  db.close();
}
