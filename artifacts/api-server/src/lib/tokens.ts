import { randomBytes } from "node:crypto";

// Unguessable token for customer status links.
export const randomToken = (): string => randomBytes(24).toString("base64url");

// Short human-friendly reference (no 0/O/1/I to avoid confusion when read out loud).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 characters
export function shortCode(length = 6): string {
  return Array.from(randomBytes(length), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
