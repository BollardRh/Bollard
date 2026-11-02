/**
 * Builds the Vercel deployment with the Build Output API (v3):
 *   .vercel/output/static/              the website (dist/)
 *   .vercel/output/functions/api.func/  the whole API as one Node function (bundled), plus the corpus
 *   .vercel/output/config.json          routes: /api/* and /v1/* -> the function; clean URLs for the site
 *
 *   bun services/scripts/vercel-build.ts      (Vercel runs this as the build command)
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname;
const OUT = `${ROOT}.vercel/output`;
const FUNC = `${OUT}/functions/api.func`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(FUNC, { recursive: true });

// static site
cpSync(`${ROOT}dist`, `${OUT}/static`, { recursive: true });

// API function
const result = await Bun.build({
  entrypoints: [`${ROOT}services/src/api/vercel.ts`],
  target: "node",
  format: "esm",
  outdir: FUNC,
  naming: "index.mjs",
  minify: false,
  sourcemap: "none",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
cpSync(`${ROOT}services/corpus/public`, `${FUNC}/corpus/public`, { recursive: true });
writeFileSync(`${FUNC}/package.json`, JSON.stringify({ type: "module" }));
writeFileSync(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 60,
      regions: ["fra1"], // next to the Supabase database (eu-central-1)
    },
    null,
    2,
  ),
);

writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/api/(.*)$", dest: "/api" },
        { src: "^/v1/(.*)$", dest: "/api" },
        { handle: "filesystem" },
        { src: "^/(.+?)/?$", dest: "/$1.html", check: true },
      ],
    },
    null,
    2,
  ),
);
console.log(`built ${OUT}`);
