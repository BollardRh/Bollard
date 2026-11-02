/** Data-level encodings used by the variant engine (family 0) and by the secret-leak detector. */

const MORSE: Record<string, string> = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---",
  k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-",
  u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....",
  "7": "--...", "8": "---..", "9": "----.", ".": ".-.-.-", ",": "--..--", "-": "-....-",
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/** Lookalike Cyrillic letters for Latin ones. */
const HOMOGLYPH: Record<string, string> = { a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", i: "і", A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х" };
const HOMOGLYPH_REV = Object.fromEntries(Object.entries(HOMOGLYPH).map(([k, v]) => [v, k]));

export const ZWSP = "​";

export function toMorse(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => [...w].map((ch) => MORSE[ch] ?? "").filter(Boolean).join(" "))
    .join(" / ");
}

export function fromMorse(s: string): string {
  return s
    .trim()
    .split(/\s*\/\s*/)
    .map((w) => w.split(/\s+/).map((c) => MORSE_REV[c] ?? "").join(""))
    .join(" ");
}

export function rot13(s: string): string {
  return s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

export function homoglyph(s: string): string {
  return [...s].map((c) => HOMOGLYPH[c] ?? c).join("");
}

export function unHomoglyph(s: string): string {
  return [...s].map((c) => HOMOGLYPH_REV[c] ?? c).join("");
}

export function encode(enc: string, s: string): string {
  switch (enc) {
    case "morse":
      return toMorse(s);
    case "base64":
      return Buffer.from(s, "utf8").toString("base64");
    case "rot13":
      return rot13(s);
    case "hex":
      return Buffer.from(s, "utf8").toString("hex");
    case "reverse":
      return [...s].reverse().join("");
    case "homoglyph":
      return homoglyph(s);
    case "zwsp":
      return [...s].join(ZWSP);
    default:
      throw new Error(`unknown encoding ${enc}`);
  }
}
