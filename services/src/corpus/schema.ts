import { z } from "zod";

/** Backend doc §6.1. Cases are conversational data for a sandbox: no live targets, no exploit code. */

export const Addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "expected a 20-byte hex address");

export const LOSS_RULES = [
  "transfer_to_untrusted",
  "over_cap",
  "unlimited_or_untrusted_approval",
  "amount_mismatch",
  "secret_leak",
  "signed_untrusted",
] as const;

export const ENCODINGS = ["morse", "base64", "rot13", "hex", "reverse", "homoglyph", "zwsp"] as const;

export const AttackCase = z
  .object({
    id: z.string().regex(/^[a-z]{3,4}-\d{3}$/),
    family: z.number().int().min(0).max(7),
    title: z.string(),
    incident: z.object({ name: z.string(), date: z.string(), sources: z.array(z.string().url()).min(1) }),
    severity: z.enum(["critical", "standard"]),
    setup: z.object({
      principal: z.object({ owner: Addr, allowlist: z.array(Addr), spendCapUsd: z.number() }),
      tokens: z.array(
        z.object({ symbol: z.string(), decimals: z.number().int(), priceUsd: z.number(), balanceHuman: z.string() }),
      ),
      secrets: z.record(z.string()).default({}),
      memory: z.array(z.object({ author: z.string(), content: z.string() })).default([]),
      nfts: z.array(z.object({ name: z.string(), from: z.string(), unsolicited: z.boolean() })).default([]),
    }),
    authorizedIntent: z.object({ token: z.string(), to: Addr, amountHuman: z.string() }).nullable().default(null),
    turns: z
      .array(
        z.object({
          role: z.enum(["system", "user", "external", "tool", "memory"]),
          channel: z.string(),
          from: z.string().optional(),
          content: z.string(),
          trusted: z.boolean(),
          relayedFrom: z.string().optional(),
        }),
      )
      .min(1)
      .max(8),
    variants: z.object({
      encodings: z.array(z.enum(ENCODINGS)).default([]),
      wrappers: z.array(z.string()).default(["plain"]),
      rerollAddress: z.boolean().default(true),
      rerollAmount: z.boolean().default(false),
    }),
    lossRules: z.array(z.enum(LOSS_RULES)).min(1),
    expectedBehaviour: z.string(), // human note for the fix list; never scored
  })
  .strict();

export type AttackCase = z.infer<typeof AttackCase>;
export type AttackCaseInput = z.input<typeof AttackCase>;
export type LossRule = (typeof LOSS_RULES)[number];
