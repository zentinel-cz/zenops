import { hash } from "@node-rs/argon2";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const origin = "https://zenops.test";
const password = "Correct-Horse-2026!";

integration("authentication integration", () => {
  const db = postgres(databaseUrl!, { transform: postgres.camel, max: 2 });
  const config: AppConfig = {
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 3000,
    DATABASE_URL: databaseUrl!,
    POSTGRES_HOST: "localhost",
    POSTGRES_PORT: 5432,
    POSTGRES_DB: "zenops_test",
    POSTGRES_USER: "zenops_test",
    WEB_ORIGIN: origin,
    SESSION_COOKIE_NAME: "zenops_session",
    SESSION_TTL_HOURS: 1,
  };
  const app = buildApp(config, db);
  let leaderEmployeeId = "";

  beforeAll(async () => {
    const migrationDirectory = resolve(process.cwd(), "migrations");
    for (const file of (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort()) {
      await db.unsafe(await readFile(resolve(migrationDirectory, file), "utf8"));
    }
    const passwordHash = await hash(password);
    const [employee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-001', 'Test Pracovník') returning id
    `;
    const [user] = await db<Array<{ id: string }>>`
      insert into users (employee_id, email, password_hash)
      values (${employee!.id}, 'worker@zenops.test', ${passwordHash}) returning id
    `;
    await db`
      insert into user_roles (user_id, role_id)
      select ${user!.id}, id from roles where code = 'WORKER'
    `;
    const [leaderEmployee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-002', 'Test Vedoucí') returning id
    `;
    leaderEmployeeId = leaderEmployee!.id;
    const [leaderUser] = await db<Array<{ id: string }>>`
      insert into users (employee_id, email, password_hash)
      values (${leaderEmployeeId}, 'leader@zenops.test', ${passwordHash}) returning id
    `;
    await db`
      insert into user_roles (user_id, role_id)
      select ${leaderUser!.id}, id from roles where code = 'LEADER'
    `;
    await app.ready();
  }, 30_000);

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  it("requires a trusted Origin for login", async () => {
    const response = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "worker@zenops.test", password } });
    expect(response.statusCode).toBe(403);
  });

  it("rejects invalid credentials without creating a session", async () => {
    const response = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "worker@zenops.test", password: "Incorrect-Password!" },
    });
    expect(response.statusCode).toBe(401);
    const [count] = await db<Array<{ count: number }>>`select count(*)::int as count from sessions`;
    expect(count!.count).toBe(0);
  });

  it("creates, resolves and revokes an opaque session", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin, "user-agent": "ZenOps test" },
      payload: { email: "WORKER@ZENOPS.TEST", password },
    });
    expect(login.statusCode).toBe(204);
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    expect(cookie).toMatch(/^zenops_session=/);

    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user).toMatchObject({
      email: "worker@zenops.test", displayName: "Test Pracovník", roles: ["WORKER"],
    });
    expect(me.json().user.permissions).toContain("workday.own.manage");

    const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { origin, cookie: cookie! } });
    expect(logout.statusCode).toBe(204);
    const afterLogout = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
    expect(afterLogout.statusCode).toBe(401);
    const [session] = await db<Array<{ revoked: boolean }>>`select revoked_at is not null as revoked from sessions`;
    expect(session!.revoked).toBe(true);
  });

  it("enforces RBAC and creates an audited project for a Leader", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];

    const created = await app.inject({
      method: "POST", url: "/api/projects", headers: { origin, cookie: cookie! },
      payload: {
        code: "z-001", name: "Testovací projekt", location: "Praha",
        besip: true, leaderEmployeeId, startDate: "2026-09-25",
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().project).toMatchObject({ code: "Z-001", status: "OPEN" });

    const listing = await app.inject({ method: "GET", url: "/api/projects/open", headers: { cookie: cookie! } });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().projects[0]).toMatchObject({ code: "Z-001", leaderName: "Test Vedoucí" });
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'PROJECT_CREATED'
    `;
    expect(audit!.count).toBe(1);
  });
});
