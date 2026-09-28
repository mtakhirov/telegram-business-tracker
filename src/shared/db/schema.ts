/**
 * The archive schema, declared once and shared by the queries and the migrations.
 *
 * `messages` holds the latest state of each archived message; because a row is
 * overwritten in place on every edit, `messageVersions` keeps the append-only
 * chain that would otherwise be lost. `chats` records id, title and last-seen
 * time for every chat the bot observes — metadata only, never content — so
 * `/chats` can offer chats that are not archived yet. `chatRules` stores the
 * per-chat archiving decisions, and `notificationDetails` keeps both renderings
 * of a sent notification so its expand button still works after the message row
 * itself has been purged.
 *
 * Chat id and connection id are duplicated onto `messageVersions` and
 * `notificationDetails` so that every delete path — one message, one chat, one
 * connection, or retention — can reach all of the rows that hold content.
 *
 * @example Generating and applying a migration
 * ```sh
 * bun run db:generate   # writes SQL to drizzle/
 * bun run db:migrate    # applies it to DB_PATH
 * ```
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable(
  "messages",
  {
    key: text("key").primaryKey(),
    messageId: integer("message_id").notNull(),
    chatId: integer("chat_id").notNull(),
    businessConnectionId: text("business_connection_id").notNull(),
    fromJson: text("from_json"),
    date: integer("date").notNull(),
    text: text("text"),
    caption: text("caption"),
    photo: text("photo"),
    video: text("video"),
    document: text("document"),
    sticker: text("sticker"),
    voice: text("voice"),
    audio: text("audio"),
    animation: text("animation"),
    storedAt: integer("stored_at").notNull(),
  },
  (table) => [
    index("idx_messages_stored_at").on(table.storedAt),
    index("idx_messages_connection").on(table.businessConnectionId),
    index("idx_messages_chat").on(table.chatId, table.date),
  ],
);

export const messageVersions = sqliteTable(
  "message_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    chatId: integer("chat_id").notNull(),
    businessConnectionId: text("business_connection_id").notNull(),
    version: integer("version").notNull(),
    text: text("text"),
    caption: text("caption"),
    editDate: integer("edit_date"),
    storedAt: integer("stored_at").notNull(),
  },
  (table) => [
    index("idx_versions_key").on(table.key, table.version),
    index("idx_versions_stored_at").on(table.storedAt),
    index("idx_versions_chat").on(table.chatId),
    index("idx_versions_connection").on(table.businessConnectionId),
  ],
);

export const chats = sqliteTable("chats", {
  chatId: integer("chat_id").primaryKey(),
  title: text("title"),
  lastSeen: integer("last_seen").notNull(),
});

export const chatRules = sqliteTable("chat_rules", {
  chatId: integer("chat_id").primaryKey(),
  mode: text("mode", { enum: ["allow", "deny"] }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const businessConnections = sqliteTable("business_connections", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const notificationDetails = sqliteTable(
  "notification_details",
  {
    token: text("token").primaryKey(),
    chatId: integer("chat_id").notNull(),
    compact: text("compact").notNull(),
    expanded: text("expanded").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_details_created").on(table.createdAt), index("idx_details_chat").on(table.chatId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
