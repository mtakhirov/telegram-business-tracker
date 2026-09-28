import { Composer } from "grammy";
import businessConnection from "./business-connection.js";
import businessMessage from "./business-message.js";
import editedBusinessMessage from "./edited-business-message.js";
import deletedBusinessMessages from "./deleted-business-messages.js";
import notificationToggle from "./notification-toggle.js";

const composer = new Composer();
composer.use(businessConnection);
composer.use(businessMessage);
composer.use(editedBusinessMessage);
composer.use(deletedBusinessMessages);
composer.use(notificationToggle);

/**
 * Update types the bot subscribes to, kept next to the handlers that consume
 * them: an update type missing here is never delivered by Telegram, so its
 * handler silently never runs. Add one whenever a handler is added.
 *
 * - `message` feeds the command handlers in ../commands
 * - `callback_query` feeds notificationToggle
 */
export const ALLOWED_UPDATES = [
  "message",
  "callback_query",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
] as const;

export default composer;
