import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import { createApp } from "./app.ts";
import { createDepsFromEnv } from "./context.ts";

/**
 * Local server: the API plus the static site with clean URLs, like the Vercel deployment.
 *   bun src/api/server.ts            (reads env; PORT defaults to 8787)
 */
const DIST = new URL("../../../dist/", import.meta.url).pathname;
const app = createApp(createDepsFromEnv());

function staticFile(pathname: string): string | null {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  for (const p of [clean, `${clean}.html`, join(clean, "index.html")]) {
    const f = join(DIST, p);
    if (f.startsWith(DIST) && existsSync(f) && !f.endsWith("/")) return f;
  }
  return null;
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 8787),
  async fetch(req) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith("/api/") || pathname.startsWith("/v1/")) return app.fetch(req);
    const f = staticFile(pathname === "/" ? "/index.html" : pathname);
    return f ? new Response(Bun.file(f)) : new Response("not found", { status: 404 });
  },
});
console.log(`Bollard API + site on http://localhost:${server.port}`);
