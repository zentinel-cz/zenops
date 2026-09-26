import { hash } from "@node-rs/argon2";
import { createEmployeeUserSchema, employeeStateSchema, updateEmployeeUserSchema } from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

type EmployeeRow = {
  id: string;
  employeeNumber: string;
  displayName: string;
  email: string;
  isActive: boolean;
  roles: string[];
};

export function registerEmployeeRoutes(app: FastifyInstance, db: Database, requireTrustedOrigin: AuthorizationHook): void {
  app.get("/api/employees", { preHandler: requirePermission("employee.manage") }, async () => {
    const employees = await db<EmployeeRow[]>`
      select e.id, e.employee_number, e.display_name, u.email, e.is_active,
        coalesce(array_agg(r.code order by r.code) filter (where r.code is not null), '{}') as roles
      from employees e
      join users u on u.employee_id = e.id
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      group by e.id, e.employee_number, e.display_name, u.email, e.is_active
      order by e.is_active desc, e.display_name
    `;
    return { employees };
  });

  app.get("/api/employees/leaders", { preHandler: requirePermission("project.create") }, async () => {
    const leaders = await db<Array<{ id: string; displayName: string }>>`
      select distinct e.id, e.display_name
      from employees e
      join users u on u.employee_id = e.id and u.is_active
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id and r.code = 'LEADER'
      where e.is_active
      order by e.display_name
    `;
    return { leaders };
  });

  app.post("/api/employees", {
    preHandler: [requireTrustedOrigin, requirePermission("employee.manage")],
  }, async (request, reply) => {
    const parsed = createEmployeeUserSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Neplatné údaje zaměstnance.", details: parsed.error.flatten() });
    const actor = request.sessionUser!;
    const passwordHash = await hash(parsed.data.password, { memoryCost: 65536, timeCost: 3, parallelism: 1 });
    try {
      const employee = await db.begin(async (transaction) => {
        const [createdEmployee] = await transaction<Array<{ id: string; employeeNumber: string; displayName: string }>>`
          insert into employees (employee_number, display_name)
          values (${parsed.data.employeeNumber}, ${parsed.data.displayName})
          returning id, employee_number, display_name
        `;
        const [createdUser] = await transaction<Array<{ id: string; email: string }>>`
          insert into users (employee_id, email, password_hash)
          values (${createdEmployee!.id}, ${parsed.data.email}, ${passwordHash})
          returning id, email
        `;
        await transaction`
          insert into user_roles (user_id, role_id)
          select ${createdUser!.id}, id from roles where code = any(${transaction.array(parsed.data.roles)})
        `;
        const auditData = { ...createdEmployee!, email: createdUser!.email, roles: parsed.data.roles };
        await transaction`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${actor.id}, 'EMPLOYEE_CREATED', 'EMPLOYEE', ${createdEmployee!.id}, ${transaction.json(auditData)})
        `;
        return auditData;
      });
      return reply.code(201).send({ employee });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        return reply.code(409).send({ error: "E-mail nebo osobní číslo již existuje." });
      }
      throw error;
    }
  });

  app.patch("/api/employees/:employeeId/state", {
    preHandler: [requireTrustedOrigin, requirePermission("employee.manage")],
  }, async (request, reply) => {
    const parsed = employeeStateSchema.safeParse(request.body);
    const employeeId = (request.params as { employeeId?: string }).employeeId;
    if (!parsed.success || !employeeId) return reply.code(400).send({ error: "Neplatná změna stavu zaměstnance." });
    if (employeeId === request.sessionUser!.employeeId && !parsed.data.active) {
      return reply.code(409).send({ error: "Aktuálně přihlášený správce nemůže deaktivovat sám sebe." });
    }
    const changed = await db.begin(async (transaction) => {
      const existing = await transaction<Array<{ id: string; isActive: boolean }>>`
        select id, is_active from employees where id = ${employeeId} for update
      `;
      if (!existing[0] || existing[0].isActive === parsed.data.active) return null;
      const deactivatedAt = parsed.data.active ? null : new Date();
      const deactivatedBy = parsed.data.active ? null : request.sessionUser!.id;
      await transaction`
        update employees set is_active = ${parsed.data.active}, deactivated_at = ${deactivatedAt},
          deactivated_by_user_id = ${deactivatedBy}, updated_at = now() where id = ${employeeId}
      `;
      await transaction`
        update users set is_active = ${parsed.data.active}, deactivated_at = ${deactivatedAt},
          deactivated_by_user_id = ${deactivatedBy}, updated_at = now() where employee_id = ${employeeId}
      `;
      await transaction`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
        values (${request.sessionUser!.id}, ${parsed.data.active ? 'EMPLOYEE_REACTIVATED' : 'EMPLOYEE_DEACTIVATED'},
          'EMPLOYEE', ${employeeId}, ${transaction.json(existing[0])}, ${transaction.json({ isActive: parsed.data.active })}, ${parsed.data.reason})
      `;
      return { id: employeeId, isActive: parsed.data.active };
    });
    if (!changed) return reply.code(404).send({ error: "Zaměstnanec nebyl nalezen nebo je již v požadovaném stavu." });
    return { employee: changed };
  });

  app.patch("/api/employees/:employeeId", {
    preHandler: [requireTrustedOrigin, requirePermission("employee.manage")],
  }, async (request, reply) => {
    const parsed = updateEmployeeUserSchema.safeParse(request.body);
    const employeeId = (request.params as { employeeId?: string }).employeeId;
    if (!parsed.success || !employeeId) return reply.code(400).send({ error: "Neplatné údaje zaměstnance." });
    if (employeeId === request.sessionUser!.employeeId && !parsed.data.roles.includes("ADMIN")) {
      return reply.code(409).send({ error: "Aktuálně přihlášený správce si nemůže odebrat roli Admin." });
    }
    try {
      const employee = await db.begin(async (transaction) => {
        const beforeRows = await transaction<EmployeeRow[]>`
          select e.id, e.employee_number, e.display_name, u.email, e.is_active,
            coalesce((select array_agg(r.code order by r.code) from user_roles ur join roles r on r.id=ur.role_id where ur.user_id=u.id), '{}') as roles
          from employees e join users u on u.employee_id=e.id where e.id=${employeeId} for update of e, u
        `;
        if (!beforeRows[0]) return null;
        const [account] = await transaction<Array<{ id: string }>>`select id from users where employee_id=${employeeId}`;
        await transaction`update employees set employee_number=${parsed.data.employeeNumber}, display_name=${parsed.data.displayName}, updated_at=now() where id=${employeeId}`;
        await transaction`update users set email=${parsed.data.email}, updated_at=now() where id=${account!.id}`;
        await transaction`delete from user_roles where user_id=${account!.id}`;
        await transaction`insert into user_roles (user_id, role_id) select ${account!.id}, id from roles where code=any(${transaction.array(parsed.data.roles)})`;
        await transaction`update sessions set revoked_at=now() where user_id=${account!.id} and revoked_at is null`;
        const after = { id: employeeId, employeeNumber: parsed.data.employeeNumber, displayName: parsed.data.displayName, email: parsed.data.email, isActive: beforeRows[0].isActive, roles: parsed.data.roles };
        await transaction`insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason) values (${request.sessionUser!.id}, 'EMPLOYEE_UPDATED', 'EMPLOYEE', ${employeeId}, ${transaction.json(beforeRows[0])}, ${transaction.json(after)}, ${parsed.data.reason})`;
        return after;
      });
      if (!employee) return reply.code(404).send({ error: "Zaměstnanec nebyl nalezen." });
      return { employee, sessionsRevoked: true };
    } catch (error) { if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "E-mail nebo osobní číslo již existuje." }); throw error; }
  });
}
