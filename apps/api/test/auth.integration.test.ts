import { hash } from "@node-rs/argon2";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSession, getSessionUser } from "../src/auth.js";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { reportHtml } from "../src/reports.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const origin = "https://zenops.test";
const password = "Correct-Horse-2026!";
let loginRequestNumber = 0;

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

  async function intervalContext(code: string) {
    const [employee] = await db`insert into employees(employee_number,display_name) values(${`TIME-${code.toUpperCase()}`},${`Time ${code}`}) returning id`;
    const [user] = await db`insert into users(employee_id,username,email,password_hash)
      values(${employee!.id},${`time-${code}`},${`time-${code}@zenops.test`},'test-only-unused-hash') returning id`;
    await db`insert into user_roles(user_id,role_id) select ${user!.id},id from roles where code='WORKER'`;
    const [project] = await db`insert into projects(code,name,location,current_leader_employee_id,start_date,created_by_user_id)
      values(${`TIME-${code.toUpperCase()}`},'Time checks','Test',${leaderEmployeeId},'2027-01-01',${user!.id}) returning id`;
    const cookie = `zenops_session=${(await createSession(db,user!.id,1,{})).token}`;
    const headers = { origin, cookie };
    const createDay = async (workDate: string) => {
      const response = await app.inject({method:'POST',url:'/api/workdays',headers,payload:{workDate,shiftType:'NIGHT'}});
      expect(response.statusCode,response.body).toBe(201);
      return response.json().workDay.id as string;
    };
    const addWork = (dayId: string, startAt: string, endAt: string) => app.inject({method:'POST',url:`/api/workdays/${dayId}/entries`,headers,
      payload:{projectId:project!.id,workTypeCode:'OTHER',description:'Time regression',startAt,endAt}});
    const addBreak = (dayId: string, startAt: string, endAt: string) => app.inject({method:'POST',url:`/api/workdays/${dayId}/breaks`,headers,payload:{startAt,endAt}});
    return { employeeId: employee!.id, userId: user!.id, projectId: project!.id, headers, createDay, addWork, addBreak };
  }

  async function headersFor(username: string) {
    const [user] = await db`select id from users where username=${username}`;
    return { origin, cookie: `zenops_session=${(await createSession(db,user!.id,1,{})).token}` };
  }

  async function multipleMachineContext(code: string, date: string) {
    const context = await intervalContext(`multi-${code}`);
    const dayId = await context.createDay(date);
    const entry = await context.addWork(dayId,`${date}T08:00:00+01:00`,`${date}T10:00:00+01:00`);
    expect(entry.statusCode,entry.body).toBe(201);
    const [machineType] = await db`insert into machine_types(name,tracks_mth) values(${`Multi ${code}`},true) returning id`;
    const machines = await db<Array<{id:string;code:string}>>`insert into machines(machine_type_id,code,name) values
      (${machineType!.id},${`MULTI-${code.toUpperCase()}-A`},'První stroj'),
      (${machineType!.id},${`MULTI-${code.toUpperCase()}-B`},'Druhý stroj') returning id,code`;
    const [attachmentType] = await db`insert into attachment_types(name) values(${`Multi ${code}`}) returning id`;
    const attachments = await db<Array<{id:string;code:string}>>`insert into attachments(attachment_type_id,code,name) values
      (${attachmentType!.id},${`MULTI-${code.toUpperCase()}-PA`},'První příslušenství'),
      (${attachmentType!.id},${`MULTI-${code.toUpperCase()}-PB`},'Druhé příslušenství') returning id,code`;
    const entryId = entry.json().entry.id as string;
    const addMachine = (machineIndex: number, attachmentIndex=machineIndex) => app.inject({method:'POST',
      url:`/api/workdays/${dayId}/entries/${entryId}/machine`,headers:context.headers,
      payload:{machineId:machines[machineIndex]!.id,startMth:100*(machineIndex+1),endMth:100*(machineIndex+1)+machineIndex+2,
        fuelConsumed:machineIndex+2,fuelRefuelled:machineIndex+3,attachmentIds:[attachments[attachmentIndex]!.id]}});
    return {...context,dayId,entryId,machines,attachments,addMachine};
  }

  beforeAll(async () => {
    const migrationDirectory = resolve(process.cwd(), "migrations");
    for (const file of (await readdir(migrationDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.unsafe(
        await readFile(resolve(migrationDirectory, file), "utf8"),
      );
    }
    const passwordHash = await hash(password);
    const [employee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-001', 'Test Pracovník') returning id
    `;
    const [user] = await db<Array<{ id: string }>>`
      insert into users (employee_id, username, email, password_hash)
      values (${employee!.id}, 'worker', 'worker@zenops.test', ${passwordHash}) returning id
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
      insert into users (employee_id, username, email, password_hash)
      values (${passengerEmployeeId}, 'passenger', 'passenger@zenops.test', ${passwordHash}) returning id
    `;
    await db`insert into user_roles (user_id, role_id) select ${passengerUser!.id}, id from roles where code = 'WORKER'`;
    const [leaderEmployee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-002', 'Test Vedoucí') returning id
    `;
    leaderEmployeeId = leaderEmployee!.id;
    const [leaderUser] = await db<Array<{ id: string }>>`
      insert into users (employee_id, username, email, password_hash)
      values (${leaderEmployeeId}, 'leader', 'leader@zenops.test', ${passwordHash}) returning id
    `;
    await db`
      insert into user_roles (user_id, role_id)
      select ${leaderUser!.id}, id from roles where code = 'LEADER'
    `;
    const [adminEmployee] = await db<Array<{ id: string }>>`
      insert into employees (employee_number, display_name) values ('TEST-003', 'Test Administrátor') returning id
    `;
    const [adminUser] = await db<Array<{ id: string }>>`
      insert into users (employee_id, username, email, password_hash)
      values (${adminEmployee!.id}, 'admin', 'admin@zenops.test', ${passwordHash}) returning id
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
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      payload: { identifier: "worker@zenops.test", password },
    });
    expect(response.statusCode).toBe(403);
  });

  it("rejects invalid credentials without creating a session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "worker@zenops.test", password: "Incorrect-Password!" },
    });
    expect(response.statusCode).toBe(401);
    const [count] = await db<
      Array<{ count: number }>
    >`select count(*)::int as count from sessions`;
    expect(count!.count).toBe(0);
  });

  it("accepts username or email and creates, resolves and revokes an opaque session", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin, "user-agent": "ZenOps test" },
      payload: { identifier: "WORKER", password },
    });
    expect(login.statusCode).toBe(204);
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    expect(cookie).toMatch(/^zenops_session=/);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie! },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user).toMatchObject({
      username: "worker",
      email: "worker@zenops.test",
      displayName: "Test Pracovník",
      roles: ["WORKER"],
    });
    expect(me.json().user.permissions).toContain("workday.own.manage");

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { origin, cookie: cookie! },
    });
    expect(logout.statusCode).toBe(204);
    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie! },
    });
    expect(afterLogout.statusCode).toBe(401);
    const [session] = await db<
      Array<{ revoked: boolean }>
    >`select revoked_at is not null as revoked from sessions`;
    expect(session!.revoked).toBe(true);
  });

  it("keeps own daily-record management unavailable to Leader accounts", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie! },
    });
    expect(me.json().user.permissions).not.toContain("workday.own.manage");
    const create = await app.inject({
      method: "POST",
      url: "/api/workdays",
      headers: { origin, cookie: cookie! },
      payload: { workDate: "2026-09-24", shiftType: "MORNING" },
    });
    expect(create.statusCode).toBe(403);
  });

  it("enforces RBAC and creates an audited project for a Leader", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];

    const created = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { origin, cookie: cookie! },
      payload: {
        code: "z-001",
        name: "Testovací projekt",
        location: "Praha",
        besip: true,
        leaderEmployeeId,
        startDate: "2026-09-25",
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().project).toMatchObject({
      code: "Z-001",
      status: "OPEN",
    });
    projectId = created.json().project.id as string;

    const listing = await app.inject({
      method: "GET",
      url: "/api/projects/open",
      headers: { cookie: cookie! },
    });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().projects[0]).toMatchObject({
      code: "Z-001",
      leaderName: "Test Vedoucí",
    });
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'PROJECT_CREATED'
    `;
    expect(audit!.count).toBe(1);
  });

  it("stores ProjectDay once and allows its current Leader to manage it", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const saved = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/day?date=2026-09-25`,
      headers: { origin, cookie: cookie! },
      payload: { weather: "Déšť", temperatureC: 12.5, note: "Mokrá vozovka" },
    });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().projectDay).toMatchObject({
      weather: "Déšť",
      temperatureC: "12.50",
    });
    const loaded = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/day?date=2026-09-25`,
      headers: { cookie: cookie! },
    });
    expect(loaded.statusCode).toBe(200);
    expect(loaded.json().projectDay.note).toBe("Mokrá vozovka");

    const fuel = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/day/fuel?date=2026-09-25`,
      headers: { origin, cookie: cookie! },
      payload: {
        category: "BRUSHCUTTER",
        fuelConsumed: 12.5,
        fuelRefuelled: 15,
        note: "Společná směna",
      },
    });
    expect(fuel.statusCode, fuel.body).toBe(200);
    const correctedFuel = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/day/fuel?date=2026-09-25`,
      headers: { origin, cookie: cookie! },
      payload: {
        category: "BRUSHCUTTER",
        fuelConsumed: 13,
        fuelRefuelled: 15,
        note: "Opravená spotřeba",
      },
    });
    expect(correctedFuel.statusCode, correctedFuel.body).toBe(200);
    const fuelLoaded = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/day?date=2026-09-25`,
      headers: { cookie: cookie! },
    });
    expect(fuelLoaded.json().fuelRecords).toContainEqual(
      expect.objectContaining({
        category: "BRUSHCUTTER",
        fuelConsumed: "13.00",
        recordedByName: "Test Vedoucí",
      }),
    );
    const [fuelStorage] = await db<Array<{ records: number; audits: number }>>`
      select (select count(*)::int from project_fuel_records) as records,
        (select count(*)::int from audit_logs where action = 'PROJECT_FUEL_SAVED') as audits
    `;
    expect(fuelStorage).toEqual({ records: 1, audits: 2 });
  });

  it("allows Leader to create machine, attachment and vehicle catalogue items", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const machine = await app.inject({
      method: "POST",
      url: "/api/assets/machines",
      headers: { origin, cookie: cookie! },
      payload: {
        code: "tr-01",
        name: "Traktor 01",
        typeName: "Traktor",
        tracksMth: true,
      },
    });
    expect(machine.statusCode, machine.body).toBe(201);
    machineId = machine.json().machine.id as string;
    const attachment = await app.inject({
      method: "POST",
      url: "/api/assets/attachments",
      headers: { origin, cookie: cookie! },
      payload: {
        code: "mul-01",
        name: "Mulčovač 01",
        typeName: "Mulčovač",
        uniquelyTracked: true,
      },
    });
    expect(attachment.statusCode, attachment.body).toBe(201);
    attachmentId = attachment.json().attachment.id as string;
    const vehicle = await app.inject({
      method: "POST",
      url: "/api/assets/vehicles",
      headers: { origin, cookie: cookie! },
      payload: {
        code: "dod-01",
        name: "Dodávka 01",
        registrationNumber: "1ab 2345",
      },
    });
    expect(vehicle.statusCode, vehicle.body).toBe(201);
    vehicleId = vehicle.json().vehicle.id as string;
  });

  it("allows audited catalogue edits without deleting historical assets", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const machine = await app.inject({
      method: "PATCH",
      url: `/api/assets/machines/${machineId}`,
      headers: { origin, cookie: cookie! },
      payload: {
        code: "TR-01",
        name: "Traktor hlavní",
        typeName: "Traktor",
        tracksMth: true,
        isActive: true,
        reason: "Upřesnění názvu",
      },
    });
    expect(machine.statusCode, machine.body).toBe(200);
    const attachment = await app.inject({
      method: "PATCH",
      url: `/api/assets/attachments/${attachmentId}`,
      headers: { origin, cookie: cookie! },
      payload: {
        code: "MUL-01",
        name: "Mulčovač hlavní",
        typeName: "Mulčovač",
        uniquelyTracked: true,
        isActive: true,
        reason: "Upřesnění názvu",
      },
    });
    expect(attachment.statusCode, attachment.body).toBe(200);
    const vehicle = await app.inject({
      method: "PATCH",
      url: `/api/assets/vehicles/${vehicleId}`,
      headers: { origin, cookie: cookie! },
      payload: {
        code: "DOD-01",
        name: "Dodávka hlavní",
        registrationNumber: "1AB 2345",
        isActive: true,
        reason: "Upřesnění názvu",
      },
    });
    expect(vehicle.statusCode, vehicle.body).toBe(200);
    const listing = await app.inject({
      method: "GET",
      url: "/api/assets?includeInactive=true",
      headers: { cookie: cookie! },
    });
    expect(listing.json().attachments).toContainEqual(
      expect.objectContaining({
        id: attachmentId,
        name: "Mulčovač hlavní",
        isActive: true,
      }),
    );
    const [audit] = await db<
      Array<{ count: number }>
    >`select count(*)::int as count from audit_logs where action in ('MACHINE_UPDATED','ATTACHMENT_UPDATED','VEHICLE_UPDATED')`;
    expect(audit!.count).toBe(3);
  });

  it("allows Admin to create and deactivate an employee without hard deletion", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/employees",
      headers: { origin, cookie: cookie! },
      payload: {
        employeeNumber: "new-004",
        displayName: "Nový Pracovník",
        username: "new.worker",
        email: "new.worker@zenops.test",
        password: "New-Worker-2026!",
        roles: ["WORKER"],
      },
    });
    expect(created.statusCode, created.body).toBe(201);
    const employeeId = created.json().employee.id as string;
    expect(created.json().employee).toMatchObject({
      employeeNumber: "NEW-004",
      roles: ["WORKER"],
    });

    const accountant = await app.inject({
      method: "POST",
      url: "/api/employees",
      headers: { origin, cookie: cookie! },
      payload: {
        employeeNumber: "ACC-004",
        displayName: "Test Účetní",
        username: "accountant.test",
        email: "accountant.test@zenops.test",
        password: "Accountant-2026!",
        roles: ["ACCOUNTANT"],
      },
    });
    expect(accountant.statusCode, accountant.body).toBe(201);
    expect(accountant.json().employee).toMatchObject({
      employeeNumber: "ACC-004",
      roles: ["ACCOUNTANT"],
    });
    const [storedAccountant] = await db<Array<{ role: string }>>`
      select r.code as role
      from users u
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id
      where u.username = 'accountant.test'
    `;
    expect(storedAccountant?.role).toBe("ACCOUNTANT");

    const multipleRoles = await app.inject({
      method: "POST",
      url: "/api/employees",
      headers: { origin, cookie: cookie! },
      payload: {
        employeeNumber: "INVALID-ROLE",
        displayName: "Neplatná kombinace",
        username: "invalid.roles",
        email: "invalid.roles@zenops.test",
        password: "Invalid-Roles-2026!",
        roles: ["WORKER", "LEADER"],
      },
    });
    expect(multipleRoles.statusCode).toBe(400);

    const [deactivationAccount] = await db`select id from users where employee_id=${employeeId}`;
    const oldSession = await createSession(db, deactivationAccount!.id, 1, {});
    const deactivated = await app.inject({
      method: "PATCH",
      url: `/api/employees/${employeeId}/state`,
      headers: { origin, cookie: cookie! },
      payload: {
        active: false,
        reason: "Ukončení testovacího pracovního poměru",
      },
    });
    expect(deactivated.statusCode, deactivated.body).toBe(200);
    const [stored] = await db<
      Array<{ employeeActive: boolean; userActive: boolean }>
    >`
      select e.is_active as employee_active, u.is_active as user_active
      from employees e join users u on u.employee_id = e.id where e.id = ${employeeId}
    `;
    expect(stored).toEqual({ employeeActive: false, userActive: false });
    const [revocation] = await db`select revoked_at from sessions where user_id=${deactivationAccount!.id}`;
    expect(revocation!.revokedAt).not.toBeNull();
    expect(await getSessionUser(db, oldSession.token)).toBeNull();
    const listing = await app.inject({
      method: "GET",
      url: "/api/employees",
      headers: { cookie: cookie! },
    });
    expect(listing.statusCode).toBe(200);
    expect(listing.json().employees).toContainEqual(
      expect.objectContaining({ id: employeeId, isActive: false }),
    );
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs
      where entity_id = ${employeeId} and action in ('EMPLOYEE_CREATED', 'EMPLOYEE_DEACTIVATED')
    `;
    expect(audit!.count).toBe(2);
  });

  it("allows Admin to edit employee identity and roles and revokes existing sessions", async () => {
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const adminSetCookie = adminLogin.headers["set-cookie"];
    const adminCookieHeader = Array.isArray(adminSetCookie)
      ? adminSetCookie[0]
      : adminSetCookie;
    const adminCookie = adminCookieHeader?.split(";", 1)[0];
    const workerLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "passenger@zenops.test", password },
    });
    const workerSetCookie = workerLogin.headers["set-cookie"];
    const workerCookieHeader = Array.isArray(workerSetCookie)
      ? workerSetCookie[0]
      : workerSetCookie;
    const workerCookie = workerCookieHeader?.split(";", 1)[0];
    const changed = await app.inject({
      method: "PATCH",
      url: `/api/employees/${passengerEmployeeId}`,
      headers: { origin, cookie: adminCookie! },
      payload: {
        employeeNumber: "TEST-004",
        displayName: "Upravený Cestující",
        username: "passenger",
        email: "passenger@zenops.test",
        roles: ["WORKER"],
        reason: "Oprava osobních údajů",
      },
    });
    expect(changed.statusCode, changed.body).toBe(200);
    expect(changed.json().employee).toMatchObject({
      displayName: "Upravený Cestující",
      username: "passenger",
      roles: ["WORKER"],
    });
    const revoked = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: workerCookie! },
    });
    expect(revoked.statusCode).toBe(401);
    const [audit] = await db<
      Array<{ count: number }>
    >`select count(*)::int as count from audit_logs where action='EMPLOYEE_UPDATED' and entity_id=${passengerEmployeeId}`;
    expect(audit!.count).toBe(1);
  });

  it("allows only Admin permission to close and reopen a project", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const closed = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}/state`,
      headers: { origin, cookie: cookie! },
      payload: { status: "CLOSED", reason: "Dokončeno" },
    });
    expect(closed.statusCode, closed.body).toBe(200);
    expect(closed.json().project.status).toBe("CLOSED");
    const allProjects = await app.inject({
      method: "GET",
      url: "/api/projects",
      headers: { cookie: cookie! },
    });
    expect(allProjects.statusCode).toBe(200);
    expect(allProjects.json().projects).toContainEqual(
      expect.objectContaining({ id: projectId, status: "CLOSED" }),
    );
    const reopened = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}/state`,
      headers: { origin, cookie: cookie! },
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

  it("allows Admin to edit a project while keeping its original Leader", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const changed = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      headers: { origin, cookie: cookie! },
      payload: {
        code: "Z-001",
        name: "Upravená zakázka",
        location: "Praha 4",
        besip: false,
        startDate: "2026-09-25",
        endDate: "2026-10-31",
        note: "Rozšířený rozsah",
        reason: "Aktualizace rozsahu zakázky",
      },
    });
    expect(changed.statusCode, changed.body).toBe(200);
    expect(changed.json().project).toMatchObject({
      name: "Upravená zakázka",
      leaderEmployeeId,
      leaderName: "Test Vedoucí",
    });
    const restored = await app.inject({
      method: "PATCH",
      url: `/api/projects/${projectId}`,
      headers: { origin, cookie: cookie! },
      payload: {
        code: "Z-001",
        name: "Testovací projekt",
        location: "Praha",
        besip: true,
        startDate: "2026-09-25",
        endDate: null,
        note: null,
        reason: "Obnovení údajů pro navazující testy",
      },
    });
    expect(restored.statusCode, restored.body).toBe(200);
    const [history] = await db<
      Array<{ total: number; current: number; audits: number }>
    >`
      select
        (select count(*)::int from project_leader_history where project_id=${projectId}) as total,
        (select count(*)::int from project_leader_history where project_id=${projectId} and effective_to is null) as current,
        (select count(*)::int from audit_logs where entity_id=${projectId} and action='PROJECT_UPDATED') as audits
    `;
    expect(history).toEqual({ total: 1, current: 1, audits: 2 });
  });

  it("creates a night WorkDay, prevents overlaps and submits it", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "worker@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/workdays",
      headers: { origin, cookie: cookie! },
      payload: { workDate: "2026-09-25", shiftType: "NIGHT" },
    });
    expect(created.statusCode, created.body).toBe(201);
    const workDayId = created.json().workDay.id as string;
    submittedWorkDayId = workDayId;

    const missingActivity = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/entries`,
      headers: { origin, cookie: cookie! },
      payload: {
        projectId,
        workTypeCode: "TREE_CUTTING",
        startAt: "2026-09-25T22:00:00Z",
        endAt: "2026-09-26T02:00:00Z",
      },
    });
    expect(missingActivity.statusCode).toBe(422);

    const entry = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/entries`,
      headers: { origin, cookie: cookie! },
      payload: {
        projectId,
        workTypeCode: "TREE_CUTTING",
        workActivityCode: "SAWYER",
        startAt: "2026-09-25T22:00:00Z",
        endAt: "2026-09-26T02:00:00Z",
      },
    });
    expect(entry.statusCode, entry.body).toBe(201);
    const entryId = entry.json().entry.id as string;
    const [projectDays] = await db<Array<{ count: number }>>`
      select count(*)::int as count from project_days where project_id = ${projectId} and work_date = '2026-09-25'
    `;
    expect(projectDays!.count).toBe(1);
    const usage = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/entries/${entryId}/machine`,
      headers: { origin, cookie: cookie! },
      payload: {
        machineId,
        startMth: 10,
        endMth: 11,
        fuelConsumed: 20,
        fuelRefuelled: 25,
        attachmentIds: [attachmentId],
      },
    });
    expect(usage.statusCode, usage.body).toBe(201);

    const overlap = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/breaks`,
      headers: { origin, cookie: cookie! },
      payload: {
        startAt: "2026-09-26T01:30:00Z",
        endAt: "2026-09-26T02:15:00Z",
      },
    });
    expect(overlap.statusCode).toBe(409);
    const breakEntry = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/breaks`,
      headers: { origin, cookie: cookie! },
      payload: {
        startAt: "2026-09-26T02:00:00Z",
        endAt: "2026-09-26T02:30:00Z",
      },
    });
    expect(breakEntry.statusCode, breakEntry.body).toBe(201);

    const secondEntry = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/entries`,
      headers: { origin, cookie: cookie! },
      payload: {
        projectId,
        workTypeCode: "MACHINE_MOWING",
        startAt: "2026-09-26T03:00:00Z",
        endAt: "2026-09-26T04:00:00Z",
      },
    });
    const secondEntryId = secondEntry.json().entry.id as string;
    submittedEntryIds = [entryId, secondEntryId];
    const secondUsage = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/entries/${secondEntryId}/machine`,
      headers: { origin, cookie: cookie! },
      payload: {
        machineId,
        startMth: 12,
        endMth: 13,
        attachmentIds: [attachmentId],
      },
    });
    expect(secondUsage.statusCode, secondUsage.body).toBe(201);
    expect(secondUsage.json().usage.suggestedStartMth).toBe("11.00");
    const [overrideAudit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'MACHINE_START_MTH_OVERRIDDEN'
    `;
    expect(overrideAudit!.count).toBe(1);

    const tripPayload = {
      vehicleId,
      startAt: "2026-09-25T20:00:00Z",
      endAt: "2026-09-25T21:00:00Z",
      startOdometerKm: 1000,
      endOdometerKm: 1042.5,
      fuelConsumed: 4.2,
      fuelRefuelled: 10,
      passengerEmployeeIds: [passengerEmployeeId],
      note: "Přeprava posádky",
    };
    const trip = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/vehicle-trips`,
      headers: { origin, cookie: cookie! },
      payload: tripPayload,
    });
    expect(trip.statusCode, trip.body).toBe(201);
    sharedVehicleTripId = trip.json().trip.id as string;
    const overlappingTrip = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/vehicle-trips`,
      headers: { origin, cookie: cookie! },
      payload: {
        ...tripPayload,
        startAt: "2026-09-25T20:30:00Z",
        endAt: "2026-09-25T21:30:00Z",
      },
    });
    expect(overlappingTrip.statusCode).toBe(409);
    const [tripData] = await db<Array<{ drivers: number; passengers: number }>>`
      select count(*) filter (where role = 'DRIVER')::int as drivers,
        count(*) filter (where role = 'PASSENGER')::int as passengers
      from vehicle_trip_participants where vehicle_trip_id = ${trip.json().trip.id}
    `;
    expect(tripData).toEqual({ drivers: 1, passengers: 1 });

    const submitted = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/submit`,
      headers: { origin, cookie: cookie! },
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    expect(submitted.json().workDay.state).toBe("SUBMITTED");
    const locked = await app.inject({
      method: "POST",
      url: `/api/workdays/${workDayId}/breaks`,
      headers: { origin, cookie: cookie! },
      payload: {
        startAt: "2026-09-26T03:00:00Z",
        endAt: "2026-09-26T03:15:00Z",
      },
    });
    expect(locked.statusCode).toBe(409);

  });

  it("shows a shared trip to its passenger without duplicating operational data", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "passenger@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/workdays",
      headers: { origin, cookie: cookie! },
      payload: { workDate: "2026-09-25", shiftType: "NIGHT" },
    });
    expect(created.statusCode, created.body).toBe(201);
    const detail = await app.inject({
      method: "GET",
      url: "/api/workdays/current?date=2026-09-25",
      headers: { cookie: cookie! },
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().workDay.vehicleTrips).toContainEqual(
      expect.objectContaining({
        id: sharedVehicleTripId,
        vehicleCode: "DOD-01",
        startOdometerKm: "1000.0",
        endOdometerKm: "1042.5",
      }),
    );
    const [count] = await db<
      Array<{ count: number }>
    >`select count(*)::int as count from vehicle_trips where id = ${sharedVehicleTripId}`;
    expect(count!.count).toBe(1);
  });

  it("lets the current Leader approve or return submitted worker entries", async () => {
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const adminSetCookie = adminLogin.headers["set-cookie"];
    const adminCookieHeader = Array.isArray(adminSetCookie)
      ? adminSetCookie[0]
      : adminSetCookie;
    const adminCookie = adminCookieHeader?.split(";", 1)[0];
    const adminPending = await app.inject({
      method: "GET",
      url: "/api/approvals/pending",
      headers: { cookie: adminCookie! },
    });
    expect(adminPending.statusCode).toBe(403);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];

    const pending = await app.inject({
      method: "GET",
      url: "/api/approvals/pending",
      headers: { cookie: cookie! },
    });
    expect(pending.statusCode, pending.body).toBe(200);
    expect(
      pending.json().entries.map((item: { id: string }) => item.id),
    ).toEqual(expect.arrayContaining(submittedEntryIds));

    const approved = await app.inject({
      method: "POST",
      url: `/api/approvals/${submittedEntryIds[0]}/decision`,
      headers: { origin, cookie: cookie! },
      payload: { action: "APPROVED" },
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().decision).toMatchObject({
      state: "APPROVED",
      workDayState: "PARTIALLY_APPROVED",
    });

    const missingReason = await app.inject({
      method: "POST",
      url: `/api/approvals/${submittedEntryIds[1]}/decision`,
      headers: { origin, cookie: cookie! },
      payload: { action: "RETURNED" },
    });
    expect(missingReason.statusCode).toBe(400);

    const returned = await app.inject({
      method: "POST",
      url: `/api/approvals/${submittedEntryIds[1]}/decision`,
      headers: { origin, cookie: cookie! },
      payload: { action: "RETURNED", reason: "Doplňte prosím vykázaný čas." },
    });
    expect(returned.statusCode, returned.body).toBe(200);
    expect(returned.json().decision).toMatchObject({
      state: "RETURNED",
      workDayState: "RETURNED",
    });

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
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "worker@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const current = await app.inject({ method: "GET", url: "/api/workdays/current?date=2026-09-25", headers: { cookie: cookie! } });
    const returnedEntry = current.json().workDay.entries.find((entry: { id: string }) => entry.id === submittedEntryIds[1]);
    expect(returnedEntry.returnReason).toBe("Doplňte prosím vykázaný čas.");
    const payload = { projectId: returnedEntry.projectId, workTypeCode: returnedEntry.workTypeCode,
      workActivityCode: returnedEntry.workActivityCode, startAt: returnedEntry.startAt, endAt: returnedEntry.endAt,
      description: "Doplněný popis vrácené práce" };
    const corrected = await app.inject({ method: "PATCH", url: `/api/workdays/${submittedWorkDayId}/entries/${returnedEntry.id}`,
      headers: { origin, cookie: cookie! }, payload });
    expect(corrected.statusCode, corrected.body).toBe(200);
    const history = await db`select id from approvals where work_entry_id=${returnedEntry.id}`;
    expect(history).toHaveLength(1);
    const locked = await app.inject({ method: "PATCH", url: `/api/workdays/${submittedWorkDayId}/entries/${submittedEntryIds[0]}`,
      headers: { origin, cookie: cookie! }, payload });
    expect(locked.statusCode).toBe(409);
    const lockedMachine = await app.inject({ method: "POST",
      url: `/api/workdays/${submittedWorkDayId}/entries/${submittedEntryIds[0]}/machine`,
      headers: { origin, cookie: cookie! },
      payload: { machineId, startMth: 100, endMth: 101, attachmentIds: [] } });
    expect(lockedMachine.statusCode, lockedMachine.body).toBe(404);
    const submitted = await app.inject({
      method: "POST",
      url: `/api/workdays/${submittedWorkDayId}/submit`,
      headers: { origin, cookie: cookie! },
    });
    expect(submitted.statusCode, submitted.body).toBe(200);
    expect(submitted.json().workDay.state).toBe("PARTIALLY_APPROVED");
    const entries = await db<Array<{ id: string; state: string }>>`
      select id, state from work_entries where id in (${submittedEntryIds[0]!}, ${submittedEntryIds[1]!}) order by id
    `;
    expect(entries.map((item) => item.state).sort()).toEqual([
      "APPROVED",
      "SUBMITTED",
    ]);
  });

  it("builds a scoped live daily report and denies Worker report access", async () => {
    const leaderLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const leaderSetCookie = leaderLogin.headers["set-cookie"];
    const leaderCookieHeader = Array.isArray(leaderSetCookie)
      ? leaderSetCookie[0]
      : leaderSetCookie;
    const leaderCookie = leaderCookieHeader?.split(";", 1)[0];
    const report = await app.inject({
      method: "GET",
      url: "/api/reports/daily?date=2026-09-25",
      headers: { cookie: leaderCookie! },
    });
    expect(report.statusCode, report.body).toBe(200);
    expect(report.json().report).toMatchObject({
      date: "2026-09-25",
      scope: "LEADER",
      summary: {
        entries: 2,
        workers: 1,
        approvedMinutes: 240,
        provisionalMinutes: 60,
      },
    });
    expect(report.json().report.entries[0]).toEqual(
      expect.objectContaining({ projectCode: "Z-001" }),
    );
    expect(report.json().report.trips).toHaveLength(1);
    expect(report.json().report.fuelRecords).toHaveLength(1);

    const workerLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "worker@zenops.test", password },
    });
    const workerSetCookie = workerLogin.headers["set-cookie"];
    const workerCookieHeader = Array.isArray(workerSetCookie)
      ? workerSetCookie[0]
      : workerSetCookie;
    const workerCookie = workerCookieHeader?.split(";", 1)[0];
    const denied = await app.inject({
      method: "GET",
      url: "/api/reports/daily?date=2026-09-25",
      headers: { cookie: workerCookie! },
    });
    expect(denied.statusCode).toBe(403);
    const [accountant] = await db`select id from users where username = 'accountant.test'`;
    const accountantSession = await createSession(db, accountant!.id, 1, {});
    for (const url of ["/api/reports/daily?date=2026-09-25", "/api/reports/daily.pdf?date=2026-09-25", "/api/reports/monthly?month=2026-09"]) {
      expect((await app.inject({url})).statusCode).toBe(401);
      for (const cookie of [workerCookie!, `zenops_session=${accountantSession.token}`]) {
        expect((await app.inject({url, headers: {cookie}})).statusCode).toBe(403);
      }
    }
    for (const url of ["/api/reports/daily?date=invalid", "/api/reports/daily.pdf?date=2026-02-30", "/api/reports/monthly?month=2026-13"]) {
      expect((await app.inject({url, headers: {cookie: leaderCookie!}})).statusCode).toBe(400);
    }
    const empty = await app.inject({url: "/api/reports/daily?date=2000-01-01", headers: {cookie: leaderCookie!}});
    expect(empty.json().report.summary).toEqual({entries: 0, workers: 0, approvedMinutes: 0, provisionalMinutes: 0});
    const scopedMonth = await app.inject({url: "/api/reports/monthly?month=2026-09", headers: {cookie: leaderCookie!}});
    expect(scopedMonth.json().report.scope).toBe("LEADER");
    expect(scopedMonth.json().report.orderHours.map((row: {code: string}) => row.code)).toEqual(["Z-001"]);
  });

  it("reports monthly totals and enforces audited Admin closure and reopen", async () => {
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const adminSetCookie = adminLogin.headers["set-cookie"];
    const adminCookieHeader = Array.isArray(adminSetCookie)
      ? adminSetCookie[0]
      : adminSetCookie;
    const adminCookie = adminCookieHeader?.split(";", 1)[0];
    const periodBefore = await app.inject({
      method: "GET",
      url: "/api/periods/2026-09",
      headers: { cookie: adminCookie! },
    });
    expect(periodBefore.statusCode, periodBefore.body).toBe(200);
    expect(periodBefore.json().period).toMatchObject({
      state: "OPEN",
      unresolvedWorkDays: 2,
    });
    const monthly = await app.inject({
      method: "GET",
      url: "/api/reports/monthly?month=2026-09",
      headers: { cookie: adminCookie! },
    });
    expect(monthly.statusCode, monthly.body).toBe(200);
    expect(monthly.json().report).toMatchObject({
      month: "2026-09",
      scope: "GLOBAL",
    });
    expect(monthly.json().report.employeeHours).toContainEqual(
      expect.objectContaining({
        displayName: "Test Pracovník",
        workedMinutes: 300,
      }),
    );
    expect(monthly.json().report.orderHours).toContainEqual(
      expect.objectContaining({ code: "Z-001", workedMinutes: 300 }),
    );
    expect(monthly.json().report.machines).toContainEqual(
      expect.objectContaining({ code: "TR-01", mth: "2.00" }),
    );
    expect(monthly.json().report.vehicles).toContainEqual(
      expect.objectContaining({ code: "DOD-01", kilometres: "42.5" }),
    );

    const blocked = await app.inject({
      method: "POST",
      url: "/api/periods/2026-09/action",
      headers: { origin, cookie: adminCookie! },
      payload: { action: "CLOSE" },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().unresolvedWorkDays).toBeGreaterThan(0);

    await db`delete from work_days where employee_id = ${passengerEmployeeId} and work_date = '2026-09-25'`;
    const leaderLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "leader@zenops.test", password },
    });
    const leaderSetCookie = leaderLogin.headers["set-cookie"];
    const leaderCookieHeader = Array.isArray(leaderSetCookie)
      ? leaderSetCookie[0]
      : leaderSetCookie;
    const leaderCookie = leaderCookieHeader?.split(";", 1)[0];
    const approved = await app.inject({
      method: "POST",
      url: `/api/approvals/${submittedEntryIds[1]}/decision`,
      headers: { origin, cookie: leaderCookie! },
      payload: { action: "APPROVED" },
    });
    expect(approved.statusCode, approved.body).toBe(200);
    expect(approved.json().decision.workDayState).toBe("APPROVED");

    const closed = await app.inject({
      method: "POST",
      url: "/api/periods/2026-09/action",
      headers: { origin, cookie: adminCookie! },
      payload: { action: "CLOSE" },
    });
    expect(closed.statusCode, closed.body).toBe(200);
    expect(closed.json().period.state).toBe("CLOSED");
    await expect(db`update work_entries set description='Změna uzavřeného měsíce' where id=${submittedEntryIds[0]!}`).rejects.toMatchObject({ code: "55000" });

    const closedEdit = await app.inject({
      method: "PUT",
      url: `/api/projects/${projectId}/day?date=2026-09-25`,
      headers: { origin, cookie: adminCookie! },
      payload: { weather: "Slunečno" },
    });
    expect(closedEdit.statusCode).toBe(409);
    const invalidReopen = await app.inject({
      method: "POST",
      url: "/api/periods/2026-09/action",
      headers: { origin, cookie: adminCookie! },
      payload: { action: "REOPEN", reason: "" },
    });
    expect(invalidReopen.statusCode).toBe(400);
    const reopened = await app.inject({
      method: "POST",
      url: "/api/periods/2026-09/action",
      headers: { origin, cookie: adminCookie! },
      payload: {
        action: "REOPEN",
        reason: "Oprava schválených provozních údajů",
      },
    });
    expect(reopened.statusCode, reopened.body).toBe(200);
    expect(reopened.json().period).toMatchObject({
      state: "OPEN",
      reopenReason: "Oprava schválených provozních údajů",
    });
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action in ('MONTHLY_PERIOD_CLOSED', 'MONTHLY_PERIOD_REOPENED')
    `;
    expect(audit!.count).toBe(2);
  });

  it("allows Admin to correct complete daily operational data with audit history", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const listing = await app.inject({
      method: "GET",
      url: "/api/admin/workdays?date=2026-09-25",
      headers: { cookie: cookie! },
    });
    expect(listing.statusCode, listing.body).toBe(200);
    expect(listing.json().workDays.length).toBeGreaterThan(0);
    const [entry] = await db<
      Array<{ id: string; projectId: string; startAt: Date; endAt: Date }>
    >`select id,project_id,start_at,end_at from work_entries where id=${submittedEntryIds[0]!}`;
    const corrected = await app.inject({
      method: "PATCH",
      url: `/api/admin/work-entries/${entry!.id}`,
      headers: { origin, cookie: cookie! },
      payload: {
        projectId: entry!.projectId,
        workTypeCode: "MACHINE_MOWING",
        startAt: entry!.startAt.toISOString(),
        endAt: new Date(entry!.endAt.getTime() - 60000).toISOString(),
        description: "Administrativně ověřeno",
        reason: "Oprava popisu",
      },
    });
    expect(corrected.statusCode, corrected.body).toBe(200);
    const mismatches = await db`select mu.id from machine_usages mu join work_entries we on we.id=mu.work_entry_id
      where we.id=${entry!.id} and (mu.start_at<>we.start_at or mu.end_at<>we.end_at)
      union all select au.id from attachment_usages au join work_entries we on we.id=au.work_entry_id
      where we.id=${entry!.id} and (au.start_at<>we.start_at or au.end_at<>we.end_at)`;
    expect(mismatches).toHaveLength(0);

    const [breakEntry] = await db<
      Array<{ id: string; startAt: Date; endAt: Date }>
    >`select id,start_at,end_at from break_entries limit 1`;
    const breakResult = await app.inject({
      method: "PATCH",
      url: `/api/admin/breaks/${breakEntry!.id}`,
      headers: { origin, cookie: cookie! },
      payload: {
        startAt: breakEntry!.startAt.toISOString(),
        endAt: breakEntry!.endAt.toISOString(),
        reason: "Kontrola přestávky",
      },
    });
    expect(breakResult.statusCode, breakResult.body).toBe(200);
    const [usage] = await db<
      Array<{
        id: string;
        machineId: string;
        enteredStartMth: string;
        endMth: string;
        fuelConsumed: string | null;
        fuelRefuelled: string | null;
      }>
    >`select id,machine_id,entered_start_mth,end_mth,fuel_consumed,fuel_refuelled from machine_usages limit 1`;
    const usageResult = await app.inject({
      method: "PATCH",
      url: `/api/admin/machine-usages/${usage!.id}`,
      headers: { origin, cookie: cookie! },
      payload: {
        machineId: usage!.machineId,
        startMth: Number(usage!.enteredStartMth),
        endMth: Number(usage!.endMth),
        fuelConsumed: Number(usage!.fuelConsumed),
        fuelRefuelled: Number(usage!.fuelRefuelled),
        attachmentIds: [attachmentId],
        reason: "Kontrola technických údajů",
      },
    });
    expect(usageResult.statusCode, usageResult.body).toBe(200);
    const [trip] = await db<
      Array<{
        id: string;
        vehicleId: string;
        startAt: Date;
        endAt: Date;
        startOdometerKm: string;
        endOdometerKm: string;
      }>
    >`select id,vehicle_id,start_at,end_at,start_odometer_km,end_odometer_km from vehicle_trips where id=${sharedVehicleTripId}`;
    const tripResult = await app.inject({
      method: "PATCH",
      url: `/api/admin/vehicle-trips/${trip!.id}`,
      headers: { origin, cookie: cookie! },
      payload: {
        vehicleId: trip!.vehicleId,
        startAt: trip!.startAt.toISOString(),
        endAt: trip!.endAt.toISOString(),
        startOdometerKm: Number(trip!.startOdometerKm),
        endOdometerKm: Number(trip!.endOdometerKm),
        passengerEmployeeIds: [passengerEmployeeId],
        note: "Administrativně ověřeno",
        reason: "Oprava poznámky",
      },
    });
    expect(tripResult.statusCode, tripResult.body).toBe(200);
    const [audit] = await db<
      Array<{ count: number }>
    >`select count(*)::int as count from audit_logs where action in ('WORK_ENTRY_ADMIN_CORRECTED','BREAK_ADMIN_CORRECTED','MACHINE_USAGE_ADMIN_CORRECTED','VEHICLE_TRIP_ADMIN_CORRECTED')`;
    expect(audit!.count).toBe(4);
    const [machineAudit] = await db`select before_data,after_data from audit_logs where action='MACHINE_USAGE_ADMIN_CORRECTED' and entity_id=${usage!.id}`;
    expect(machineAudit!.beforeData).toHaveProperty("attachmentIds");
    expect(machineAudit!.afterData.attachmentIds).toEqual([attachmentId]);
    const [tripAudit] = await db`select before_data,after_data from audit_logs where action='VEHICLE_TRIP_ADMIN_CORRECTED' and entity_id=${trip!.id}`;
    expect(tripAudit!.beforeData).toHaveProperty("passengerEmployeeIds");
    expect(tripAudit!.afterData.passengerEmployeeIds).toEqual([passengerEmployeeId]);
  });

  it("hands over history to the current Leader and limits approved-work corrections", async () => {
    const [admin] = await db`select id from users where username='admin'`;
    const [former] = await db`select id from users where username='leader'`;
    const [worker] = await db`select id from users where username='worker'`;
    const cookieFor = async (id: string) => `zenops_session=${(await createSession(db,id,1,{})).token}`;
    const adminCookie = await cookieFor(admin!.id);
    const formerCookie = await cookieFor(former!.id);
    const workerCookie = await cookieFor(worker!.id);
    const created = await app.inject({ method: "POST", url: "/api/employees", headers: { origin, cookie: adminCookie },
      payload: { employeeNumber: "LEADER-NEW", displayName: "Nový vedoucí", username: "replacement", email: "replacement@zenops.test", password, roles: ["LEADER"] } });
    expect(created.statusCode,created.body).toBe(201);
    const replacementId = created.json().employee.id as string;
    const [replacement] = await db`select id from users where employee_id=${replacementId}`;
    const replacementCookie = await cookieFor(replacement!.id);
    const [project] = await db`select code,name,location,besip,start_date::text as start_date,end_date::text as end_date,note from projects where id=${projectId}`;
    const body = { ...project, leaderEmployeeId: replacementId, reason: "Předání zakázky novému vedoucímu" };
    const pendingDay = await app.inject({method:"POST",url:"/api/workdays",headers:{origin,cookie:workerCookie},payload:{workDate:"2026-10-02",shiftType:"MORNING"}});
    expect(pendingDay.statusCode,pendingDay.body).toBe(201);
    const pendingEntry = await app.inject({method:"POST",url:`/api/workdays/${pendingDay.json().workDay.id}/entries`,headers:{origin,cookie:workerCookie},payload:{projectId,workTypeCode:"OTHER",description:"Čekající práce k předání",startAt:"2026-10-02T06:00:00Z",endAt:"2026-10-02T07:00:00Z"}});
    expect(pendingEntry.statusCode,pendingEntry.body).toBe(201);
    expect((await app.inject({method:"POST",url:`/api/workdays/${pendingDay.json().workDay.id}/submit`,headers:{origin,cookie:workerCookie}})).statusCode).toBe(200);
    const approvalsBefore = await db`select * from approvals order by id`;
    await expect(db`update projects set current_leader_employee_id=${replacementId} where id=${projectId}`).rejects.toMatchObject({ code: "42501" });
    const denied = await app.inject({ method: "PATCH", url: `/api/projects/${projectId}`, headers: { origin, cookie: formerCookie }, payload: body });
    expect(denied.statusCode).toBe(403);
    const invalid = await app.inject({ method: "PATCH", url: `/api/projects/${projectId}`, headers: { origin, cookie: adminCookie }, payload: { ...body, leaderEmployeeId: passengerEmployeeId } });
    expect(invalid.statusCode).toBe(422);
    const missingReason = await app.inject({method:"PATCH",url:`/api/projects/${projectId}`,headers:{origin,cookie:adminCookie},payload:{...body,reason:""}});
    expect(missingReason.statusCode).toBe(400);
    const changed = await app.inject({ method: "PATCH", url: `/api/projects/${projectId}`, headers: { origin, cookie: adminCookie }, payload: body });
    expect(changed.statusCode,changed.body).toBe(200);
    const [history] = await db`select count(*)::int as total,count(*) filter(where effective_to is null)::int as current from project_leader_history where project_id=${projectId}`;
    expect(history).toEqual({total:2,current:1});
    const oldQueue = await app.inject({url:"/api/approvals/pending",headers:{cookie:formerCookie}});
    const newQueue = await app.inject({url:"/api/approvals/pending",headers:{cookie:replacementCookie}});
    expect(oldQueue.json().entries.some((entry:{id:string})=>entry.id===pendingEntry.json().entry.id)).toBe(false);
    expect(newQueue.json().entries.some((entry:{id:string})=>entry.id===pendingEntry.json().entry.id)).toBe(true);
    const oldDecision = await app.inject({method:"POST",url:`/api/approvals/${pendingEntry.json().entry.id}/decision`,headers:{origin,cookie:formerCookie},payload:{action:"APPROVED"}});
    expect(oldDecision.statusCode).toBe(403);
    const oldList = await app.inject({url:"/api/projects",headers:{cookie:formerCookie}});
    expect(oldList.json().projects.some((p: {id:string})=>p.id===projectId)).toBe(false);
    const newList = await app.inject({url:"/api/projects",headers:{cookie:replacementCookie}});
    expect(newList.json().projects.some((p: {id:string})=>p.id===projectId)).toBe(true);
    for (const [cookie,status] of [[formerCookie,404],[replacementCookie,200],[workerCookie,403]] as const) {
      const day = await app.inject({url:`/api/projects/${projectId}/day?date=2026-09-25`,headers:{cookie}});
      expect(day.statusCode,day.body).toBe(status);
    }
    const [entry] = await db`select we.id,we.start_at,we.end_at,wt.code as work_type_code,wa.code as work_activity_code
      from work_entries we join work_types wt on wt.id=we.work_type_id left join work_activities wa on wa.id=we.work_activity_id
      where we.project_id=${projectId} and we.state='APPROVED' order by we.start_at limit 1`;
    const correction = { projectId, workTypeCode:entry!.workTypeCode, workActivityCode:entry!.workActivityCode,
      startAt:entry!.startAt.toISOString(),endAt:entry!.endAt.toISOString(),description:"Ověřeno novým vedoucím",reason:"Kontrola po předání" };
    const unapprovedEdit = await app.inject({method:"PATCH",url:`/api/leader/work-entries/${pendingEntry.json().entry.id}`,headers:{origin,cookie:replacementCookie},payload:correction});
    expect(unapprovedEdit.statusCode).toBe(409);
    const movingEdit = await app.inject({method:"PATCH",url:`/api/leader/work-entries/${entry!.id}`,headers:{origin,cookie:replacementCookie},payload:{...correction,projectId:passengerEmployeeId}});
    expect(movingEdit.statusCode).toBe(409);
    const oldEdit = await app.inject({method:"PATCH",url:`/api/leader/work-entries/${entry!.id}`,headers:{origin,cookie:formerCookie},payload:correction});
    expect(oldEdit.statusCode).toBe(409);
    const newEdit = await app.inject({method:"PATCH",url:`/api/leader/work-entries/${entry!.id}`,headers:{origin,cookie:replacementCookie},payload:correction});
    expect(newEdit.statusCode,newEdit.body).toBe(200);
    expect(newEdit.json().entry.state).toBe("APPROVED");
    expect(await db`select * from approvals order by id`).toEqual(approvalsBefore);
    const newDecision = await app.inject({method:"POST",url:`/api/approvals/${pendingEntry.json().entry.id}/decision`,headers:{origin,cookie:replacementCookie},payload:{action:"APPROVED"}});
    expect(newDecision.statusCode,newDecision.body).toBe(200);
    const [decisionAuthor] = await db`select approver_employee_id from approvals where work_entry_id=${pendingEntry.json().entry.id}`;
    expect(decisionAuthor!.approverEmployeeId).toBe(replacementId);
    const oldReport = await app.inject({url:"/api/reports/daily?date=2026-09-25",headers:{cookie:formerCookie}});
    expect(oldReport.json().report.entries.some((item:{projectCode:string})=>item.projectCode===project!.code)).toBe(false);

    const listing = await app.inject({url:"/api/leader/workdays?date=2026-09-25",headers:{cookie:replacementCookie}});
    expect(listing.statusCode).toBe(200);
    expect(listing.json().workDays.length).toBeGreaterThan(0);
    expect(listing.json().workDays.every((day: {breaks:unknown[];vehicleTrips:unknown[]})=>day.breaks.length===0 && day.vehicleTrips.length===0)).toBe(true);
    const closed = await app.inject({method:"POST",url:"/api/periods/2026-09/action",headers:{origin,cookie:adminCookie},payload:{action:"CLOSE"}});
    expect(closed.statusCode,closed.body).toBe(200);
    const closedEdit = await app.inject({method:"PATCH",url:`/api/leader/work-entries/${entry!.id}`,headers:{origin,cookie:replacementCookie},payload:correction});
    expect(closedEdit.statusCode).toBe(409);
    await app.inject({method:"POST",url:"/api/periods/2026-09/action",headers:{origin,cookie:adminCookie},payload:{action:"REOPEN",reason:"Pokračování testu"}});
    const closedProject = await app.inject({method:"PATCH",url:`/api/projects/${projectId}/state`,headers:{origin,cookie:adminCookie},payload:{status:"CLOSED"}});
    expect(closedProject.statusCode).toBe(200);
    const historyRead = await app.inject({url:`/api/projects/${projectId}/day?date=2026-09-25`,headers:{cookie:replacementCookie}});
    expect(historyRead.statusCode).toBe(200);
    const demoted = await app.inject({method:"PATCH",url:`/api/employees/${replacementId}`,headers:{origin,cookie:adminCookie},payload:{employeeNumber:"LEADER-NEW",displayName:"Nový vedoucí",username:"replacement",email:"replacement@zenops.test",roles:["WORKER"],reason:"Změna pracovní role"}});
    expect(demoted.statusCode,demoted.body).toBe(200);
    expect((await app.inject({url:"/api/leader/workdays?date=2026-09-25",headers:{cookie:replacementCookie}})).statusCode).toBe(401);
    const demotedCookie = await cookieFor(replacement!.id);
    expect((await app.inject({url:`/api/projects/${projectId}/day?date=2026-09-25`,headers:{cookie:demotedCookie}})).statusCode).toBe(403);
    const restored = await app.inject({method:"PATCH",url:`/api/projects/${projectId}`,headers:{origin,cookie:adminCookie},payload:{...body,leaderEmployeeId,reason:"Obnovení vedoucího po testu"}});
    expect(restored.statusCode,restored.body).toBe(200);
  });

  it("protects employee work and breaks across days and keeps corrections and deletes synchronized", async () => {
    const context = await intervalContext('overlap');
    const night = await context.createDay('2027-01-30');
    const morning = await context.createDay('2027-01-31');
    const entry = await context.addWork(night,'2027-01-30T22:00:00+01:00','2027-01-31T06:00:00+01:00');
    expect(entry.statusCode,entry.body).toBe(201);
    expect((await context.addWork(morning,'2027-01-31T05:00:00+01:00','2027-01-31T07:00:00+01:00')).statusCode).toBe(409);
    expect((await context.addBreak(morning,'2027-01-31T05:30:00+01:00','2027-01-31T06:30:00+01:00')).statusCode).toBe(409);
    const pause = await context.addBreak(night,'2027-01-31T06:00:00+01:00','2027-01-31T06:30:00+01:00');
    expect(pause.statusCode,pause.body).toBe(201);
    expect((await context.addBreak(morning,'2027-01-31T06:15:00+01:00','2027-01-31T06:45:00+01:00')).statusCode).toBe(409);
    const adjacent = await context.addWork(morning,'2027-01-31T06:30:00+01:00','2027-01-31T07:00:00+01:00');
    expect(adjacent.statusCode,adjacent.body).toBe(201);
    const failedCorrection = await app.inject({method:'PATCH',url:`/api/workdays/${morning}/entries/${adjacent.json().entry.id}`,headers:context.headers,
      payload:{projectId:context.projectId,workTypeCode:'OTHER',description:'Correction',startAt:'2027-01-31T05:45:00+01:00',endAt:'2027-01-31T07:00:00+01:00'}});
    expect(failedCorrection.statusCode,failedCorrection.body).toBe(409);
    const [preserved] = await db`select start_at from employee_time_intervals where work_entry_id=${adjacent.json().entry.id}`;
    expect(preserved!.startAt.toISOString()).toBe('2027-01-31T05:30:00.000Z');
    const corrected = await app.inject({method:'PATCH',url:`/api/workdays/${morning}/entries/${adjacent.json().entry.id}`,headers:context.headers,
      payload:{projectId:context.projectId,workTypeCode:'OTHER',description:'Correction',startAt:'2027-01-31T06:45:00+01:00',endAt:'2027-01-31T07:00:00+01:00'}});
    expect(corrected.statusCode,corrected.body).toBe(200);
    const [projection] = await db`select start_at from employee_time_intervals where work_entry_id=${adjacent.json().entry.id}`;
    expect(projection!.startAt.toISOString()).toBe('2027-01-31T05:45:00.000Z');
    expect((await context.addBreak(morning,'2027-01-31T06:30:00+01:00','2027-01-31T06:45:00+01:00')).statusCode).toBe(201);
    const removed = await app.inject({method:'DELETE',url:`/api/workdays/${night}/entries/${entry.json().entry.id}`,headers:context.headers});
    expect(removed.statusCode).toBe(204);
    expect(await db`select id from employee_time_intervals where work_entry_id=${entry.json().entry.id}`).toHaveLength(0);
    expect((await context.addWork(morning,'2027-01-31T05:00:00+01:00','2027-01-31T06:00:00+01:00')).statusCode).toBe(201);
    const other = await intervalContext('other');
    expect((await other.addWork(await other.createDay('2027-01-31'),'2027-01-31T05:00:00+01:00','2027-01-31T06:00:00+01:00')).statusCode).toBe(201);
  });

  it("enforces Prague business dates, permits out-of-order drafts and assigns a cross-year shift to its start month", async () => {
    const context = await intervalContext('dates');
    const day = await context.createDay('2027-12-31');
    expect((await context.addWork(day,'2027-12-30T23:00:00+01:00','2027-12-31T01:00:00+01:00')).statusCode).toBe(422);
    expect((await context.addBreak(day,'2028-01-01T23:30:00+01:00','2028-01-02T00:01:00+01:00')).statusCode).toBe(422);
    const invalidTrip = await app.inject({method:'POST',url:`/api/workdays/${day}/vehicle-trips`,headers:context.headers,
      payload:{vehicleId,startAt:'2027-12-30T22:00:00+01:00',endAt:'2027-12-30T23:00:00+01:00',startOdometerKm:100,endOdometerKm:110}});
    expect(invalidTrip.statusCode,invalidTrip.body).toBe(422);
    const afterMidnight = await context.addWork(day,'2028-01-01T00:00:00+01:00','2028-01-01T06:00:00+01:00');
    expect(afterMidnight.statusCode,afterMidnight.body).toBe(201);
    const rejected = await app.inject({method:'POST',url:`/api/workdays/${day}/submit`,headers:context.headers});
    expect(rejected.statusCode,rejected.body).toBe(422);
    const [draft] = await db`select state from work_days where id=${day}`;
    expect(draft!.state).toBe('DRAFT');
    expect((await context.addWork(day,'2027-12-31T22:00:00+01:00','2028-01-01T00:00:00+01:00')).statusCode).toBe(201);
    const submitted = await app.inject({method:'POST',url:`/api/workdays/${day}/submit`,headers:context.headers});
    expect(submitted.statusCode,submitted.body).toBe(200);
    const [period] = await db`select wd.work_date::text,mp.month_start::text from work_days wd join monthly_periods mp on mp.id=wd.monthly_period_id where wd.id=${day}`;
    expect(period).toEqual({workDate:'2027-12-31',monthStart:'2027-12-01'});
    await expect(db`update work_entries set start_at='2028-01-01T06:00:00+01:00',end_at='2028-01-01T07:00:00+01:00'
      where work_day_id=${day} and start_at='2027-12-31T22:00:00+01:00'`).rejects.toMatchObject({code:'ZT002'});
    await expect(db`update work_days set work_date='2028-01-01' where id=${day}`).rejects.toMatchObject({code:'ZT001'});
  });

  it("rejects simultaneous cross-day work/break collisions at the database constraint", async () => {
    const context = await intervalContext('concurrent');
    const first = await context.createDay('2027-02-10');
    const second = await context.createDay('2027-02-11');
    const results = await Promise.all([
      context.addWork(first,'2027-02-11T01:00:00+01:00','2027-02-11T03:00:00+01:00'),
      context.addBreak(second,'2027-02-11T02:00:00+01:00','2027-02-11T04:00:00+01:00'),
    ]);
    expect(results.map((result) => result.statusCode).sort()).toEqual([201,409]);
    expect(await db`select id from employee_time_intervals where employee_id=${context.employeeId}`).toHaveLength(1);
    await expect(db`insert into break_entries(work_day_id,start_at,end_at)
      values(${second},'2027-02-11T02:15:00+01:00','2027-02-11T02:30:00+01:00')`).rejects.toMatchObject({code:'23P01'});
  });

  it.each([
    ['overlap','Historical employee intervals overlap'],
    ['date','Historical intervals are outside their business dates'],
    ['start','Historical shifts do not start on their business date'],
    ['valid','Valid fixture rolled back'],
  ])("checks historical %s data before migration without rewriting source records", async (scenario, message) => {
    const migrationDirectory = resolve(process.cwd(), 'migrations');
    await expect(db.begin(async (transaction) => {
      await transaction`create schema legacy_time_check`;
      await transaction`set local search_path to legacy_time_check,public`;
      for (const file of (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql') && name<'0019').sort()) {
        await transaction.unsafe(await readFile(resolve(migrationDirectory,file),'utf8'));
      }
      const [employee] = await transaction`insert into employees(employee_number,display_name) values('LEGACY','Legacy') returning id`;
      const [user] = await transaction`insert into users(employee_id,username,email,password_hash) values(${employee!.id},'legacy','legacy@test.invalid','unused') returning id`;
      await transaction`insert into user_roles(user_id,role_id) select ${user!.id},id from roles where code='LEADER'`;
      const [project] = await transaction`insert into projects(code,name,location,current_leader_employee_id,start_date,created_by_user_id)
        values('LEGACY','Legacy','Test',${employee!.id},'2027-01-01',${user!.id}) returning id`;
      const [period] = await transaction`insert into monthly_periods(month_start) values('2027-01-01') returning id`;
      const days = await transaction`insert into work_days(employee_id,monthly_period_id,work_date,shift_type)
        values(${employee!.id},${period!.id},'2027-01-01','NIGHT'),(${employee!.id},${period!.id},'2027-01-02','MORNING') returning id`;
      const [projectDay] = await transaction`insert into project_days(project_id,work_date) values(${project!.id},'2027-01-01') returning id`;
      const [workType] = await transaction`select id from work_types where code='OTHER'`;
      await transaction`insert into work_entries(work_day_id,project_id,project_day_id,work_type_id,start_at,end_at,description)
        values(${days[0]!.id},${project!.id},${projectDay!.id},${workType!.id},
          ${scenario==='date' ? '2027-01-03T01:00:00+01:00' : scenario==='valid' ? '2027-01-01T22:00:00+01:00' : '2027-01-02T01:00:00+01:00'},
          ${scenario==='date' ? '2027-01-03T03:00:00+01:00' : '2027-01-02T03:00:00+01:00'},'Legacy')`;
      if (scenario==='overlap') await transaction`insert into break_entries(work_day_id,start_at,end_at) values(${days[1]!.id},'2027-01-02T02:00:00+01:00','2027-01-02T04:00:00+01:00')`;
      if (scenario==='start') await transaction`update work_days set state='SUBMITTED' where id=${days[0]!.id}`;
      if (scenario==='valid') await transaction`insert into break_entries(work_day_id,start_at,end_at) values(${days[1]!.id},'2027-01-02T03:00:00+01:00','2027-01-02T04:00:00+01:00')`;
      const diagnostics = await transaction.unsafe(await readFile(resolve(process.cwd(),'../../ops/check-workday-times.sql'),'utf8'));
      expect(diagnostics.map((result) => result.length)).toEqual([
        scenario==='overlap' ? 1 : 0, scenario==='date' ? 1 : 0, scenario==='start' ? 1 : 0,
      ]);
      const before = await transaction`select row_to_json(we) as data from work_entries we order by id`;
      await transaction.unsafe(await readFile(resolve(migrationDirectory,'0019_employee_intervals_and_business_dates.sql'),'utf8'));
      if (scenario==='valid') {
        expect(await transaction`select row_to_json(we) as data from work_entries we order by id`).toEqual(before);
        expect(await transaction`select id from employee_time_intervals`).toHaveLength(2);
        throw new Error('Valid fixture rolled back');
      }
    })).rejects.toThrow(message!);
    expect(await db`select schema_name from information_schema.schemata where schema_name='legacy_time_check'`).toHaveLength(0);
    expect(await db`select id from employee_time_intervals limit 1`).toHaveLength(1);
  });

  it("uses elapsed time through both Prague DST changes without imposing twelve-hour shifts", async () => {
    const context = await intervalContext('dst');
    for (const [date,startAt,endAt] of [
      ['2027-03-28','2027-03-28T01:30:00+01:00','2027-03-28T03:30:00+02:00'],
      ['2027-10-31','2027-10-31T02:30:00+02:00','2027-10-31T02:30:00+01:00'],
    ]) {
      const day = await context.createDay(date!);
      const result = await context.addWork(day,startAt!,endAt!);
      expect(result.statusCode,result.body).toBe(201);
      const [duration] = await db`select extract(epoch from(end_at-start_at))::int as seconds from employee_time_intervals where work_day_id=${day}`;
      expect(duration!.seconds).toBe(3600);
      expect((await app.inject({method:'POST',url:`/api/workdays/${day}/submit`,headers:context.headers})).statusCode).toBe(200);
    }
  });

  it("audits empty-day cancellation, permits closure and explicitly restores the same day only in an open month", async () => {
    const context = await intervalContext('cancel');
    const adminHeaders = await headersFor('admin');
    const day = await context.createDay('2030-01-10');
    const cancel = (reason: string) => app.inject({method:'POST',url:`/api/workdays/${day}/cancel`,headers:context.headers,payload:{reason}});
    const restore = () => app.inject({method:'POST',url:`/api/workdays/${day}/restore`,headers:context.headers,payload:{reason:'Skutečná směna',shiftType:'MORNING'}});
    const period = async () => (await app.inject({url:'/api/periods/2030-01',headers:adminHeaders})).json().period;
    const close = () => app.inject({method:'POST',url:'/api/periods/2030-01/action',headers:adminHeaders,payload:{action:'CLOSE'}});
    expect(await period()).toMatchObject({totalWorkDays:1,unresolvedWorkDays:1,cancelledWorkDays:0});
    expect((await close()).statusCode).toBe(409);
    expect((await cancel('  ')).statusCode).toBe(400);
    expect((await app.inject({method:'POST',url:`/api/workdays/${day}/cancel`,headers:{cookie:context.headers.cookie},payload:{reason:'Omyl'}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:`/api/workdays/${day}/cancel`,headers:{origin},payload:{reason:'Omyl'}})).statusCode).toBe(401);
    const cancelled = await cancel('Omylem vybrané datum');
    expect(cancelled.statusCode,cancelled.body).toBe(200);
    expect(cancelled.json().workDay).toMatchObject({id:day,state:'CANCELLED',cancellationReason:'Omylem vybrané datum'});
    expect(cancelled.json().workDay.cancelledAt).toBeTruthy();
    const detail = await app.inject({url:'/api/workdays/current?date=2030-01-10',headers:context.headers});
    expect(detail.json().workDay).toMatchObject({id:day,state:'CANCELLED',canCancel:false});
    expect((await cancel('Opakování')).statusCode).toBe(409);
    expect((await app.inject({method:'POST',url:'/api/workdays',headers:context.headers,payload:{workDate:'2030-01-10',shiftType:'MORNING'}})).statusCode).toBe(409);
    expect((await context.addWork(day,'2030-01-10T08:00:00+01:00','2030-01-10T09:00:00+01:00')).statusCode).toBe(409);
    expect((await context.addBreak(day,'2030-01-10T08:00:00+01:00','2030-01-10T09:00:00+01:00')).statusCode).toBe(409);
    expect((await app.inject({method:'POST',url:`/api/workdays/${day}/submit`,headers:context.headers})).statusCode).toBe(409);
    await expect(db`insert into break_entries(work_day_id,start_at,end_at) values(${day},'2030-01-10T08:00:00+01:00','2030-01-10T09:00:00+01:00')`).rejects.toMatchObject({code:'ZC001'});
    await expect(db`delete from work_days where id=${day}`).rejects.toMatchObject({code:'ZC001'});
    expect(await period()).toMatchObject({totalWorkDays:0,unresolvedWorkDays:0,cancelledWorkDays:1});
    expect((await close()).statusCode).toBe(200);
    expect((await restore()).statusCode).toBe(409);
    expect((await app.inject({method:'POST',url:'/api/periods/2030-01/action',headers:adminHeaders,payload:{action:'REOPEN',reason:'Doplnění směny'}})).statusCode).toBe(200);
    const restored = await restore();
    expect(restored.statusCode,restored.body).toBe(200);
    expect(restored.json().workDay).toMatchObject({id:day,state:'DRAFT',shiftType:'MORNING',cancelledAt:null,cancellationReason:null});
    expect(await period()).toMatchObject({totalWorkDays:1,unresolvedWorkDays:1,cancelledWorkDays:0});
    expect((await close()).statusCode).toBe(409);
    const audit = await db`select actor_user_id,action,before_data,after_data,reason from audit_logs where entity_id=${day} order by created_at`;
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({actorUserId:context.userId,action:'WORKDAY_CANCELLED',reason:'Omylem vybrané datum',beforeData:{state:'DRAFT'},afterData:{state:'CANCELLED'}});
    expect(audit[1]).toMatchObject({actorUserId:context.userId,action:'WORKDAY_RESTORED',beforeData:{state:'CANCELLED'},afterData:{state:'DRAFT'}});
    await expect(db`update work_days set state='CANCELLED' where id=${day}`).rejects.toMatchObject({code:'ZC002'});
    await expect(db`delete from work_days where id=${day}`).rejects.toMatchObject({code:'ZC001'});
  });

  it("rejects cancellation of work, breaks, driver trips and submitted or returned days without altering approvals", async () => {
    const context = await intervalContext('cancel-guards');
    const adminHeaders = await headersFor('admin');
    const leaderHeaders = await headersFor('leader');
    const days: string[] = [];
    for (const date of ['2030-02-01','2030-02-02','2030-02-03','2030-02-04']) days.push(await context.createDay(date));
    const work = await context.addWork(days[0]!,'2030-02-01T08:00:00+01:00','2030-02-01T09:00:00+01:00');
    expect(work.statusCode).toBe(201);
    expect((await context.addBreak(days[1]!,'2030-02-02T08:00:00+01:00','2030-02-02T08:30:00+01:00')).statusCode).toBe(201);
    const trip = await app.inject({method:'POST',url:`/api/workdays/${days[2]}/vehicle-trips`,headers:context.headers,
      payload:{vehicleId,startAt:'2030-02-03T08:00:00+01:00',endAt:'2030-02-03T09:00:00+01:00',startOdometerKm:100,endOdometerKm:110}});
    expect(trip.statusCode,trip.body).toBe(201);
    const returnedWork = await context.addWork(days[3]!,'2030-02-04T08:00:00+01:00','2030-02-04T09:00:00+01:00');
    expect(returnedWork.statusCode).toBe(201);
    expect((await app.inject({method:'POST',url:`/api/workdays/${days[3]}/submit`,headers:context.headers})).statusCode).toBe(200);
    expect((await app.inject({method:'POST',url:`/api/admin/workdays/${days[3]}/cancel`,headers:adminHeaders,payload:{reason:'Nesmí smazat práci'}})).statusCode).toBe(409);
    expect((await app.inject({method:'POST',url:`/api/approvals/${returnedWork.json().entry.id}/decision`,headers:leaderHeaders,payload:{action:'RETURNED',reason:'Kontrola záznamu'}})).statusCode).toBe(200);
    const approvals = await db`select * from approvals where work_entry_id=${returnedWork.json().entry.id}`;
    for (const day of days) {
      for (const [prefix,headers] of [['/api/workdays',context.headers],['/api/admin/workdays',adminHeaders]] as const) {
        const response = await app.inject({method:'POST',url:`${prefix}/${day}/cancel`,headers,payload:{reason:'Nepovolené zrušení'}});
        expect(response.statusCode,response.body).toBe(409);
      }
    }
    await expect(db.begin(async (transaction) => {
      await transaction`select set_config('zenops.actor_user_id',${context.userId},true),set_config('zenops.change_reason','Omyl',true)`;
      await transaction`update work_days set state='CANCELLED' where id=${days[0]!}`;
    })).rejects.toMatchObject({code:'ZC001'});
    expect(await db`select * from approvals where work_entry_id=${returnedWork.json().entry.id}`).toEqual(approvals);
    expect(await db`select id from work_entries where work_day_id in ${db(days)}`).toHaveLength(2);
    expect(await db`select id from audit_logs where entity_id in ${db(days)} and action='WORKDAY_CANCELLED'`).toHaveLength(0);
  });

  it("limits cancellation roles, preserves passenger trips and lets Admin resolve an inactive employee's empty day", async () => {
    const passenger = await intervalContext('cancel-passenger');
    const driver = await intervalContext('cancel-driver');
    const adminHeaders = await headersFor('admin');
    const ownDay = await passenger.createDay('2030-03-01');
    const inactiveDay = await passenger.createDay('2030-03-02');
    const driverDay = await driver.createDay('2030-03-01');
    const trip = await app.inject({method:'POST',url:`/api/workdays/${driverDay}/vehicle-trips`,headers:driver.headers,
      payload:{vehicleId,startAt:'2030-03-01T08:00:00+01:00',endAt:'2030-03-01T09:00:00+01:00',startOdometerKm:110,endOdometerKm:120,passengerEmployeeIds:[passenger.employeeId]}});
    expect(trip.statusCode,trip.body).toBe(201);
    const detail = (await app.inject({url:'/api/workdays/current?date=2030-03-01',headers:passenger.headers})).json().workDay;
    expect(detail.canCancel).toBe(true);
    expect(detail.vehicleTrips).toHaveLength(1);
    for (const username of ['leader','accountant.test','admin']) {
      const headers = await headersFor(username);
      expect((await app.inject({method:'POST',url:`/api/workdays/${ownDay}/cancel`,headers,payload:{reason:'Nepovolená role'}})).statusCode).toBe(403);
    }
    for (const headers of [await headersFor('leader'),await headersFor('accountant.test'),driver.headers]) {
      expect((await app.inject({method:'POST',url:`/api/admin/workdays/${ownDay}/cancel`,headers,payload:{reason:'Nepovolená role'}})).statusCode).toBe(403);
    }
    expect((await app.inject({method:'POST',url:`/api/workdays/${ownDay}/cancel`,headers:driver.headers,payload:{reason:'Cizí den'}})).statusCode).toBe(404);
    expect((await app.inject({method:'POST',url:`/api/workdays/${ownDay}/cancel`,headers:passenger.headers,payload:{reason:'Pouze cestující'}})).statusCode).toBe(200);
    expect(await db`select employee_id from vehicle_trip_participants where vehicle_trip_id=${trip.json().trip.id}`).toHaveLength(2);
    expect(await db`select id from vehicle_trips where id=${trip.json().trip.id}`).toHaveLength(1);
    expect((await app.inject({method:'PATCH',url:`/api/employees/${passenger.employeeId}/state`,headers:adminHeaders,payload:{active:false,reason:'Ukončení spolupráce'}})).statusCode).toBe(200);
    const listing = await app.inject({url:'/api/admin/workdays?date=2030-03-02',headers:adminHeaders});
    expect(listing.json().workDays.find((day: { id: string }) => day.id===inactiveDay).canCancel).toBe(true);
    const cancelled = await app.inject({method:'POST',url:`/api/admin/workdays/${inactiveDay}/cancel`,headers:adminHeaders,payload:{reason:'Omyl neaktivního pracovníka'}});
    expect(cancelled.statusCode,cancelled.body).toBe(200);
    const [admin] = await db`select id from users where username='admin'`;
    const [audit] = await db`select actor_user_id,reason from audit_logs where entity_id=${inactiveDay} and action='WORKDAY_CANCELLED'`;
    expect(audit).toEqual({actorUserId:admin!.id,reason:'Omyl neaktivního pracovníka'});
    expect((await app.inject({method:'POST',url:`/api/workdays/${inactiveDay}/restore`,headers:adminHeaders,payload:{reason:'Za pracovníka',shiftType:'MORNING'}})).statusCode).toBe(403);
  });

  it("serializes cancellation against new records and restoration against month closure", async () => {
    const context = await intervalContext('cancel-races');
    const adminHeaders = await headersFor('admin');
    const day = await context.createDay('2030-04-01');
    const results = await Promise.all([
      app.inject({method:'POST',url:`/api/workdays/${day}/cancel`,headers:context.headers,payload:{reason:'Omylem založený den'}}),
      context.addWork(day,'2030-04-01T08:00:00+02:00','2030-04-01T09:00:00+02:00'),
    ]);
    expect(results.map((response) => response.statusCode)).toSatisfy((statuses: number[]) =>
      (statuses[0]===200 && statuses[1]===409) || (statuses[0]===409 && statuses[1]===201));
    const [stored] = await db`select wd.state,(select count(*)::int from work_entries where work_day_id=wd.id) as entries from work_days wd where wd.id=${day}`;
    expect(stored).toEqual(results[0]!.statusCode===200 ? {state:'CANCELLED',entries:0} : {state:'DRAFT',entries:1});
    const restoreDay = await context.createDay('2030-05-01');
    expect((await app.inject({method:'POST',url:`/api/workdays/${restoreDay}/cancel`,headers:context.headers,payload:{reason:'Omyl'}})).statusCode).toBe(200);
    const race = await Promise.all([
      app.inject({method:'POST',url:`/api/workdays/${restoreDay}/restore`,headers:context.headers,payload:{reason:'Skutečná práce',shiftType:'MORNING'}}),
      app.inject({method:'POST',url:'/api/periods/2030-05/action',headers:adminHeaders,payload:{action:'CLOSE'}}),
    ]);
    expect(race.map((response) => response.statusCode)).toSatisfy((statuses: number[]) =>
      (statuses[0]===200 && statuses[1]===409) || (statuses[0]===409 && statuses[1]===200));
    const [final] = await db`select wd.state,mp.state as period_state from work_days wd join monthly_periods mp on mp.id=wd.monthly_period_id where wd.id=${restoreDay}`;
    expect(final).toEqual(race[0]!.statusCode===200 ? {state:'DRAFT',periodState:'OPEN'} : {state:'CANCELLED',periodState:'CLOSED'});
  });

  it("records multiple machines without duplicating work, time or resource totals in history and reports", async () => {
    const context = await multipleMachineContext('report','2040-01-10');
    const adminHeaders = await headersFor('admin');
    const leaderHeaders = await headersFor('leader');
    const first = await context.addMachine(0);
    expect(first.statusCode,first.body).toBe(201);
    const conflict = await context.addMachine(1,0);
    expect(conflict.statusCode,conflict.body).toBe(409);
    expect(await db`select id from machine_usages where work_entry_id=${context.entryId}`).toHaveLength(1);
    const second = await context.addMachine(1);
    expect(second.statusCode,second.body).toBe(201);
    const duplicate = await context.addMachine(0);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error).toContain('Tento stroj již');
    const own = (await app.inject({url:'/api/workdays/current?date=2040-01-10',headers:context.headers})).json().workDay;
    expect(own.entries).toHaveLength(1);
    expect(own.entries[0].machineUsages).toEqual([
      expect.objectContaining({id:first.json().usage.id,machineId:context.machines[0]!.id,startMth:'100.00',endMth:'102.00',fuelConsumed:'2.00',attachments:[context.attachments[0]!.code],attachmentIds:[context.attachments[0]!.id]}),
      expect.objectContaining({id:second.json().usage.id,machineId:context.machines[1]!.id,startMth:'200.00',endMth:'203.00',fuelConsumed:'3.00',attachments:[context.attachments[1]!.code],attachmentIds:[context.attachments[1]!.id]}),
    ]);
    for (const headers of [adminHeaders,leaderHeaders]) {
      const response = await app.inject({url:'/api/reports/daily?date=2040-01-10',headers});
      expect(response.statusCode,response.body).toBe(200);
      const report = response.json().report;
      expect(report.summary).toEqual({entries:1,workers:1,approvedMinutes:0,provisionalMinutes:120});
      expect(report.entries).toHaveLength(1);
      expect(report.entries[0].machineUsages).toEqual(own.entries[0].machineUsages);
      const html = reportHtml(report);
      expect(html).toContain(context.machines[0]!.code);
      expect(html).toContain(context.machines[1]!.code);
      expect(html).toContain(context.attachments[0]!.code);
      expect(html).toContain(context.attachments[1]!.code);
      expect(html.match(/Time multi-report/g)).toHaveLength(1);
      const monthly = (await app.inject({url:'/api/reports/monthly?month=2040-01',headers})).json().report;
      expect(monthly.employeeHours.find((row:{id:string}) => row.id===context.employeeId).workedMinutes).toBe(120);
      expect(monthly.orderHours.find((row:{id:string}) => row.id===context.projectId).workedMinutes).toBe(120);
      expect(monthly.machines).toEqual(expect.arrayContaining([
        expect.objectContaining({id:context.machines[0]!.id,mth:'2.00',fuelConsumed:'2.00'}),
        expect.objectContaining({id:context.machines[1]!.id,mth:'3.00',fuelConsumed:'3.00'}),
      ]));
    }
    const listing = (await app.inject({url:'/api/admin/workdays?date=2040-01-10',headers:adminHeaders})).json().workDays;
    expect(listing[0].entries).toHaveLength(1);
    expect(listing[0].entries[0].machineUsages).toEqual(own.entries[0].machineUsages);
  });

  it("synchronizes every machine and attachment on time corrections and preserves unrelated usage when Admin corrects one machine", async () => {
    const context = await multipleMachineContext('correct','2040-02-10');
    const first = await context.addMachine(0);
    const second = await context.addMachine(1);
    expect(first.statusCode).toBe(201); expect(second.statusCode).toBe(201);
    const corrected = await app.inject({method:'PATCH',url:`/api/workdays/${context.dayId}/entries/${context.entryId}`,headers:context.headers,
      payload:{projectId:context.projectId,workTypeCode:'OTHER',description:'Posun času',startAt:'2040-02-10T09:00:00+01:00',endAt:'2040-02-10T11:00:00+01:00'}});
    expect(corrected.statusCode,corrected.body).toBe(200);
    const resources = await db`select start_at,end_at from machine_usages where work_entry_id=${context.entryId}
      union all select start_at,end_at from attachment_usages where work_entry_id=${context.entryId}`;
    expect(resources).toHaveLength(4);
    expect(resources.every((row) => row.startAt.toISOString()==='2040-02-10T08:00:00.000Z' && row.endAt.toISOString()==='2040-02-10T10:00:00.000Z')).toBe(true);
    const other = await intervalContext('multi-blocker');
    const otherDay = await other.createDay('2040-02-10');
    const otherEntry = await other.addWork(otherDay,'2040-02-10T11:00:00+01:00','2040-02-10T12:00:00+01:00');
    const occupied = await app.inject({method:'POST',url:`/api/workdays/${otherDay}/entries/${otherEntry.json().entry.id}/machine`,headers:other.headers,
      payload:{machineId:context.machines[1]!.id,startMth:203,endMth:204}});
    expect(occupied.statusCode,occupied.body).toBe(201);
    const rejected = await app.inject({method:'PATCH',url:`/api/workdays/${context.dayId}/entries/${context.entryId}`,headers:context.headers,
      payload:{projectId:context.projectId,workTypeCode:'OTHER',description:'Kolidující posun',startAt:'2040-02-10T10:00:00+01:00',endAt:'2040-02-10T12:00:00+01:00'}});
    expect(rejected.statusCode,rejected.body).toBe(409);
    const afterRejected = await db`select start_at,end_at from machine_usages where work_entry_id=${context.entryId}
      union all select start_at,end_at from attachment_usages where work_entry_id=${context.entryId}`;
    expect(afterRejected).toEqual(resources);
    expect((await db`select description from work_entries where id=${context.entryId}`)[0]!.description).toBe('Posun času');
    expect((await app.inject({method:'DELETE',url:`/api/workdays/${otherDay}/entries/${otherEntry.json().entry.id}`,headers:other.headers})).statusCode).toBe(204);
    expect((await app.inject({method:'POST',url:`/api/workdays/${otherDay}/cancel`,headers:other.headers,payload:{reason:'Úklid testovacího dne'}})).statusCode).toBe(200);
    expect((await app.inject({method:'POST',url:`/api/workdays/${context.dayId}/submit`,headers:context.headers})).statusCode).toBe(200);
    const leaderHeaders = await headersFor('leader');
    expect((await app.inject({method:'POST',url:`/api/approvals/${context.entryId}/decision`,headers:leaderHeaders,payload:{action:'APPROVED'}})).statusCode).toBe(200);
    const leader = (await app.inject({url:'/api/leader/workdays?date=2040-02-10',headers:leaderHeaders})).json().workDays;
    expect(leader[0].entries[0].machineUsages).toHaveLength(2);
    const [beforeFirst] = await db`select * from machine_usages where id=${first.json().usage.id}`;
    const approvals = await db`select * from approvals where work_entry_id=${context.entryId}`;
    const adminHeaders = await headersFor('admin');
    const correction = await app.inject({method:'PATCH',url:`/api/admin/machine-usages/${second.json().usage.id}`,headers:adminHeaders,
      payload:{machineId:context.machines[1]!.id,startMth:200,endMth:204,fuelConsumed:3,fuelRefuelled:4,attachmentIds:[context.attachments[1]!.id],reason:'Kontrola druhého stroje'}});
    expect(correction.statusCode,correction.body).toBe(200);
    expect((await db`select * from machine_usages where id=${first.json().usage.id}`)[0]).toEqual(beforeFirst);
    expect(await db`select * from approvals where work_entry_id=${context.entryId}`).toEqual(approvals);
    const changed = (await app.inject({url:'/api/admin/workdays?date=2040-02-10',headers:adminHeaders})).json().workDays
      .find((day:{id:string}) => day.id===context.dayId).entries.find((entry:{id:string}) => entry.id===context.entryId);
    expect(changed.machineUsages[1].endMth).toBe('204.00');
    expect((await app.inject({method:'POST',url:'/api/periods/2040-02/action',headers:adminHeaders,payload:{action:'CLOSE'}})).statusCode).toBe(200);
    const locked = await app.inject({method:'PATCH',url:`/api/admin/machine-usages/${second.json().usage.id}`,headers:adminHeaders,
      payload:{machineId:context.machines[1]!.id,startMth:200,endMth:205,attachmentIds:[context.attachments[1]!.id],reason:'Uzavřený měsíc'}});
    expect(locked.statusCode).toBe(409);
  });

  it("keeps machine ownership, physical occupancy and concurrent duplicate protection with multiple usages", async () => {
    const context = await multipleMachineContext('locks','2040-03-10');
    const results = await Promise.all([context.addMachine(0),context.addMachine(0)]);
    expect(results.map((response) => response.statusCode).sort()).toEqual([201,409]);
    expect((await context.addMachine(1)).statusCode).toBe(201);
    for (const username of ['admin','leader','accountant.test']) {
      const denied = await app.inject({method:'POST',url:`/api/workdays/${context.dayId}/entries/${context.entryId}/machine`,headers:await headersFor(username),payload:{machineId:context.machines[0]!.id,startMth:100,endMth:102}});
      expect(denied.statusCode).toBe(403);
    }
    const other = await intervalContext('multi-other');
    const otherDay = await other.createDay('2040-03-10');
    const otherEntry = await other.addWork(otherDay,'2040-03-10T08:30:00+01:00','2040-03-10T09:30:00+01:00');
    const occupied = await app.inject({method:'POST',url:`/api/workdays/${otherDay}/entries/${otherEntry.json().entry.id}/machine`,headers:other.headers,
      payload:{machineId:context.machines[1]!.id,startMth:203,endMth:204}});
    expect(occupied.statusCode,occupied.body).toBe(409);
    const foreign = await app.inject({method:'POST',url:`/api/workdays/${context.dayId}/entries/${context.entryId}/machine`,headers:other.headers,
      payload:{machineId:context.machines[0]!.id,startMth:100,endMth:102}});
    expect(foreign.statusCode).toBe(409);
    expect(await db`select id from machine_usages where work_entry_id=${otherEntry.json().entry.id}`).toHaveLength(0);
    const resources = await db`select id from machine_usages where work_entry_id=${context.entryId}`;
    expect(resources).toHaveLength(2);
    const removed = await app.inject({method:'DELETE',url:`/api/workdays/${context.dayId}/entries/${context.entryId}`,headers:context.headers});
    expect(removed.statusCode).toBe(204);
    expect(await db`select id from machine_usages where work_entry_id=${context.entryId}`).toHaveLength(0);
    expect(await db`select id from attachment_usages where work_entry_id=${context.entryId}`).toHaveLength(0);
  });

  it("changes the authenticated password, audits it and revokes every session", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const cookie = cookieHeader?.split(";", 1)[0];
    const incorrect = await app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: { origin, cookie: cookie! },
      payload: {
        currentPassword: "Incorrect-Password!",
        newPassword: "A-New-Secure-Password-2026!",
      },
    });
    expect(incorrect.statusCode).toBe(401);
    const changed = await app.inject({
      method: "POST",
      url: "/api/auth/password",
      headers: { origin, cookie: cookie! },
      payload: {
        currentPassword: password,
        newPassword: "A-New-Secure-Password-2026!",
      },
    });
    expect(changed.statusCode).toBe(204);
    const revoked = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: cookie! },
    });
    expect(revoked.statusCode).toBe(401);
    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: { identifier: "admin@zenops.test", password },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: `192.0.2.${++loginRequestNumber}`,
      headers: { origin },
      payload: {
        identifier: "admin@zenops.test",
        password: "A-New-Secure-Password-2026!",
      },
    });
    expect(newLogin.statusCode).toBe(204);
    const [audit] = await db<Array<{ count: number }>>`
      select count(*)::int as count from audit_logs where action = 'PASSWORD_CHANGED'
    `;
    expect(audit!.count).toBe(1);
  });
});
