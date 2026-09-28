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

export default composer;
