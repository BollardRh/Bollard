/**
 * Bundles the dashboard's wallet helpers (services/src/web/wallet.ts) into dist/assets/wallet/wallet.mjs.
 * The output is committed with the site, so the static site needs no build step to serve it.
 *   bun services/scripts/build-wallet.ts
 */
const ROOT = new URL("../../", import.meta.url).pathname;
const result = await Bun.build({
  entrypoints: [`${ROOT}services/src/web/wallet.ts`],
  target: "browser",
  format: "esm",
  outdir: `${ROOT}dist/assets/wallet`,
  naming: "wallet.mjs",
  minify: true,
  sourcemap: "none",
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const size = (await Bun.file(`${ROOT}dist/assets/wallet/wallet.mjs`).arrayBuffer()).byteLength;
console.log(`wrote dist/assets/wallet/wallet.mjs (${Math.round(size / 1024)} KB)`);
