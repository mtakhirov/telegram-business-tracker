import { Composer } from "grammy";
import start from "./start/index.js";
import stats from "./stats/index.js";
import chats from "./chats/index.js";

const composer = new Composer();
composer.use(start);
composer.use(stats);
composer.use(chats);

export default composer;
