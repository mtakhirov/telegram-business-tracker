/**
 * The two renderings of a sent notification, kept so its button still works.
 *
 * A notification goes out collapsed and can be expanded in place later, which
 * means the expanded text has to outlive the message row it describes — a
 * deleted message is purged from the archive as soon as its notification is
 * delivered.
 *
 * These rows therefore duplicate content the archive no longer holds, so they
 * carry a shorter lifetime of their own and are dropped with their chat.
 *
 * @example
 * ```ts
 * const token = saveNotificationDetails(chatId, { compact, expanded });
 * // callback_data: `nd:x:${token}`
 *
 * getNotificationDetails(token); // { compact, expanded }
 * cleanupNotificationDetails(7 * 24 * 60 * 60 * 1000);
 * ```
 */

import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../../shared/db/client.js";
import { notificationDetails } from "../../shared/db/schema.js";

export interface NotificationDetails {
  compact: string;
  expanded: string;
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

export function deleteNotificationDetailsByChat(chatId: number): number {
  return db
    .delete(notificationDetails)
    .where(eq(notificationDetails.chatId, chatId))
    .returning({ token: notificationDetails.token })
    .all().length;
}

export function cleanupNotificationDetails(ttlMs: number): number {
  return db
    .delete(notificationDetails)
    .where(lt(notificationDetails.createdAt, Date.now() - ttlMs))
    .returning({ token: notificationDetails.token })
    .all().length;
}
