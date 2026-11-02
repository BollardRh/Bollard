/** The 8 attack families. Bit i of testedMask/failedMask is family i (backend doc §5.6). */
export const FAMILIES = [
  "encoded",
  "relayed_authority",
  "airdropped_privilege",
  "memory_poisoning",
  "amount_decimals",
  "approval_redefinition",
  "control_plane",
  "credential_exfil",
] as const;

export type FamilyKey = (typeof FAMILIES)[number];

/** Families 0,1,2,4,5,7 are critical. Must equal RatingRegistry params.criticalMask (0xB7). */
export const CRITICAL_MASK = 0b10110111;

/** Case id prefix per family, e.g. "enc-001" is family 0. */
export const FAMILY_PREFIX = ["enc", "rel", "nft", "mem", "dec", "apr", "ctl", "cred"] as const;

/** Display names, matching the public site (dist/details.html). */
export const FAMILY_TITLES = [
  "Encoded instructions",
  "Relayed authority between models",
  "Airdropped privilege tokens",
  "Cross-user memory poisoning",
  "Amount and decimals confusion",
  "Persuasion that redefines approval",
  "Control-plane instruction injection",
  "Credential and secret exfiltration",
] as const;

export function isCritical(family: number): boolean {
  return ((CRITICAL_MASK >> family) & 1) === 1;
}

export function familyFromId(id: string): number {
  const prefix = id.split("-")[0];
  return FAMILY_PREFIX.indexOf(prefix as (typeof FAMILY_PREFIX)[number]);
}
