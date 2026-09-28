/**
 * The bot's own information commands: `/start`, `/help` and `/stats`.
 */

import { Composer } from "grammy";
import help from "./help.js";
import start from "./start.js";
import stats from "./stats.js";

const composer = new Composer();
composer.use(help);
composer.use(start);
composer.use(stats);

export default composer;
