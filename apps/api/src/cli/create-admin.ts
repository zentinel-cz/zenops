import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db.js";

const [emailInput, displayName, password] = process.argv.slice(2);
if (!emailInput || !displayName || !password) {
  throw new Error("Usage: pnpm --filter @zenops/api user:create-admin -- <email> <display-name> <password>");
}
if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
const email = emailInput.trim().toLowerCase();
const username = email.split("@", 1)[0]!.replace(/[^a-z0-9._-]/g, "");
if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)) {
  throw new Error("The e-mail local part cannot be used as a username.");
}
const db = createDatabase(loadConfig());

try {
  const passwordHash = await hash(password, { memoryCost: 65536, timeCost: 3, parallelism: 1 });
  await db.begin(async (transaction) => {
    const employeeId = randomUUID();
    const userId = randomUUID();
    await transaction`insert into employees (id, employee_number, display_name) values (${employeeId}, ${`ADMIN-${Date.now()}`}, ${displayName})`;
    await transaction`insert into users (id, employee_id, username, email, password_hash) values (${userId}, ${employeeId}, ${username}, ${email}, ${passwordHash})`;
    await transaction`insert into user_roles (user_id, role_id) select ${userId}, id from roles where code = 'ADMIN'`;
    await transaction`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
      values (${userId}, 'ADMIN_BOOTSTRAPPED', 'USER', ${userId}, ${transaction.json({ username, email })})
    `;
  });
  console.log(`Admin ${username} (${email}) created.`);
} finally {
  await db.end();
}
