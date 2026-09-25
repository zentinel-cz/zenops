import { verify } from "@node-rs/argon2";
import { sessionUserSchema, type RoleCode, type SessionUser } from "@zenops/contracts";
import type { Database } from "./db.js";
import { createOpaqueToken, hashToken } from "./security.js";

type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  isActive: boolean;
};

export async function authenticate(
  db: Database,
  email: string,
  password: string,
): Promise<UserRow | null> {
  const rows = await db<UserRow[]>`
    select u.id, u.email, u.password_hash, e.display_name, u.is_active
    from users u
    join employees e on e.id = u.employee_id
    where lower(u.email) = lower(${email})
    limit 1
  `;
  const user = rows[0];
  if (!user || !user.isActive || !(await verify(user.passwordHash, password))) return null;
  return user;
}

export async function createSession(
  db: Database,
  userId: string,
  ttlHours: number,
  metadata: { ipAddress?: string; userAgent?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await db`
    insert into sessions (user_id, token_hash, expires_at, ip_address, user_agent)
    values (${userId}, ${tokenHash}, ${expiresAt}, ${metadata.ipAddress ?? null}, ${metadata.userAgent ?? null})
  `;
  return { token, expiresAt };
}

export async function getSessionUser(db: Database, token: string): Promise<SessionUser | null> {
  const rows = await db<Array<SessionUser & { roles: RoleCode[]; permissions: string[] }>>`
    select
      u.id,
      e.id as employee_id,
      u.email,
      e.display_name,
      coalesce(array_agg(distinct r.code) filter (where r.code is not null), '{}') as roles,
      coalesce(array_agg(distinct p.code) filter (where p.code is not null), '{}') as permissions
    from sessions s
    join users u on u.id = s.user_id and u.is_active
    join employees e on e.id = u.employee_id and e.is_active
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    left join role_permissions rp on rp.role_id = r.id
    left join permissions p on p.id = rp.permission_id
    where s.token_hash = ${hashToken(token)}
      and s.revoked_at is null
      and s.expires_at > now()
    group by u.id, u.email, e.id, e.display_name
    limit 1
  `;
  const row = rows[0];
  return row ? sessionUserSchema.parse(row) : null;
}

export async function revokeSession(db: Database, token: string): Promise<void> {
  await db`update sessions set revoked_at = now() where token_hash = ${hashToken(token)} and revoked_at is null`;
}
