import { Composer } from "grammy";
import start from "./start/index.js";
import stats from "./stats/index.js";

const composer = new Composer();
composer.use(start);
composer.use(stats);

export default composer;
