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
  let passengerEmployeeId = "";
  let projectId = "";
  let machineId = "";
  let attachmentId = "";
  let vehicleId = "";
  let submittedWorkDayId = "";
  let submittedEntryIds: string[] = [];
  let sharedVehicleTripId = "";

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
    const [passengerEmployee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-004', 'Test Cestující') returning id
    `;
    passengerEmployeeId = passengerEmployee!.id;
    const [passengerUser] = await db<Array<{ id: string }>>`
      insert into users (employee_id, email, password_hash)
      values (${passengerEmployeeId}, 'passenger@zenops.test', ${passwordHash}) returning id
    `;
    await db`insert into user_roles (user_id, role_id) select ${passengerUser!.id}, id from roles where code = 'WORKER'`;
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

  it("keeps daily records exclusive to Worker accounts", async () => {
    for (const email of ["leader@zenops.test", "admin@zenops.test"]) {
      const login = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email, password } });
      const setCookie = login.headers["set-cookie"];
      const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      const cookie = cookieHeader?.split(";", 1)[0];
      const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
      expect(me.json().user.permissions).not.toContain("workday.own.manage");
      const create = await app.inject({
        method: "POST", url: "/api/workdays", headers: { origin, cookie: cookie! },
        payload: { workDate: "2026-09-24", shiftType: "MORNING" },
      });
      expect(create.statusCode).toBe(403);
    }
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

    const fuel = await app.inject({
      method: "PUT", url: `/api/projects/${projectId}/day/fuel?date=2026-09-25`, headers: { origin, cookie: cookie! },
      payload: { category: "BRUSHCUTTER", fuelConsumed: 12.5, fuelRefuelled: 15, note: "Společná směna" },
    });
    expect(fuel.statusCode, fuel.body).toBe(200);
    const correctedFuel = await app.inject({
      method: "PUT", url: `/api/projects/${projectId}/day/fuel?date=2026-09-25`, headers: { origin, cookie: cookie! },
      payload: { category: "BRUSHCUTTER", fuelConsumed: 13, fuelRefuelled: 15, note: "Opravená spotřeba" },
    });
    expect(correctedFuel.statusCode, correctedFuel.body).toBe(200);
    const fuelLoaded = await app.inject({
      method: "GET", url: `/api/projects/${projectId}/day?date=2026-09-25`, headers: { cookie: cookie! },
    });
    expect(fuelLoaded.json().fuelRecords).toContainEqual(expect.objectContaining({
      category: "BRUSHCUTTER", fuelConsumed: "13.00", recordedByName: "Test Vedoucí",
    }));
    const [fuelStorage] = await db<Array<{ records: number; audits: number }>>`
      select (select count(*)::int from project_fuel_records) as records,
        (select count(*)::int from audit_logs where action = 'PROJECT_FUEL_SAVED') as audits
    `;
    expect(fuelStorage).toEqual({ records: 1, audits: 2 });
  });

  it("allows Leader to create machine, attachment and vehicle catalogue items", async () => {
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
    const vehicle = await app.inject({
      method: "POST", url: "/api/assets/vehicles", headers: { origin, cookie: cookie! },
      payload: { code: "dod-01", name: "Dodávka 01", registrationNumber: "1ab 2345" },
    });
    expect(vehicle.statusCode, vehicle.body).toBe(201);
    vehicleId = vehicle.json().vehicle.id as string;
  });

  it("allows audited catalogue edits without deleting historical assets", async () => {
    const login = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "admin@zenops.test", password } });
    const setCookie = login.headers["set-cookie"]; const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie; const cookie = cookieHeader?.split(";", 1)[0];
    const machine = await app.inject({ method: "PATCH", url: `/api/assets/machines/${machineId}`, headers: { origin, cookie: cookie! }, payload: { code: "TR-01", name: "Traktor hlavní", typeName: "Traktor", tracksMth: true, isActive: true, reason: "Upřesnění názvu" } });
    expect(machine.statusCode, machine.body).toBe(200);
    const attachment = await app.inject({ method: "PATCH", url: `/api/assets/attachments/${attachmentId}`, headers: { origin, cookie: cookie! }, payload: { code: "MUL-01", name: "Mulčovač hlavní", typeName: "Mulčovač", uniquelyTracked: true, isActive: true, reason: "Upřesnění názvu" } });
    expect(attachment.statusCode, attachment.body).toBe(200);
    const vehicle = await app.inject({ method: "PATCH", url: `/api/assets/vehicles/${vehicleId}`, headers: { origin, cookie: cookie! }, payload: { code: "DOD-01", name: "Dodávka hlavní", registrationNumber: "1AB 2345", isActive: true, reason: "Upřesnění názvu" } });
    expect(vehicle.statusCode, vehicle.body).toBe(200);
    const listing = await app.inject({ method: "GET", url: "/api/assets?includeInactive=true", headers: { cookie: cookie! } });
    expect(listing.json().attachments).toContainEqual(expect.objectContaining({ id: attachmentId, name: "Mulčovač hlavní", isActive: true }));
    const [audit] = await db<Array<{ count: number }>>`select count(*)::int as count from audit_logs where action in ('MACHINE_UPDATED','ATTACHMENT_UPDATED','VEHICLE_UPDATED')`;
    expect(audit!.count).toBe(3);
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

  it("allows Admin to edit employee identity and roles and revokes existing sessions", async () => {
    const adminLogin = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "admin@zenops.test", password } });
    const adminSetCookie = adminLogin.headers["set-cookie"]; const adminCookieHeader = Array.isArray(adminSetCookie) ? adminSetCookie[0] : adminSetCookie; const adminCookie = adminCookieHeader?.split(";", 1)[0];
    const workerLogin = await app.inject({ method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "passenger@zenops.test", password } });
    const workerSetCookie = workerLogin.headers["set-cookie"]; const workerCookieHeader = Array.isArray(workerSetCookie) ? workerSetCookie[0] : workerSetCookie; const workerCookie = workerCookieHeader?.split(";", 1)[0];
    const changed = await app.inject({ method: "PATCH", url: `/api/employees/${passengerEmployeeId}`, headers: { origin, cookie: adminCookie! }, payload: { employeeNumber: "TEST-004", displayName: "Upravený Cestující", email: "passenger@zenops.test", roles: ["WORKER"], reason: "Oprava osobních údajů" } });
    expect(changed.statusCode, changed.body).toBe(200);
    expect(changed.json().employee).toMatchObject({ displayName: "Upravený Cestující", roles: ["WORKER"] });
    const revoked = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: workerCookie! } });
    expect(revoked.statusCode).toBe(401);
    const [audit] = await db<Array<{ count: number }>>`select count(*)::int as count from audit_logs where action='EMPLOYEE_UPDATED' and entity_id=${passengerEmployeeId}`;
    expect(audit!.count).toBe(1);
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

    const tripPayload = {
      vehicleId, startAt: "2026-09-25T20:00:00Z", endAt: "2026-09-25T21:00:00Z",
      startOdometerKm: 1000, endOdometerKm: 1042.5, fuelConsumed: 4.2, fuelRefuelled: 10,
      passengerEmployeeIds: [passengerEmployeeId], note: "Přeprava posádky",
    };
    const trip = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/vehicle-trips`, headers: { origin, cookie: cookie! }, payload: tripPayload,
    });
    expect(trip.statusCode, trip.body).toBe(201);
    sharedVehicleTripId = trip.json().trip.id as string;
    const overlappingTrip = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/vehicle-trips`, headers: { origin, cookie: cookie! },
      payload: { ...tripPayload, startAt: "2026-09-25T20:30:00Z", endAt: "2026-09-25T21:30:00Z" },
    });
    expect(overlappingTrip.statusCode).toBe(409);
    const [tripData] = await db<Array<{ drivers: number; passengers: number }>>`
      select count(*) filter (where role = 'DRIVER')::int as drivers,
        count(*) filter (where role = 'PASSENGER')::int as passengers
      from vehicle_trip_participants where vehicle_trip_id = ${trip.json().trip.id}
    `;
    expect(tripData).toEqual({ drivers: 1, passengers: 1 });

    const submitted = await app.inject({ method: "POST", url: `/api/workdays/${workDayId}/submit`, headers: { origin, cookie: cookie! } });
    expect(submitted.statusCode, submitted.body).toBe(200);
    expect(submitted.json().workDay.state).toBe("SUBMITTED");
    const locked = await app.inject({
      method: "POST", url: `/api/workdays/${workDayId}/breaks`, headers: { origin, cookie: cookie! },
      payload: { startAt: "2026-09-26T03:00:00Z", endAt: "2026-09-26T03:15:00Z" },
    });
    expect(locked.statusCode).toBe(409);
  });

  it("shows a shared trip to its passenger without duplicating operational data", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "passenger@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST", url: "/api/workdays", headers: { origin, cookie: cookie! },
      payload: { workDate: "2026-09-25", shiftType: "NIGHT" },
    });
    expect(created.statusCode, created.body).toBe(201);
    const detail = await app.inject({
      method: "GET", url: "/api/workdays/current?date=2026-09-25", headers: { cookie: cookie! },
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().workDay.vehicleTrips).toContainEqual(expect.objectContaining({
      id: sharedVehicleTripId, vehicleCode: "DOD-01", startOdometerKm: "1000.0", endOdometerKm: "1042.5",
    }));
    const [count] = await db<Array<{ count: number }>>`select count(*)::int as count from vehicle_trips where id = ${sharedVehicleTripId}`;
    expect(count!.count).toBe(1);
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

  it("builds a scoped live daily report and denies Worker report access", async () => {
    const leaderLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "leader@zenops.test", password },
    });
    const leaderSetCookie = leaderLogin.headers["set-cookie"];
    const leaderCookieHeader = Array.isArray(leaderSetCookie) ? leaderSetCookie[0] : leaderSetCookie;
    const leaderCookie = leaderCookieHeader?.split(";", 1)[0];
    const report = await app.inject({
      method: "GET", url: "/api/reports/daily?date=2026-09-25", headers: { cookie: leaderCookie! },
    });
    expect(report.statusCode, report.body).toBe(200);
    expect(report.json().report).toMatchObject({
      date: "2026-09-25", scope: "LEADER", summary: { entries: 2, workers: 1, approvedMinutes: 240, provisionalMinutes: 60 },
    });
    expect(report.json().report.entries[0]).toEqual(expect.objectContaining({ projectCode: "Z-001" }));
    expect(report.json().report.trips).toHaveLength(1);
    expect(report.json().report.fuelRecords).toHaveLength(1);

    const workerLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "worker@zenops.test", password },
    });
    const workerSetCookie = workerLogin.headers["set-cookie"];
    const workerCookieHeader = Array.isArray(workerSetCookie) ? workerSetCookie[0] : workerSetCookie;
    const workerCookie = workerCookieHeader?.split(";", 1)[0];
    const denied = await app.inject({
      method: "GET", url: "/api/reports/daily?date=2026-09-25", headers: { cookie: workerCookie! },
    });
    expect(denied.statusCode).toBe(403);
  });

  it("reports monthly totals and enforces audited Admin closure and reopen", async () => {
    const adminLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "admin@zenops.test", password },
    });
    const adminSetCookie = adminLogin.headers["set-cookie"];
    const adminCookieHeader = Array.isArray(adminSetCookie) ? adminSetCookie[0] : adminSetCookie;
    const adminCookie = adminCookieHeader?.split(";", 1)[0];
    const periodBefore = await app.inject({ method: "GET", url: "/api/periods/2026-09", headers: { cookie: adminCookie! } });
    expect(periodBefore.statusCode, periodBefore.body).toBe(200);
    expect(periodBefore.json().period).toMatchObject({ state: "OPEN", unresolvedWorkDays: 2 });
    const monthly = await app.inject({ method: "GET", url: "/api/reports/monthly?month=2026-09", headers: { cookie: adminCookie! } });
    expect(monthly.statusCode, monthly.body).toBe(200);
    expect(monthly.json().report).toMatchObject({ month: "2026-09", scope: "GLOBAL" });
    expect(monthly.json().report.employeeHours).toContainEqual(expect.objectContaining({ displayName: "Test Pracovník", workedMinutes: 300 }));
    expect(monthly.json().report.orderHours).toContainEqual(expect.objectContaining({ code: "Z-001", workedMinutes: 300 }));
    expect(monthly.json().report.machines).toContainEqual(expect.objectContaining({ code: "TR-01", mth: "2.00" }));
    expect(monthly.json().report.vehicles).toContainEqual(expect.objectContaining({ code: "DOD-01", kilometres: "42.5" }));

    const blocked = await app.inject({
      method: "POST", url: "/api/periods/2026-09/action", headers: { origin, cookie: adminCookie! }, payload: { action: "CLOSE" },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().unresolvedWorkDays).toBeGreaterThan(0);

    await db`delete from work_days where employee_id = ${passengerEmployeeId} and work_date = '2026-09-25'`;
    const leaderLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "leader@zenops.test", password },
    });
    const leaderSetCookie = leaderLogin.headers["set-cookie"];
    const leaderCookieHeader = Array.isArray(leaderSetCookie) ? leaderSetCookie[0] : leaderSetCookie;
    const leaderCookie = leaderCookieHeader?.split(";", 1)[0];
    const approved = await app.inject({
      method: "POST", url: `/api/approvals/${submittedEntryIds[1]}/decision`, headers: { origin, cookie: leaderCookie! },
      payload: { action: "APPROVED" },
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().decision.workDayState).toBe("APPROVED");

    const closed = await app.inject({
      method: "POST", url: "/api/periods/2026-09/action", headers: { origin, cookie: adminCookie! }, payload: { action: "CLOSE" },
    });
    expect(closed.statusCode, closed.body).toBe(200);
    expect(closed.json().period.state).toBe("CLOSED");
    const closedEdit = await app.inject({
      method: "PUT", url: `/api/projects/${projectId}/day?date=2026-09-25`, headers: { origin, cookie: adminCookie! },
      payload: { weather: "Slunečno" },
    });
    expect(closedEdit.statusCode).toBe(409);
    const invalidReopen = await app.inject({
      method: "POST", url: "/api/periods/2026-09/action", headers: { origin, cookie: adminCookie! }, payload: { action: "REOPEN", reason: "" },
    });
    expect(invalidReopen.statusCode).toBe(400);
    const reopened = await app.inject({
      method: "POST", url: "/api/periods/2026-09/action", headers: { origin, cookie: adminCookie! },
      payload: { action: "REOPEN", reason: "Oprava schválených provozních údajů" },
    });
    expect(reopened.statusCode, reopened.body).toBe(200);
    expect(reopened.json().period).toMatchObject({ state: "OPEN", reopenReason: "Oprava schválených provozních údajů" });
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action in ('MONTHLY_PERIOD_CLOSED', 'MONTHLY_PERIOD_REOPENED')
    `;
    expect(audit!.count).toBe(2);
  });

  it("allows Admin to correct complete daily operational data with audit history", async () => {
    const login=await app.inject({method:"POST",url:"/api/auth/login",headers:{origin},payload:{email:"admin@zenops.test",password}});const setCookie=login.headers["set-cookie"];const cookieHeader=Array.isArray(setCookie)?setCookie[0]:setCookie;const cookie=cookieHeader?.split(";",1)[0];
    const listing=await app.inject({method:"GET",url:"/api/admin/workdays?date=2026-09-25",headers:{cookie:cookie!}});expect(listing.statusCode,listing.body).toBe(200);expect(listing.json().workDays.length).toBeGreaterThan(0);
    const [entry]=await db<Array<{id:string;projectId:string;startAt:Date;endAt:Date}>>`select id,project_id,start_at,end_at from work_entries where id=${submittedEntryIds[0]!}`;
    const corrected=await app.inject({method:"PATCH",url:`/api/admin/work-entries/${entry!.id}`,headers:{origin,cookie:cookie!},payload:{projectId:entry!.projectId,workTypeCode:"MACHINE_MOWING",startAt:entry!.startAt.toISOString(),endAt:entry!.endAt.toISOString(),description:"Administrativně ověřeno",reason:"Oprava popisu"}});expect(corrected.statusCode,corrected.body).toBe(200);
    const [breakEntry]=await db<Array<{id:string;startAt:Date;endAt:Date}>>`select id,start_at,end_at from break_entries limit 1`;const breakResult=await app.inject({method:"PATCH",url:`/api/admin/breaks/${breakEntry!.id}`,headers:{origin,cookie:cookie!},payload:{startAt:breakEntry!.startAt.toISOString(),endAt:breakEntry!.endAt.toISOString(),reason:"Kontrola přestávky"}});expect(breakResult.statusCode,breakResult.body).toBe(200);
    const [usage]=await db<Array<{id:string;machineId:string;enteredStartMth:string;endMth:string;fuelConsumed:string|null;fuelRefuelled:string|null}>>`select id,machine_id,entered_start_mth,end_mth,fuel_consumed,fuel_refuelled from machine_usages limit 1`;
    const usageResult=await app.inject({method:"PATCH",url:`/api/admin/machine-usages/${usage!.id}`,headers:{origin,cookie:cookie!},payload:{machineId:usage!.machineId,startMth:Number(usage!.enteredStartMth),endMth:Number(usage!.endMth),fuelConsumed:Number(usage!.fuelConsumed),fuelRefuelled:Number(usage!.fuelRefuelled),attachmentIds:[attachmentId],reason:"Kontrola technických údajů"}});expect(usageResult.statusCode,usageResult.body).toBe(200);
    const [trip]=await db<Array<{id:string;vehicleId:string;startAt:Date;endAt:Date;startOdometerKm:string;endOdometerKm:string}>>`select id,vehicle_id,start_at,end_at,start_odometer_km,end_odometer_km from vehicle_trips where id=${sharedVehicleTripId}`;
    const tripResult=await app.inject({method:"PATCH",url:`/api/admin/vehicle-trips/${trip!.id}`,headers:{origin,cookie:cookie!},payload:{vehicleId:trip!.vehicleId,startAt:trip!.startAt.toISOString(),endAt:trip!.endAt.toISOString(),startOdometerKm:Number(trip!.startOdometerKm),endOdometerKm:Number(trip!.endOdometerKm),passengerEmployeeIds:[passengerEmployeeId],note:"Administrativně ověřeno",reason:"Oprava poznámky"}});expect(tripResult.statusCode,tripResult.body).toBe(200);
    const decision=await app.inject({method:"POST",url:`/api/admin/work-entries/${entry!.id}/decision`,headers:{origin,cookie:cookie!},payload:{action:"APPROVED",reason:"Administrativní potvrzení"}});expect(decision.statusCode,decision.body).toBe(200);
    const [audit]=await db<Array<{count:number}>>`select count(*)::int as count from audit_logs where action in ('WORK_ENTRY_ADMIN_CORRECTED','BREAK_ADMIN_CORRECTED','MACHINE_USAGE_ADMIN_CORRECTED','VEHICLE_TRIP_ADMIN_CORRECTED','APPROVAL_ADMIN_CORRECTED')`;expect(audit!.count).toBe(5);
  });

  it("changes the authenticated password, audits it and revokes every session", async () => {
    const login = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const incorrect = await app.inject({
      method: "POST", url: "/api/auth/password", headers: { origin, cookie: cookie! },
      payload: { currentPassword: "Incorrect-Password!", newPassword: "A-New-Secure-Password-2026!" },
    });
    expect(incorrect.statusCode).toBe(401);
    const changed = await app.inject({
      method: "POST", url: "/api/auth/password", headers: { origin, cookie: cookie! },
      payload: { currentPassword: password, newPassword: "A-New-Secure-Password-2026!" },
    });
    expect(changed.statusCode).toBe(204);
    const revoked = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: cookie! } });
    expect(revoked.statusCode).toBe(401);
    const oldLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin }, payload: { email: "admin@zenops.test", password },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await app.inject({
      method: "POST", url: "/api/auth/login", headers: { origin },
      payload: { email: "admin@zenops.test", password: "A-New-Secure-Password-2026!" },
    });
    expect(newLogin.statusCode).toBe(204);
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'PASSWORD_CHANGED'
    `;
    expect(audit!.count).toBe(1);
  });
});
