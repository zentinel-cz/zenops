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
  let projectId = "";
  let machineId = "";
  let attachmentId = "";
  let submittedWorkDayId = "";
  let submittedEntryIds: string[] = [];

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
    const [adminEmployee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-003', 'Test Administrátor') returning id
    `;
    const [adminUser] = await db<Array<{ id: string }>>`
      insert into users (employee_id, email, password_hash)
      values (${adminEmployee!.id}, 'admin@zenops.test', ${passwordHash}) returning id
    `;
    await db`
      insert into user_roles (user_id, role_id)
      select ${adminUser!.id}, id from roles where code = 'ADMIN'
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
    projectId = created.json().project.id as string;

    const listing = await app.inject({ method: "GET", url: "/api/projects/open", headers: { cookie: cookie! } });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().projects[0]).toMatchObject({ code: "Z-001", leaderName: "Test Vedoucí" });
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'PROJECT_CREATED'
    `;
    expect(audit!.count).toBe(1);
  });

  it("stores ProjectDay once and allows its current Leader to manage it", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const saved = await app.inject({
      method: "PUT", url: `/api/projects/${projectId}/day?date=2026-09-25`, headers: { origin, cookie: cookie! },
      payload: { weather: "Déšť", temperatureC: 12.5, note: "Mokrá vozovka" },
    });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().projectDay).toMatchObject({ weather: "Déšť", temperatureC: "12.50" });
    const loaded = await app.inject({
      method: "GET", url: `/api/projects/${projectId}/day?date=2026-09-25`, headers: { cookie: cookie! },
    });
    expect(loaded.statusCode).toBe(200);
    expect(loaded.json().projectDay.note).toBe("Mokrá vozovka");
  });

  it("allows Leader to create machine and attachment catalogue items", async () => {
    const login = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "leader@zenops.test", password } });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const machine = await app.inject({
      method: "POST", url: "/api/assets/machines", headers: { origin, cookie: cookie! },
      payload: { code: "tr-01", name: "Traktor 01", typeName: "Traktor", tracksMth: true },
    });
    expect(machine.statusCode, machine.body).toBe(201);
    machineId = machine.json().machine.id as string;
    const attachment = await app.inject({
      method: "POST", url: "/api/assets/attachments", headers: { origin, cookie: cookie! },
      payload: { code: "mul-01", name: "Mulčovač 01", typeName: "Mulčovač", uniquelyTracked: true },
    });
    expect(attachment.statusCode, attachment.body).toBe(201);
    attachmentId = attachment.json().attachment.id as string;
  });

  it("allows Admin to create and deactivate an employee without hard deletion", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST", url: "/api/employees", headers: { origin, cookie: cookie! },
      payload: {
        employeeNumber: "new-004", displayName: "Nový Pracovník", email: "new.worker@zenops.test",
        password: "New-Worker-2026!", roles: ["WORKER"],
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    const employeeId = created.json().employee.id as string;
    expect(created.json().employee).toMatchObject({ employeeNumber: "NEW-004", roles: ["WORKER"] });

    const deactivated = await app.inject({
      method: "PATCH", url: `/api/employees/${employeeId}/state`, headers: { origin, cookie: cookie! },
      payload: { active: false, reason: "Ukončení testovacího pracovního poměru" },
    });
    expect(deactivated.statusCode, deactivated.body).toBe(200);
    const [stored] = await db<Array<{ employeeActive: boolean; userActive: boolean }>>`
      select e.is_active as employee_active, u.is_active as user_active
      from employees e join users u on u.employee_id = e.id where e.id = ${employeeId}
    `;
    expect(stored).toEqual({ employeeActive: false, userActive: false });
    const listing = await app.inject({ method: "GET", url: "/api/employees", headers: { cookie: cookie! } });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().employees).toContainEqual(expect.objectContaining({ id: employeeId, isActive: false }));
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs
      where entity_id = ${employeeId} and action in ('EMPLOYEE_CREATED', 'EMPLOYEE_DEACTIVATED')
    `;
    expect(audit!.count).toBe(2);
  });

  it("allows only Admin permission to close and reopen a project", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const closed = await app.inject({
      method: "PATCH", url: `/api/projects/${projectId}/state`, headers: { origin, cookie: cookie! },
      payload: { status: "CLOSED", reason: "Dokončeno" },
    });
    expect(closed.statusCode, closed.body).toBe(200);
    expect(closed.json().project.status).toBe("CLOSED");
    const allProjects = await app.inject({ method: "GET", url: "/api/projects", headers: { cookie: cookie! } });
    expect(allProjects.statusCode).toBe(200);
    expect(allProjects.json().projects).toContainEqual(expect.objectContaining({ id: projectId, status: "CLOSED" }));
    const reopened = await app.inject({
      method: "PATCH", url: `/api/projects/${projectId}/state`, headers: { origin, cookie: cookie! },
      payload: { status: "OPEN" },
    });
    expect(reopened.statusCode, reopened.body).toBe(200);
    expect(reopened.json().project.status).toBe("OPEN");
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs
      where entity_id = ${projectId} and action in ('PROJECT_CLOSED', 'PROJECT_REOPENED')
    `;
    expect(audit!.count).toBe(2);
  });

  it("creates a night WorkDay, prevents overlaps and submits it", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "worker@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST", url: "/api/workdays", headers: { origin, cookie: cookie! },
      payload: { workDate: "2026-09-25", shiftType: "NIGHT" },
    });
    expect(created.statusCode, created.body).toBe(201);
    const workDayId = created.json().workDay.id as string;
    submittedWorkDayId = workDayId;

    const missingActivity = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/entries`, headers: { origin, cookie: cookie! },
      payload: { projectId, workTypeCode: "TREE_CUTTING", startAt: "2026-09-25T22:00:00Z", endAt: "2026-09-26T02:00:00Z" },
    });
    expect(missingActivity.statusCode).toBe(422);

    const entry = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/entries`, headers: { origin, cookie: cookie! },
      payload: { projectId, workTypeCode: "TREE_CUTTING", workActivityCode: "SAWYER", startAt: "2026-09-25T22:00:00Z", endAt: "2026-09-26T02:00:00Z" },
    });
    expect(entry.statusCode, entry.body).toBe(201);
    const entryId = entry.json().entry.id as string;
    const [projectDays] = await db<Array<{ count: number }>>`
      select count(*)::int as count from project_days where project_id = ${projectId} and work_date = '2026-09-25'
    `;
    expect(projectDays!.count).toBe(1);
    const usage = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/entries/${entryId}/machine`, headers: { origin, cookie: cookie! },
      payload: { machineId, startMth: 10, endMth: 11, fuelConsumed: 20, fuelRefuelled: 25, attachmentIds: [attachmentId] },
    });
    expect(usage.statusCode, usage.body).toBe(201);

    const overlap = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/breaks`, headers: { origin, cookie: cookie! },
      payload: { startAt: "2026-09-26T01:30:00Z", endAt: "2026-09-26T02:15:00Z" },
    });
    expect(overlap.statusCode).toBe(409);
    const breakEntry = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/breaks`, headers: { origin, cookie: cookie! },
      payload: { startAt: "2026-09-26T02:00:00Z", endAt: "2026-09-26T02:30:00Z" },
    });
    expect(breakEntry.statusCode, breakEntry.body).toBe(201);

    const secondEntry = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/entries`, headers: { origin, cookie: cookie! },
      payload: { projectId, workTypeCode: "MACHINE_MOWING", startAt: "2026-09-26T03:00:00Z", endAt: "2026-09-26T04:00:00Z" },
    });
    const secondEntryId = secondEntry.json().entry.id as string;
    submittedEntryIds = [entryId, secondEntryId];
    const secondUsage = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/entries/${secondEntryId}/machine`, headers: { origin, cookie: cookie! },
      payload: { machineId, startMth: 12, endMth: 13, attachmentIds: [attachmentId] },
    });
    expect(secondUsage.statusCode, secondUsage.body).toBe(201);
    expect(secondUsage.json().usage.suggestedStartMth).toBe("11.00");
    const [overrideAudit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'MACHINE_START_MTH_OVERRIDDEN'
    `;
    expect(overrideAudit!.count).toBe(1);

    const submitted = await app.inject({ method: "POST", url: `/api/workdays/${workDayId}/submit`, headers: { origin, cookie: cookie! } });
    expect(submitted.statusCode, submitted.body).toBe(200);
    expect(submitted.json().workDay.state).toBe("SUBMITTED");
    const locked = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/breaks`, headers: { origin, cookie: cookie! },
      payload: { startAt: "2026-09-26T03:00:00Z", endAt: "2026-09-26T03:15:00Z" },
    });
    expect(locked.statusCode).toBe(409);
  });

  it("lets the current Leader approve or return submitted worker entries", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];

    const pending = await app.inject({ method: "GET", url: "/api/approvals/pending", headers: { cookie: cookie! } });
    expect(pending.statusCode, pending.body).toBe(200);
    expect(pending.json().entries.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining(submittedEntryIds));

    const approved = await app.inject({
      method: "POST", url: `/api/approvals/${submittedEntryIds[0]}/decision`, headers: { origin, cookie: cookie! },
      payload: { action: "APPROVED" },
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().decision).toMatchObject({ state: "APPROVED", workDayState: "PARTIALLY_APPROVED" });

    const missingReason = await app.inject({
      method: "POST", url: `/api/approvals/${submittedEntryIds[1]}/decision`, headers: { origin, cookie: cookie! },
      payload: { action: "RETURNED" },
    });
    expect(missingReason.statusCode).toBe(400);

    const returned = await app.inject({
      method: "POST", url: `/api/approvals/${submittedEntryIds[1]}/decision`, headers: { origin, cookie: cookie! },
      payload: { action: "RETURNED", reason: "Doplňte prosím vykázaný čas." },
    });
    expect(returned.statusCode, returned.body).toBe(200);
    expect(returned.json().decision).toMatchObject({ state: "RETURNED", workDayState: "RETURNED" });

    const [stored] = await db<Array<{ state: string; count: number }>>`
      select wd.state, count(a.id)::int as count from work_days wd
      join work_entries we on we.work_day_id = wd.id join approvals a on a.work_entry_id = we.id
      where wd.id = ${submittedWorkDayId} group by wd.state
    `;
    expect(stored).toEqual({ state: "RETURNED", count: 2 });
    await expect(async () => {
      await db`update approvals set reason = 'Nelze měnit' where work_entry_id = ${submittedEntryIds[1]!}`;
    }).rejects.toThrow();
  });

  it("resubmits only returned entries while preserving approved work", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "worker@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const submitted = await app.inject({
      method: "POST", url: `/api/workdays/${submittedWorkDayId}/submit`, headers: { origin, cookie: cookie! },
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    expect(submitted.json().workDay.state).toBe("PARTIALLY_APPROVED");
    const entries = await db<Array<{ id: string; state: string }>>`
      select id, state from work_entries where id in (${submittedEntryIds[0]!}, ${submittedEntryIds[1]!}) order by id
    `;
    expect(entries.map((item) => item.state).sort()).toEqual(["APPROVED", "SUBMITTED"]);
  });
});
