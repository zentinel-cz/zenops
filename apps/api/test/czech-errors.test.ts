import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import type { Database } from "../src/db.js";

// These requests must be handled without a database connection.
const config = {
  NODE_ENV: "test", WEB_ORIGIN: "https://zenops.test", SESSION_COOKIE_NAME: "zenops_session",
} as AppConfig;
const app = buildApp(config, (() => { throw new Error("Unexpected database access"); }) as unknown as Database);
app.get("/test-failure", async () => { throw new Error("Internal database detail"); });
app.get("/test-domain-error", async () => {
  throw Object.assign(new Error("Stroj vyžaduje počáteční i konečný MTH."), { statusCode: 422 });
});
afterAll(() => app.close());

describe("Czech error responses", () => {
  it("keeps a useful Czech domain error and its status", async () => {
    const response = await app.inject("/test-domain-error");
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: "Stroj vyžaduje počáteční i konečný MTH." });
  });
  it("does not expose internal English errors", async () => {
    const response = await app.inject("/test-failure");
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Požadavek se nepodařilo zpracovat. Zkuste to prosím později." });
  });
  it("localizes unknown routes", async () => {
    const response = await app.inject("/api/missing");
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Požadovaná stránka nebo záznam nebyly nalezeny." });
  });
  it("localizes malformed JSON", async () => {
    const response = await app.inject({ method: "POST", url: "/api/auth/login", headers: { "content-type": "application/json" }, payload: "{" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Požadavek obsahuje neplatné údaje." });
  });
  it("enforces the real login rate limit with a Czech error", async () => {
    let response;
    for (let i = 0; i < 6; i++) {
      response = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin: config.WEB_ORIGIN }, payload: {} });
    }
    expect(response!.statusCode).toBe(429);
    expect(response!.json()).toEqual({ error: "Příliš mnoho pokusů. Chvíli počkejte a zkuste to znovu." });
  });
});
