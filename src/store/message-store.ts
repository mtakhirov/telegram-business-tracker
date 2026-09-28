import { Database } from "bun:sqlite";
import path from "node:path";
import fs from "node:fs";
import type { User } from "grammy/types";

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

const dbDir = path.resolve("data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
}

const dbPath = path.join(dbDir, "messages.db");
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

db.exec(`
  CREATE TABLE IF NOT EXISTS business_connections (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    is_enabled INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

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
const stmtUpsertConnection = db.prepare(`
  INSERT OR REPLACE INTO business_connections (id, user_id, is_enabled, updated_at)
  VALUES (?, ?, ?, ?)
`);

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

export function getMessage(businessConnectionId: string, chatId: number, messageId: number): StoredMessage | undefined {
  const row = stmtGet.get(getKey(businessConnectionId, chatId, messageId)) as Record<string, unknown> | undefined;
  return row ? rowToStoredMessage(row) : undefined;
}

export function storeMessage(businessConnectionId: string, chatId: number, message: IncomingMessage): void {
  stmtInsert.run(
    getKey(businessConnectionId, chatId, message.message_id),
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
    Date.now(),
  );
}

export function deleteMessage(businessConnectionId: string, chatId: number, messageId: number): void {
  stmtDelete.run(getKey(businessConnectionId, chatId, messageId));
}

export function deleteMessagesByConnection(businessConnectionId: string): number {
  return stmtDeleteByConnection.run(businessConnectionId).changes;
}

/** Deletes messages stored more than `retentionMs` ago. Returns the number of deleted rows. */
export function cleanupOldMessages(retentionMs: number): number {
  return stmtCleanup.run(Date.now() - retentionMs).changes;
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

export function closeStore(): void {
  db.close();
}
