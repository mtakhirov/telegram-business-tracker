import { Composer } from "grammy";
import start from "./start/index.js";
import stats from "./stats/index.js";
import chats from "./chats/index.js";
import versions from "./versions/index.js";
import search from "./search/index.js";

const composer = new Composer();
composer.use(start);
composer.use(stats);
composer.use(chats);
composer.use(versions);
composer.use(search);

export default composer;
