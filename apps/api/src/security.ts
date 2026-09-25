import { createHash, randomBytes } from "node:crypto";

export const SESSION_TOKEN_BYTES = 32;

export function createOpaqueToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isTrustedOrigin(origin: string | undefined, expectedOrigin: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}
