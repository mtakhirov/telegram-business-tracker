/**
 * The Telegram Business connections the bot has been attached to.
 *
 * This table is the security boundary for incoming updates. A business message
 * names only its connection id, never its owner, so the owner is resolved here
 * and any connection that is not the owner's active one is ignored.
 *
 * The table starts empty, so an install upgraded from a version without it must
 * disconnect and reconnect once before messages are archived again.
 *
 * @example
 * ```ts
 * saveConnection({ id, userId: conn.user.id, isEnabled: conn.is_enabled });
 *
 * isOwnerConnection(id);     // false for anyone but OWNER_ID
 * getOwnerConnectionId();    // the active connection, if any
 * ```
 */

import { and, desc, eq } from "drizzle-orm";
import { OWNER_ID } from "../../shared/config/index.js";
import { db } from "../../shared/db/client.js";
import { businessConnections } from "../../shared/db/schema.js";

export interface StoredConnection {
  id: string;
  userId: number;
  isEnabled: boolean;
}

export function getConnection(id: string): StoredConnection | undefined {
  const row = db.select().from(businessConnections).where(eq(businessConnections.id, id)).get();
  return row ? { id: row.id, userId: row.userId, isEnabled: row.isEnabled } : undefined;
}

export function saveConnection(conn: StoredConnection): void {
  const updatedAt = Date.now();
  db.insert(businessConnections)
    .values({ id: conn.id, userId: conn.userId, isEnabled: conn.isEnabled, updatedAt })
    .onConflictDoUpdate({
      target: businessConnections.id,
      set: { userId: conn.userId, isEnabled: conn.isEnabled, updatedAt },
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
