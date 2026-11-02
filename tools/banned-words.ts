/**
 * CI gate for wording (backend doc §2 and §15): a rating is a dated test result for one version, never a
 * promise. Exits 1 and lists every hit.
 *
 *   bun tools/banned-words.ts
 *
 * Rules
 *   - Markdown: "safe", "safely", "safest" as whole words. The exact capitalised "Safe" is allowed because it
 *     is the multisig product name (Safe guard, Safe AllowanceModule).
 *   - Markdown, site HTML/JS and corpus JSON: certified, insured, guarantee(d/s), earn(s/ing/ed), passive income.
 *     A hit is allowed when a negation comes just before it ("not a guarantee", "cannot guarantee"), because
 *     disclaimers are the point.
 *   - Source code (.sol, .ts, .tsx, .jsx) is not scanned, so identifiers like SafeTransferLib are fine.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "lib", // vendored forge-std
  "out",
  "cache",
  "broadcast",
  "films", // earlier film production notes, not shipped
  "source-assets",
  "vendor",
  "scrolltide", // built bundle; its source is checked via scrolltide-src copy review
]);

const SAFE_WORD = /\b(safe(?:ly|st)?)\b/gi;
const CLAIM_WORDS = /\b(certified|insured|guarantee[ds]?|earn(?:s|ing|ed)?|passive income)\b/gi;
const NEGATION = /\b(not|no|never|cannot|can't|isn't|aren't|without|nor|neither)\b[^.!?]{0,40}$/i;

interface Hit {
  file: string;
  line: number;
  word: string;
  context: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else out.push(p);
  }
  return out;
}

function kind(file: string): "md" | "copy" | null {
  const rel = relative(ROOT, file);
  const ext = extname(file);
  if (ext === ".md") return "md";
  if (rel.startsWith("dist/") && (ext === ".html" || ext === ".js")) return "copy";
  if (rel.startsWith("services/corpus/") && ext === ".json") return "copy";
  return null;
}

function scan(file: string): Hit[] {
  const k = kind(file);
  if (!k) return [];
  const hits: Hit[] = [];
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((text, i) => {
    if (k === "md") {
      for (const m of text.matchAll(SAFE_WORD)) {
        if (m[1] === "Safe") continue; // product name
        hits.push({ file, line: i + 1, word: m[1]!, context: text.slice(Math.max(0, m.index! - 40), m.index! + 40) });
      }
    }
    for (const m of text.matchAll(CLAIM_WORDS)) {
      const before = text.slice(Math.max(0, m.index! - 60), m.index!);
      if (NEGATION.test(before)) continue;
      hits.push({ file, line: i + 1, word: m[1]!, context: text.slice(Math.max(0, m.index! - 40), m.index! + 40) });
    }
  });
  return hits;
}

const hits = walk(ROOT).flatMap(scan);
if (hits.length === 0) {
  console.log("banned-words: clean");
  process.exit(0);
}
for (const h of hits) console.log(`${relative(ROOT, h.file)}:${h.line}  "${h.word}"  …${h.context.trim()}…`);
console.log(`banned-words: ${hits.length} hit(s)`);
process.exit(1);
