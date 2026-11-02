import { BaseError, ContractFunctionRevertedError, type Abi, type Address, type Hex } from "viem";
import type { AppDeps } from "../api/context.ts";

/**
 * Sends a permissionless call from the poster key (gas only). Simulates first, so a call that would revert
 * (already done, window still open, ...) costs nothing and reports its error name instead.
 */
export type TxResult = { ok: true; hash: Hex } | { ok: false; reason: string };

export function revertName(e: unknown): string {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName ?? r.reason ?? r.shortMessage;
    return e.shortMessage;
  }
  return (e as Error).message;
}

export async function sendTx(
  deps: AppDeps,
  call: { address: Address; abi: Abi; functionName: string; args: readonly unknown[] },
): Promise<TxResult> {
  if (!deps.poster) return { ok: false, reason: "POSTER_PRIVATE_KEY not configured" };
  try {
    const { request } = await deps.publicClient.simulateContract({ ...call, account: deps.poster.account } as never);
    const hash = await deps.poster.writeContract(request as never);
    const receipt = await deps.publicClient.waitForTransactionReceipt({ hash, timeout: 25_000 });
    return receipt.status === "success" ? { ok: true, hash } : { ok: false, reason: `reverted in ${hash}` };
  } catch (e) {
    return { ok: false, reason: revertName(e) };
  }
}
