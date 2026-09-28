/**
 * The command surface, in one place.
 *
 * `/help` renders this list, and it is registered with Telegram through
 * `setMyCommands` so the in-app menu matches. Adding a command means adding it
 * here as well, or it will work but stay invisible.
 *
 * @example
 * ```ts
 * { command: "track", description: "Chatni arxivlash", args: "<chat_id>" }
 * // /help shows:  /track <chat_id> — Chatni arxivlash
 * ```
 */

export interface CommandSpec {
  command: string;
  description: string;
  args?: string;
}

export const COMMANDS: CommandSpec[] = [
  { command: "start", description: "Bot haqida ma'lumot" },
  { command: "help", description: "Buyruqlar ro'yxati" },
  { command: "stats", description: "Arxiv statistikasi" },
  { command: "chats", description: "Ma'lum chatlar va arxivlash qoidalari" },
  { command: "track", description: "Chatni arxivlash", args: "<chat_id>" },
  { command: "untrack", description: "Chatni arxivlamaslik", args: "<chat_id>" },
  { command: "untrack_reset", description: "Chat qoidasini default'ga qaytarish", args: "<chat_id>" },
  { command: "forget", description: "Chatning saqlangan xabarlarini o'chirish", args: "<chat_id>" },
  { command: "search", description: "Arxivdan qidirish", args: "<so'z>" },
  { command: "history", description: "Chatning oxirgi xabarlari", args: "<chat_id> [limit]" },
  { command: "versions", description: "Xabarning tahrir tarixi", args: "<chat_id> <message_id>" },
  { command: "export", description: "Arxivni JSON fayl sifatida olish", args: "[chat_id]" },
];
