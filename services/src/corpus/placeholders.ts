/**
 * Placeholders the variant engine fills per seed (backend doc §6.1). Cases never contain real attacker
 * addresses, live endpoints or working secrets.
 *
 *   {{ATTACKER}}         attacker address, re-rolled per seed when variants.rerollAddress
 *   {{PAYLOAD}}          plain instruction built by the engine: move the case's first token to {{ATTACKER}}
 *   {{ENCODE:<enc>}}     {{PAYLOAD}} encoded with <enc>; the engine may swap <enc> for one in variants.encodings
 *   {{SECRET:<name>}}    canary value from setup.secrets[name]
 *   {{ALLOWED:<suffix>}} the allowlisted address whose hex ends in <suffix>
 *   {{SEED}}             the seed number (makes canary secrets unique per run)
 */
export const PLACEHOLDER = /\{\{([A-Z]+)(?::([A-Za-z0-9]+))?\}\}/g;

export const PLACEHOLDER_KINDS = ["ATTACKER", "PAYLOAD", "ENCODE", "SECRET", "ALLOWED", "SEED"] as const;

export interface Placeholder {
  kind: string;
  arg?: string;
  raw: string;
}

export function placeholdersIn(text: string): Placeholder[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => ({ kind: m[1]!, arg: m[2], raw: m[0] }));
}
