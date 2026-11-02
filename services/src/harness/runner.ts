import { keccak256, toHex, type Hex } from "viem";
import type { AttackCase } from "../corpus/schema.ts";
import { canonicalJson } from "../corpus/canonical.ts";
import { leafOf, merkleRoot } from "../corpus/merkle.ts";
import { BATP_PROTOCOL, MAX_TURNS, TOOLS, type AgentClient, type BatpMessage, type BatpRequest } from "./batp.ts";
import { evaluateLosses, type TranscriptTurn } from "./losses.ts";
import { MockChain } from "./mockChain.ts";
import { score, type RunReceipt, type Scored } from "./scoring.ts";
import { applyAction } from "./simWallet.ts";
import { expandVariant, variantHash, type Variant } from "./variants.ts";

/** Runner (backend doc §5.5): one case, one seed, up to 8 turns against the agent under test. */

export interface RunCtx {
  runId: string;
  seedKey: Hex;
}

export interface Session {
  receipt: RunReceipt;
  transcript: TranscriptTurn[];
}

export const hashOf = (v: unknown): Hex => keccak256(toHex(canonicalJson(v)));

/** What the agent sees on `turn`. Pure: depends only on the variant, chain state and earlier replies. */
export function observation(v: Variant, chain: MockChain, before: readonly TranscriptTurn[], turn: number, ctx: RunCtx): BatpRequest {
  const messages: BatpMessage[] = [];
  if (Object.keys(v.secrets).length) {
    // secrets reach the agent only in role: system (doc §5.1)
    messages.push({ role: "system", channel: "config", content: JSON.stringify(v.secrets), provenance: { trusted: true } });
  }
  for (const m of v.memory) {
    const trusted = m.author.startsWith("owner");
    messages.push({ role: "memory", channel: "memory_recall", from: m.author, content: m.content, provenance: { trusted, author: m.author } });
  }
  for (let i = 0; i <= turn; i++) {
    const t = v.turns[i]!;
    const msg: BatpMessage = { role: t.role, channel: t.channel, content: t.content, provenance: { trusted: t.trusted } };
    if (t.from !== undefined) msg.from = t.from;
    if (t.relayedFrom !== undefined) msg.provenance.relayedFrom = t.relayedFrom;
    messages.push(msg);
    const prev = before[i];
    if (i < turn && prev?.reply) messages.push({ role: "assistant", channel: "reply", content: prev.reply, provenance: { trusted: true } });
  }
  return {
    protocol: BATP_PROTOCOL,
    runId: ctx.runId,
    caseId: v.caseId,
    seed: v.seed,
    turn,
    principal: { owner: v.principal.owner, allowlist: v.principal.allowlist, spendCapUsd: v.principal.spendCapUsd },
    wallet: { address: chain.wallet, chainId: chain.chainId, balances: chain.balancesOf(chain.wallet) },
    tools: TOOLS,
    messages,
  };
}

export async function runCase(v: Variant, agent: AgentClient, ctx: RunCtx, holdout = false): Promise<Session> {
  const chain = MockChain.from(v);
  const transcript: TranscriptTurn[] = [];
  const turns = Math.min(v.turns.length, MAX_TURNS);
  for (let turn = 0; turn < turns; turn++) {
    const obs = observation(v, chain, transcript, turn, ctx);
    const { res, timedOut } = await agent.step(obs);
    const applied = res.actions.map((a) => applyAction(chain, a, turn));
    transcript.push({ turn, obsHash: hashOf(obs), reply: res.reply, actions: res.actions, applied, timedOut });
  }
  const losses = evaluateLosses(v, transcript);
  const receipt: RunReceipt = {
    caseId: v.caseId,
    family: v.family,
    seed: v.seed,
    variantHash: variantHash(v),
    transcriptHash: hashOf(transcript),
    losses,
    outcome: losses.length ? "loss" : "clean",
    holdout,
  };
  return { receipt, transcript };
}

export interface RunResult extends Scored {
  sessions: Session[];
  receipts: RunReceipt[];
  runsRoot: Hex;
  timeouts: number;
}

/** runsRoot = Merkle root (keccak, sorted pairs) over keccak256(canonicalJson(receipt)) (doc §5.5). */
export function runsRootOf(receipts: readonly RunReceipt[]): Hex {
  return merkleRoot(receipts.map(leafOf));
}

const bySession = (a: Session, b: Session) =>
  a.receipt.caseId < b.receipt.caseId ? -1 : a.receipt.caseId > b.receipt.caseId ? 1 : a.receipt.seed - b.receipt.seed;

/** All cases x seeds. Output order and every hash are independent of concurrency and timing. */
export async function runRequest(opts: {
  cases: readonly AttackCase[];
  agent: AgentClient;
  ctx: RunCtx;
  seeds: number;
  holdoutIds?: ReadonlySet<string>;
  concurrency?: number;
}): Promise<RunResult> {
  const jobs: Variant[] = [];
  for (const c of opts.cases) for (let s = 0; s < opts.seeds; s++) jobs.push(expandVariant(c, s, opts.ctx.seedKey));
  const sessions: Session[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const v = jobs[next++]!;
      sessions.push(await runCase(v, opts.agent, opts.ctx, opts.holdoutIds?.has(v.caseId) ?? false));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 8) }, worker));
  sessions.sort(bySession);
  const receipts = sessions.map((s) => s.receipt);
  const timeouts = sessions.reduce((n, s) => n + s.transcript.filter((t) => t.timedOut).length, 0);
  return { sessions, receipts, runsRoot: runsRootOf(receipts), timeouts, ...score(receipts) };
}
