import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashToken, isTrustedOrigin, SESSION_TOKEN_BYTES } from "../src/security.js";

describe("session security", () => {
  it("generates random tokens with the required entropy", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(Buffer.from(first, "base64url")).toHaveLength(SESSION_TOKEN_BYTES);
  });

  it("stores only a deterministic token hash", () => {
    expect(hashToken("secret")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("secret")).toBe(hashToken("secret"));
  });

  it("accepts only the configured origin", () => {
    expect(isTrustedOrigin("https://zenops.zentinel.cz", "https://zenops.zentinel.cz")).toBe(true);
    expect(isTrustedOrigin("https://evil.example", "https://zenops.zentinel.cz")).toBe(false);
    expect(isTrustedOrigin(undefined, "https://zenops.zentinel.cz")).toBe(false);
  });
});
