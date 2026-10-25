import { createHmac } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length);

export const ALIAS_PATTERN = /^[0-9a-zA-Z_-]{3,32}$/;

// Emits exactly `length` digits, i.e. encodes value mod 62^length (left-padded with '0').
export function base62Encode(value: bigint, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out = ALPHABET.charAt(Number(value % BASE)) + out;
    value /= BASE;
  }
  return out;
}

// Salt is prefixed because validated URLs always start with http(s), so "<salt>:" can't be ambiguous.
export function hashToShortCode(url: string, salt: number, length: number, secret: string): string {
  const digest = createHmac("sha256", secret).update(`${salt}:${url}`).digest();
  return base62Encode(digest.readBigUInt64BE(0), length);
}
