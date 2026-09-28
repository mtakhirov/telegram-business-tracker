/**
 * Handler composition and the update types the bot subscribes to.
 *
 * Telegram only delivers the update types named in `allowed_updates`, and it
 * reports nothing for the ones left out, so a handler for a missing type simply
 * never runs. `ALLOWED_UPDATES` therefore lives beside the handlers that
 * consume it, and a test asserts the two stay in step.
 *
 * `message` feeds the command handlers, and `callback_query` feeds the
 * notification expand button.
 *
 * @example
 * ```ts
 * import handlers, { ALLOWED_UPDATES } from "./handlers/index.js";
 *
 * bot.use(handlers);
 * bot.start({ allowed_updates: [...ALLOWED_UPDATES] });
 * ```
 */

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

export const ALLOWED_UPDATES = [
  "message",
  "callback_query",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
] as const;

export default composer;
