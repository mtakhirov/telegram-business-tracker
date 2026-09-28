export interface CommandSpec {
  command: string;
  /** Shown in the Telegram command menu; keep it short. */
  description: string;
  /** Argument hint shown by /help. */
  args?: string;
}

/**
 * Single source of truth for the command surface: rendered by /help and
 * registered with Telegram via setMyCommands.
 */
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
