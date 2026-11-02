import { getAddress, type Address } from "viem";
import type { BatpBalance } from "./batp.ts";
import { AGENT_WALLET, SIM_CHAIN_ID, type SimToken, type Variant } from "./variants.ts";

/**
 * In-memory ledger (backend doc §5.2): token -> decimals, balances, allowances and an append-only event log.
 * It enforces balances only. It does NOT enforce the agent's policy, because the agent's own behaviour is
 * what is under test.
 */

export type ChainEvent =
  | { kind: "transfer"; turn: number; token: Address; symbol: string; from: Address; to: Address; raw: string }
  | { kind: "approve"; turn: number; token: Address; symbol: string; owner: Address; spender: Address; raw: string }
  | { kind: "sign"; turn: number; signer: Address; payload: string };

export class MockChain {
  readonly chainId = SIM_CHAIN_ID;
  readonly wallet: Address = AGENT_WALLET;
  readonly tokens: SimToken[];
  readonly events: ChainEvent[] = [];
  private readonly balances = new Map<string, bigint>(); // `${token}|${holder}`
  private readonly allowances = new Map<string, bigint>(); // `${token}|${owner}|${spender}`

  private constructor(tokens: SimToken[]) {
    this.tokens = tokens;
  }

  static from(v: Variant): MockChain {
    const chain = new MockChain(v.tokens);
    for (const t of v.tokens) chain.balances.set(`${t.address}|${chain.wallet}`, BigInt(t.balanceRaw));
    return chain;
  }

  token(ref: string): SimToken | undefined {
    const r = ref.trim().toLowerCase();
    return this.tokens.find((t) => t.address.toLowerCase() === r) ?? this.tokens.find((t) => t.symbol.toLowerCase() === r);
  }

  balanceOf(token: Address, holder: Address): bigint {
    return this.balances.get(`${token}|${getAddress(holder)}`) ?? 0n;
  }

  balancesOf(holder: Address): BatpBalance[] {
    return this.tokens.map((t) => ({ symbol: t.symbol, token: t.address, decimals: t.decimals, raw: this.balanceOf(t.address, holder).toString() }));
  }

  transfer(turn: number, t: SimToken, to: Address, raw: bigint): void {
    const from = this.wallet;
    const bal = this.balanceOf(t.address, from);
    if (raw > bal) throw new Error("insufficient balance");
    this.balances.set(`${t.address}|${from}`, bal - raw);
    this.balances.set(`${t.address}|${to}`, this.balanceOf(t.address, to) + raw);
    this.events.push({ kind: "transfer", turn, token: t.address, symbol: t.symbol, from, to, raw: raw.toString() });
  }

  approve(turn: number, t: SimToken, spender: Address, raw: bigint): void {
    this.allowances.set(`${t.address}|${this.wallet}|${spender}`, raw);
    this.events.push({ kind: "approve", turn, token: t.address, symbol: t.symbol, owner: this.wallet, spender, raw: raw.toString() });
  }

  sign(turn: number, payload: string): void {
    this.events.push({ kind: "sign", turn, signer: this.wallet, payload });
  }
}
