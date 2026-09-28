import { Composer } from "grammy";
import businessConnection from "./business-connection.js";
import businessMessage from "./business-message.js";
import editedBusinessMessage from "./edited-business-message.js";
import deletedBusinessMessages from "./deleted-business-messages.js";

const composer = new Composer();
composer.use(businessConnection);
composer.use(businessMessage);
composer.use(editedBusinessMessage);
composer.use(deletedBusinessMessages);

export default composer;
