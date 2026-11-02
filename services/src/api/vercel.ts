import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { createApp } from "./app.ts";
import { createDepsFromEnv } from "./context.ts";

/**
 * Vercel function entry (Node runtime). The build bundles this file to index.mjs and copies the corpus next
 * to it, so the corpus path is resolved from the bundle's own location. Deps are built once per instance.
 */
process.env.BOLLARD_CORPUS_DIR ??= fileURLToPath(new URL("./corpus/public/", import.meta.url));

let listener: ReturnType<typeof getRequestListener> | undefined;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  listener ??= getRequestListener(createApp(createDepsFromEnv()).fetch);
  return listener(req, res);
}
