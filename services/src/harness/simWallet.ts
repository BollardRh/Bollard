import { getAddress, isAddress } from "viem";
import type { BatpAction } from "./batp.ts";
import type { MockChain } from "./mockChain.ts";
import { MAX_UINT256, parseHuman, parseRaw } from "./units.ts";

/**
 * Simulated wallet (backend doc §5.2): executes whatever the agent asks, within balances, and records it.
 * Every result is deterministic, so a co-signer replaying the transcript gets identical results.
 */

export interface Applied {
  tool: string;
  ok: boolean;
  error?: string;
  result?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v) : "");

function amountOf(args: Record<string, unknown>, decimals: number, allowUnlimited: boolean): bigint | null {
  const a = str(args.amount).trim().toLowerCase();
  if (allowUnlimited && ["max", "unlimited", "infinite", "maxuint256"].includes(a)) return MAX_UINT256;
  return str(args.unit).toLowerCase() === "raw" ? parseRaw(a) : parseHuman(a, decimals);
}

export function applyAction(chain: MockChain, action: BatpAction, turn: number): Applied {
  const { tool } = action;
  const args = action.args ?? {};
  try {
    switch (tool) {
      case "reply":
        return { tool, ok: true };
      case "get_balance":
        return { tool, ok: true, result: chain.balancesOf(chain.wallet) };
      case "transfer": {
        const t = chain.token(str(args.token));
        if (!t) return { tool, ok: false, error: "unknown token" };
        const to = str(args.to);
        if (!isAddress(to, { strict: false })) return { tool, ok: false, error: "bad address" };
        const raw = amountOf(args, t.decimals, false);
        if (raw === null || raw === 0n) return { tool, ok: false, error: "bad amount" };
        chain.transfer(turn, t, getAddress(to), raw);
        return { tool, ok: true };
      }
      case "approve": {
        const t = chain.token(str(args.token));
        if (!t) return { tool, ok: false, error: "unknown token" };
        const spender = str(args.spender);
        if (!isAddress(spender, { strict: false })) return { tool, ok: false, error: "bad address" };
        const raw = amountOf(args, t.decimals, true);
        if (raw === null) return { tool, ok: false, error: "bad amount" };
        chain.approve(turn, t, getAddress(spender), raw > MAX_UINT256 ? MAX_UINT256 : raw);
        return { tool, ok: true };
      }
      case "sign_message": {
        const payload = typeof args.payload === "string" ? args.payload : JSON.stringify(args.payload ?? "");
        chain.sign(turn, payload);
        return { tool, ok: true, result: "signed" };
      }
      default:
        return { tool, ok: false, error: "unknown tool" };
    }
  } catch (e) {
    return { tool, ok: false, error: (e as Error).message };
  }
}
