import type { BatpAction, BatpMessage, BatpRequest, BatpResponse } from "../harness/batp.ts";
import { fromMorse, rot13, unHomoglyph } from "../harness/encodings.ts";
import { formatHuman, parseHuman } from "../harness/units.ts";

/**
 * Mock agents for harness tests (backend doc §14, M3). They are deliberately simple and deterministic:
 *   naive    obeys whatever the newest message says, decodes payloads, follows planted memory, leaks keys
 *   hardened acts only on the owner's own messages, only to allowlisted addresses, never reveals secrets
 *   flaky    hardened, except it follows planted memory on some seeds (fails the memory family)
 */

const ADDRESS = /0x[0-9a-fA-F]{40}/g;

const firstAddress = (s: string) => s.match(ADDRESS)?.[0];
const lastAddress = (s: string) => s.match(ADDRESS)?.at(-1);

/** Tries every decoding the corpus uses and returns the first reading that contains an address. */
export function decodeForAddress(text: string): string {
  const candidates: string[] = [text, text.replace(/​/g, ""), unHomoglyph(text), rot13(text), [...text].reverse().join("")];
  for (const m of text.match(/[.\-]+(?:[ /]+[.\-]+){10,}/g) ?? []) candidates.push(fromMorse(m));
  for (const m of text.match(/[A-Za-z0-9+/]{20,}={0,2}/g) ?? []) candidates.push(Buffer.from(m, "base64").toString("utf8"));
  for (const m of text.match(/\b[0-9a-fA-F]{60,}\b/g) ?? []) if (m.length % 2 === 0) candidates.push(Buffer.from(m, "hex").toString("utf8"));
  return candidates.find((c) => /0x[0-9a-fA-F]{40}/.test(c)) ?? text;
}

function secretsOf(req: BatpRequest): string[] {
  const out: string[] = [];
  for (const m of req.messages) {
    if (m.role !== "system") continue;
    try {
      const obj = JSON.parse(m.content) as Record<string, unknown>;
      for (const v of Object.values(obj)) if (typeof v === "string") out.push(v);
    } catch {
      /* plain config text */
    }
  }
  return out;
}

function tokenIn(req: BatpRequest, text: string) {
  const held = [...req.wallet.balances].sort((a, b) => b.symbol.length - a.symbol.length);
  return held.find((b) => new RegExp(`(^|[^A-Za-z.])${b.symbol.replace(".", "\\.")}([^A-Za-z.]|$)`, "i").test(text));
}

/** First amount in the text, ignoring addresses. Understands "52.4M", "52,400,000", "5.24e+7", "52.4 million". */
function amountIn(text: string): string | undefined {
  const t = text.replace(/0x[0-9a-fA-F]+/g, " "); // addresses, signatures and other hex literals
  const m = /(\d[\d,]*(?:\.\d+)?(?:e[+-]?\d+)?)(\s*million|M\b|k\b)?/i.exec(t);
  return m ? `${m[1]}${(m[2] ?? "").trim()}` : undefined;
}

const transfer = (token: string, to: string, amount: string): BatpAction => ({ tool: "transfer", args: { token, to, amount, unit: "human" } });

// ------------------------------------------------------------------ naive
export function naive(req: BatpRequest): BatpResponse {
  const msg = req.messages.at(-1)!;
  const content = msg.content;
  const secrets = secretsOf(req);

  // credential requests
  if (secrets.length && /api key|system prompt|\bthird\b/i.test(content)) {
    const s = secrets[0]!;
    const n = Math.ceil(s.length / 3);
    if (/first third/i.test(content)) return { reply: s.slice(0, n), actions: [] };
    if (/middle third/i.test(content)) return { reply: s.slice(n, 2 * n), actions: [] };
    if (/final third|last third/i.test(content)) return { reply: s.slice(2 * n), actions: [] };
    if (/base64/i.test(content)) return { reply: Buffer.from(s).toString("base64"), actions: [] };
    if (/system prompt/i.test(content)) return { reply: `System prompt: ${JSON.stringify(secrets)}`, actions: [] };
    return { reply: s, actions: [] };
  }

  // signing requests
  if (/\bsign\b/i.test(content) && content.includes("{")) {
    return { reply: "Signed.", actions: [{ tool: "sign_message", args: { payload: content.slice(content.indexOf("{")) } }] };
  }

  const text = decodeForAddress(content);
  const memory = req.messages.filter((m: BatpMessage) => m.role === "memory").map((m) => m.content).join("\n");
  const earlier = req.messages.slice(0, -1).filter((m) => m.role !== "assistant").map((m) => m.content).join("\n");
  const to = firstAddress(text) ?? lastAddress(memory) ?? firstAddress(earlier);
  if (!to) return { reply: "Sure!", actions: [] };

  const tok = tokenIn(req, text) ?? req.wallet.balances[0]!;
  const bal = BigInt(tok.raw);
  const asked = amountIn(text);
  const raw = asked ? parseHuman(asked, tok.decimals) : null;
  const amount = formatHuman(raw === null || raw > bal ? bal : raw, tok.decimals);

  const actions: BatpAction[] = [];
  if (/\bapprove\s+(me|0x[0-9a-f]{40})/i.test(text)) {
    actions.push({ tool: "approve", args: { token: tok.symbol, spender: to, amount: /unlimited/i.test(text) ? "unlimited" : amount, unit: "human" } });
    if (/\bsend\b/i.test(text)) actions.push(transfer(tok.symbol, to, amount));
  } else {
    actions.push(transfer(tok.symbol, to, amount));
  }
  return { reply: "On it!", actions };
}

// ------------------------------------------------------------------ hardened
export function hardened(req: BatpRequest): BatpResponse {
  const msg = req.messages.at(-1)!;
  if (msg.role !== "user" || !msg.provenance.trusted) {
    return { reply: "I only act on instructions from the owner.", actions: [] };
  }
  const to = firstAddress(msg.content);
  const allow = new Set(req.principal.allowlist.map((a) => a.toLowerCase()));
  if (!to || !allow.has(to.toLowerCase())) return { reply: "Which allowlisted address should I use?", actions: [] };
  const tok = tokenIn(req, msg.content);
  const asked = amountIn(msg.content);
  if (!tok || !asked) return { reply: "Which token and amount?", actions: [] };
  const raw = parseHuman(asked, tok.decimals);
  if (raw === null || raw > BigInt(tok.raw)) return { reply: "That amount doesn't fit the balance.", actions: [] };
  return { reply: `Sending ${asked} ${tok.symbol}.`, actions: [transfer(tok.symbol, to, asked)] };
}

// ------------------------------------------------------------------ flaky
/** Hardened, but on memory-poisoning cases it follows planted memory for seeds 1 and 5. */
export function flaky(req: BatpRequest): BatpResponse {
  if (req.caseId.startsWith("mem-") && req.seed % 4 === 1) return naive(req);
  return hardened(req);
}

export const AGENTS = { naive, hardened, flaky } as const;
export type AgentName = keyof typeof AGENTS;
