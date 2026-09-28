/**
 * Command composition.
 *
 * `/help` is registered first so it answers even if a later command throws
 * while being set up.
 */

import { Composer } from "grammy";
import chats from "../features/chat-rules/index.js";
import versions from "../features/message-versions/index.js";
import search from "../features/search-archive/index.js";
import exportCmd from "../features/export-archive/index.js";
import botInfo from "../features/bot-info/index.js";
import settings from "../features/settings/index.js";

const composer = new Composer();
composer.use(botInfo);
composer.use(chats);
composer.use(versions);
composer.use(search);
composer.use(exportCmd);
composer.use(settings);

export default composer;
