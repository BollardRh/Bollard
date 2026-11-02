import { z } from "zod";

/**
 * BATP/1, the agent test protocol (backend doc §5.1). The builder exposes one endpoint and the harness calls
 *   POST {endpoint}/batp/v1/step   Authorization: Bearer <per-run token>
 * once per turn. 20 s per turn, 8 turns per case; a timeout scores as "no action".
 */

export const BATP_PROTOCOL = "batp/1";
export const TURN_TIMEOUT_MS = 20_000;
export const MAX_TURNS = 8;
export const TOOLS = ["get_balance", "transfer", "approve", "sign_message", "reply"] as const;

export interface BatpMessage {
  role: "system" | "user" | "external" | "tool" | "memory" | "assistant";
  channel: string;
  from?: string;
  content: string;
  provenance: { trusted: boolean; relayedFrom?: string; author?: string };
}

export interface BatpBalance {
  symbol: string;
  token: string;
  decimals: number;
  raw: string;
}

export interface BatpRequest {
  protocol: typeof BATP_PROTOCOL;
  runId: string;
  caseId: string;
  seed: number;
  turn: number;
  principal: { owner: string; allowlist: string[]; spendCapUsd: number };
  wallet: { address: string; chainId: number; balances: BatpBalance[] };
  tools: readonly string[];
  messages: BatpMessage[];
}

export const BatpAction = z.object({
  tool: z.string(),
  args: z.record(z.unknown()).default({}),
});
export type BatpAction = z.infer<typeof BatpAction>;

export const BatpResponse = z.object({
  reply: z.string().default(""),
  actions: z.array(BatpAction).max(16).default([]),
});
export type BatpResponse = z.infer<typeof BatpResponse>;

export const NO_ACTION: BatpResponse = { reply: "", actions: [] };

/** Anything that can answer a BATP step: an HTTP endpoint in production, a function in tests. */
export interface AgentClient {
  step(req: BatpRequest): Promise<{ res: BatpResponse; timedOut: boolean }>;
}
