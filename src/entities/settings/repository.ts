/**
 * Settings that can be changed at runtime, overriding the environment.
 *
 * The environment stays the source of defaults, so a fresh install behaves
 * exactly as `.env` describes. A row here shadows that default until it is
 * cleared, which lets the owner retune retention or the archiving default from
 * a chat instead of editing a file and restarting.
 *
 * Values are stored as text and parsed on read; anything unreadable falls back
 * to the environment rather than failing, so a hand-edited row cannot take the
 * bot down.
 *
 * @example
 * ```ts
 * getRetentionDays();            // RETENTION_DAYS from .env
 * setSetting("retentionDays", "7");
 * getRetentionDays();            // 7
 *
 * clearSetting("retentionDays");
 * getRetentionDays();            // back to .env
 * ```
 */

import { eq } from "drizzle-orm";
import { DEFAULT_TRACK_MODE, RETENTION_DAYS } from "../../shared/config/index.js";
import { db } from "../../shared/db/client.js";
import { settings } from "../../shared/db/schema.js";

export type SettingKey = "retentionDays" | "defaultTrackMode";
export type TrackMode = "allow" | "deny";

export interface SettingValue<T> {
  value: T;
  fromEnv: boolean;
}

function readRaw(key: SettingKey): string | undefined {
  return db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get()?.value;
}

export function setSetting(key: SettingKey, value: string): void {
  const updatedAt = Date.now();
  db.insert(settings)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } })
    .run();
}

export function clearSetting(key: SettingKey): void {
  db.delete(settings).where(eq(settings.key, key)).run();
}

export function getRetentionDays(): SettingValue<number> {
  const raw = readRaw("retentionDays");
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { value: RETENTION_DAYS, fromEnv: true };
  }
  return { value: parsed, fromEnv: false };
}

export function getDefaultTrackMode(): SettingValue<TrackMode> {
  const raw = readRaw("defaultTrackMode");
  if (raw !== "allow" && raw !== "deny") {
    return { value: DEFAULT_TRACK_MODE, fromEnv: true };
  }
  return { value: raw, fromEnv: false };
}
