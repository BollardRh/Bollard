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
      maxDuration: 120,
      regions: ["fra1"], // next to the Supabase database (eu-central-1)
    },
    null,
    2,
  ),
);

// Security headers for every response. The site uses inline scripts and styles (scrolltide pages), so
// script-src keeps 'unsafe-inline'; everything else is limited to this origin, Google Fonts and the chain RPC
// the wallet bundle reads from.
const RPC_ORIGIN = new URL(process.env.RHC_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com").origin;
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  `connect-src 'self' ${RPC_ORIGIN}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "^/(.*)$", headers: SECURITY_HEADERS, continue: true },
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
