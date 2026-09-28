/**
 * A local health endpoint for process supervisors.
 *
 * Serves `GET /health` on the loopback interface only, which is all a Docker
 * `HEALTHCHECK` needs because it runs inside the container. Nothing is exposed
 * to the network, and setting `HEALTH_PORT=0` turns the server off entirely.
 *
 * The body reports uptime and the archive size, so a check can tell a process
 * that is merely alive from one that can still reach its database.
 *
 * @example
 * ```sh
 * curl localhost:3000/health
 * # {"status":"ok","uptimeSeconds":41,"messages":1437}
 * ```
 */

import { getStoreSize } from "../entities/message/repository.js";
import { HEALTH_PORT } from "../shared/config/index.js";
import { log } from "../shared/lib/logger.js";

const startedAt = Date.now();

export function startHealthServer(): { stop: () => void } | undefined {
  if (HEALTH_PORT === 0) return undefined;

  const server = Bun.serve({
    port: HEALTH_PORT,
    hostname: "127.0.0.1",
    fetch(request) {
      if (new URL(request.url).pathname !== "/health") {
        return new Response("not found", { status: 404 });
      }

      try {
        return Response.json({
          status: "ok",
          uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
          messages: getStoreSize(),
        });
      } catch (error) {
        log.error({ err: error instanceof Error ? error.message : error }, "health check failed");
        return Response.json({ status: "error" }, { status: 503 });
      }
    },
  });

  log.info({ port: HEALTH_PORT }, "health endpoint listening");
  return server;
}
