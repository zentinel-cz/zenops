import {
  createEmployeeItemIssueSchema,
  createEmployeeItemReturnSchema,
  createIssuedItemTypeSchema,
  updateEmployeeItemIssueSchema,
  updateIssuedItemTypeSchema,
  updateWorkerProfileSchema,
  correctEmployeeItemReturnSchema,
} from "@zenops/contracts";
import type { FastifyInstance } from "fastify";
import { requirePermission, type AuthorizationHook } from "./authorization.js";
import type { Database } from "./db.js";

type ProfileRow = {
  id: string;
  employeeNumber: string;
  displayName: string;
  email: string;
  phone: string | null;
  upperWorkwearSize: string | null;
  lowerWorkwearSize: string | null;
  shoeSize: string | null;
  isActive: boolean;
  roleCode: string;
  roleName: string;
};

function employeeIdFrom(request: { params: unknown }): string | null {
  const id = (request.params as { employeeId?: unknown }).employeeId;
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

async function getEmployeeProfile(db: Database, employeeId: string) {
  const employees = await db<ProfileRow[]>`
    select e.id, e.employee_number, e.display_name, u.email, e.contact_phone as phone,
      e.upper_workwear_size, e.lower_workwear_size, e.shoe_size, e.is_active,
      r.code as role_code, r.name as role_name
    from employees e
    join users u on u.employee_id = e.id
    join user_roles ur on ur.user_id = u.id
    join roles r on r.id = ur.role_id
    where e.id = ${employeeId}
    limit 1
  `;
  if (!employees[0]) return null;
  const profile = employees[0];
  const issues = await db<Array<{
    id: string; itemTypeId: string; itemName: string; quantity: number;
    size: string | null; issuedOn: string; location: string | null; note: string | null;
    returnedQuantity: number;
  }>>`
    select i.id, i.item_type_id, i.item_name_snapshot as item_name, i.quantity,
      i.size, i.issued_on, i.issued_at_location as location, i.note,
      coalesce(sum(ret.quantity), 0)::int as returned_quantity
    from employee_item_issues i
    left join employee_item_returns ret on ret.issue_id = i.id
    where i.employee_id = ${employeeId}
    group by i.id
    order by i.issued_on desc, i.created_at desc
  `;
  const issueIds = issues.map((issue) => issue.id);
  const returns = issueIds.length ? await db<Array<{
    id: string; issueId: string; quantity: number; returnedOn: string;
    note: string | null; recordedBy: string;
  }>>`
    select ret.id, ret.issue_id, ret.quantity, ret.returned_on, ret.note,
      e.display_name as recorded_by
    from employee_item_returns ret
    join users u on u.id = ret.recorded_by_user_id
    join employees e on e.id = u.employee_id
    where ret.issue_id in ${db(issueIds)}
    order by ret.returned_on desc, ret.created_at desc
  ` : [];
  return {
    profile,
    issues: issues.map((issue) => ({
      ...issue,
      outstandingQuantity: issue.quantity - issue.returnedQuantity,
      returns: returns.filter((entry) => entry.issueId === issue.id),
    })),
  };
}

export function registerWorkerProfileRoutes(
  app: FastifyInstance,
  db: Database,
  requireTrustedOrigin: AuthorizationHook,
): void {
  app.get("/api/profile", { preHandler: requirePermission("employee.profile.own.read") }, async (request, reply) => {
    const data = await getEmployeeProfile(db, request.sessionUser!.employeeId);
    if (!data) return reply.code(404).send({ error: "Profil uživatele nebyl nalezen." });
    return data;
  });

  app.get("/api/employee-profiles", { preHandler: requirePermission("employee.profile.manage") }, async () => {
    const profiles = await db<ProfileRow[]>`
      select e.id, e.employee_number, e.display_name, u.email, e.contact_phone as phone,
        e.upper_workwear_size, e.lower_workwear_size, e.shoe_size, e.is_active,
        r.code as role_code, r.name as role_name
      from employees e
      join users u on u.employee_id = e.id
      join user_roles ur on ur.user_id = u.id
      join roles r on r.id = ur.role_id
      order by e.is_active desc, e.display_name
    `;
    return { profiles };
  });

  app.get("/api/employee-profiles/:employeeId", { preHandler: requirePermission("employee.profile.manage") }, async (request, reply) => {
    const employeeId = employeeIdFrom(request);
    if (!employeeId) return reply.code(400).send({ error: "Neplatný uživatel." });
    const data = await getEmployeeProfile(db, employeeId);
    if (!data) return reply.code(404).send({ error: "Profil uživatele nebyl nalezen." });
    return data;
  });

  app.patch("/api/employee-profiles/:employeeId", { preHandler: [requireTrustedOrigin, requirePermission("employee.profile.manage")] }, async (request, reply) => {
    const employeeId = employeeIdFrom(request);
    const parsed = updateWorkerProfileSchema.safeParse(request.body);
    if (!employeeId || !parsed.success) return reply.code(400).send({ error: "Neplatné údaje profilu uživatele." });
    const updated = await db.begin(async (tx) => {
      const beforeRows = await tx<ProfileRow[]>`
        select e.id, e.employee_number, e.display_name, u.email, e.contact_phone as phone,
          e.upper_workwear_size, e.lower_workwear_size, e.shoe_size, e.is_active,
          r.code as role_code, r.name as role_name
        from employees e join users u on u.employee_id = e.id
        join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id
        where e.id = ${employeeId} for update of e
      `;
      const before = beforeRows[0];
      if (!before) return null;
      if (before.roleCode !== "WORKER") return null;
      const [after] = await tx<ProfileRow[]>`
        update employees set contact_phone = ${parsed.data.phone},
          upper_workwear_size = ${parsed.data.upperWorkwearSize},
          lower_workwear_size = ${parsed.data.lowerWorkwearSize},
          shoe_size = ${parsed.data.shoeSize}, updated_at = now()
        where id = ${employeeId}
        returning id, employee_number, display_name,
          contact_phone as phone, upper_workwear_size, lower_workwear_size, shoe_size, is_active
      `;
      const afterWithEmail = { ...after!, email: before.email };
      await tx`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
        values (${request.sessionUser!.id}, 'WORKER_PROFILE_UPDATED', 'EMPLOYEE', ${employeeId},
          ${tx.json(before)}, ${tx.json(afterWithEmail)}, ${parsed.data.reason})
      `;
      return afterWithEmail;
    });
    if (!updated) return reply.code(404).send({ error: "Profil pracovníka nebyl nalezen." });
    return { profile: updated };
  });

  app.get("/api/issued-item-types", { preHandler: requirePermission("employee.items.manage") }, async (request) => {
    const includeInactive = (request.query as { includeInactive?: string }).includeInactive === "true";
    const itemTypes = await db`
      select id, name, is_active, created_at, updated_at
      from issued_item_types where (${includeInactive} or is_active)
      order by is_active desc, name
    `;
    return { itemTypes };
  });

  app.post("/api/issued-item-types", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const parsed = createIssuedItemTypeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Zadejte název věci (alespoň 2 znaky)." });
    try {
      const item = await db.begin(async (tx) => {
        const [created] = await tx`
          insert into issued_item_types (name, created_by_user_id, updated_by_user_id)
          values (${parsed.data.name}, ${request.sessionUser!.id}, ${request.sessionUser!.id})
          returning id, name, is_active, created_at, updated_at
        `;
        await tx`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'ISSUED_ITEM_TYPE_CREATED', 'ISSUED_ITEM_TYPE', ${created!.id}, ${tx.json(created!)})
        `;
        return created;
      });
      return reply.code(201).send({ itemType: item });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "Tento druh věci už v katalogu existuje." });
      throw error;
    }
  });

  app.patch("/api/issued-item-types/:itemTypeId", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const id = (request.params as { itemTypeId?: string }).itemTypeId;
    const parsed = updateIssuedItemTypeSchema.safeParse(request.body);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !parsed.success) return reply.code(400).send({ error: "Neplatná změna katalogu." });
    try {
      const item = await db.begin(async (tx) => {
        const rows = await tx`select id, name, is_active from issued_item_types where id = ${id} for update`;
        const before = rows[0];
        if (!before) return null;
        const [after] = await tx`
          update issued_item_types set name = ${parsed.data.name}, is_active = ${parsed.data.active},
            updated_by_user_id = ${request.sessionUser!.id}, updated_at = now()
          where id = ${id} returning id, name, is_active, updated_at
        `;
        await tx`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
          values (${request.sessionUser!.id}, 'ISSUED_ITEM_TYPE_UPDATED', 'ISSUED_ITEM_TYPE', ${id},
            ${tx.json(before)}, ${tx.json(after!)}, ${parsed.data.reason})
        `;
        return after;
      });
      if (!item) return reply.code(404).send({ error: "Druh věci nebyl nalezen." });
      return { itemType: item };
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") return reply.code(409).send({ error: "Tento druh věci už v katalogu existuje." });
      throw error;
    }
  });

  app.post("/api/employee-profiles/:employeeId/issues", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const employeeId = employeeIdFrom(request);
    const parsed = createEmployeeItemIssueSchema.safeParse(request.body);
    if (!employeeId || !parsed.success) return reply.code(400).send({ error: "Zkontrolujte údaje o vydané věci." });
    const issue = await db.begin(async (tx) => {
      const employees = await tx`
        select e.id from employees e join users u on u.employee_id = e.id and u.is_active
        where e.id = ${employeeId} and e.is_active for update of e
      `;
      if (!employees[0]) return { error: "Uživatel není aktivní nebo nebyl nalezen." } as const;
      const types = await tx`select id, name from issued_item_types where id = ${parsed.data.itemTypeId} and is_active for share`;
      if (!types[0]) return { error: "Vybraný druh věci není aktivní." } as const;
      const [created] = await tx`
        insert into employee_item_issues (employee_id, item_type_id, item_name_snapshot, quantity, size, issued_on, issued_at_location, note, created_by_user_id, updated_by_user_id)
        values (${employeeId}, ${types[0].id}, ${types[0].name}, ${parsed.data.quantity}, ${parsed.data.size ?? null}, ${parsed.data.issuedOn}, ${parsed.data.location}, ${parsed.data.note ?? null}, ${request.sessionUser!.id}, ${request.sessionUser!.id})
        returning id, employee_id, item_type_id, item_name_snapshot, quantity, size, issued_on, issued_at_location as location, note
      `;
      await tx`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
        values (${request.sessionUser!.id}, 'EMPLOYEE_ITEM_ISSUED', 'EMPLOYEE_ITEM_ISSUE', ${created!.id}, ${tx.json(created!)})
      `;
      return { issue: created } as const;
    });
    if ("error" in issue) return reply.code(409).send({ error: issue.error });
    return reply.code(201).send(issue);
  });

  app.patch("/api/employee-item-issues/:issueId", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const issueId = (request.params as { issueId?: string }).issueId;
    const parsed = updateEmployeeItemIssueSchema.safeParse(request.body);
    if (!issueId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issueId) || !parsed.success) return reply.code(400).send({ error: "Zkontrolujte opravu vydané věci." });
    const result = await db.begin(async (tx) => {
      const rows = await tx`
        select i.id, i.employee_id, i.item_type_id, i.item_name_snapshot, i.quantity, i.size, i.issued_on, i.issued_at_location as location, i.note
        from employee_item_issues i where i.id = ${issueId} for update
      `;
      const before = rows[0];
      if (!before) return { error: "Záznam o vydání nebyl nalezen." } as const;
      const totals = await tx`select coalesce(sum(quantity), 0)::int as returned from employee_item_returns where issue_id = ${issueId}`;
      if (parsed.data.quantity < totals[0]!.returned) return { error: "Množství nesmí být menší než již vrácené množství." } as const;
      const types = await tx`select id, name, is_active from issued_item_types where id = ${parsed.data.itemTypeId}`;
      if (!types[0] || (!types[0].isActive && types[0].id !== before.itemTypeId)) return { error: "Vybraný druh věci není aktivní." } as const;
      const [after] = await tx`
        update employee_item_issues set item_type_id = ${types[0].id}, item_name_snapshot = ${types[0].name},
          quantity = ${parsed.data.quantity}, size = ${parsed.data.size ?? null}, issued_on = ${parsed.data.issuedOn},
          issued_at_location = ${parsed.data.location},
          note = ${parsed.data.note ?? null}, updated_by_user_id = ${request.sessionUser!.id}, updated_at = now()
        where id = ${issueId}
        returning id, employee_id, item_type_id, item_name_snapshot, quantity, size, issued_on, issued_at_location as location, note
      `;
      await tx`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
        values (${request.sessionUser!.id}, 'EMPLOYEE_ITEM_ISSUE_CORRECTED', 'EMPLOYEE_ITEM_ISSUE', ${issueId},
          ${tx.json(before)}, ${tx.json(after!)}, ${parsed.data.reason})
      `;
      return { issue: after } as const;
    });
    if ("error" in result) return reply.code(result.error.includes("nebyl nalezen") ? 404 : 409).send({ error: result.error });
    return result;
  });

  app.post("/api/employee-item-issues/:issueId/returns", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const issueId = (request.params as { issueId?: string }).issueId;
    const parsed = createEmployeeItemReturnSchema.safeParse(request.body);
    if (!issueId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issueId) || !parsed.success) return reply.code(400).send({ error: "Zkontrolujte údaje o vrácení." });
    try {
      const returned = await db.begin(async (tx) => {
        const issues = await tx`select id from employee_item_issues where id = ${issueId} for update`;
        if (!issues[0]) return null;
        const [created] = await tx`
          insert into employee_item_returns (issue_id, quantity, returned_on, note, recorded_by_user_id)
          values (${issueId}, ${parsed.data.quantity}, ${parsed.data.returnedOn}, ${parsed.data.note ?? null}, ${request.sessionUser!.id})
          returning id, issue_id, quantity, returned_on, note
        `;
        await tx`
          insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
          values (${request.sessionUser!.id}, 'EMPLOYEE_ITEM_RETURNED', 'EMPLOYEE_ITEM_RETURN', ${created!.id}, ${tx.json(created!)})
        `;
        return created;
      });
      if (!returned) return reply.code(404).send({ error: "Záznam o vydání nebyl nalezen." });
      return reply.code(201).send({ returned });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23514") return reply.code(409).send({ error: "Vrácené množství je vyšší než dosud nevrácené množství." });
      throw error;
    }
  });

  app.patch("/api/employee-item-returns/:returnId", { preHandler: [requireTrustedOrigin, requirePermission("employee.items.manage")] }, async (request, reply) => {
    const returnId = (request.params as { returnId?: string }).returnId;
    const parsed = correctEmployeeItemReturnSchema.safeParse(request.body);
    if (!returnId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(returnId) || !parsed.success) return reply.code(400).send({ error: "Zkontrolujte opravu data vrácení." });
    const result = await db.begin(async (tx) => {
      const rows = await tx`
        select ret.id, ret.issue_id, ret.quantity, ret.returned_on, ret.note
        from employee_item_returns ret where ret.id = ${returnId} for update
      `;
      const before = rows[0];
      if (!before) return null;
      const [after] = await tx`
        update employee_item_returns set returned_on = ${parsed.data.returnedOn}
        where id = ${returnId}
        returning id, issue_id, quantity, returned_on, note
      `;
      await tx`
        insert into audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, reason)
        values (${request.sessionUser!.id}, 'EMPLOYEE_ITEM_RETURN_CORRECTED', 'EMPLOYEE_ITEM_RETURN', ${returnId},
          ${tx.json(before)}, ${tx.json(after!)}, ${parsed.data.reason})
      `;
      return after;
    });
    if (!result) return reply.code(404).send({ error: "Záznam o vrácení nebyl nalezen." });
    return { returned: result };
  });
}
