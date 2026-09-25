import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db.js";

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const db = createDatabase(loadConfig());

try {
  await db`
    create table if not exists schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const name of files) {
    const sql = await readFile(resolve(migrationsDirectory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await db<Array<{ checksum: string }>>`select checksum from schema_migrations where name = ${name}`;
    if (existing[0]) {
      if (existing[0].checksum !== checksum) throw new Error(`Migration ${name} was modified after application.`);
      console.log(`skip ${name}`);
      continue;
    }
    await db.begin(async (transaction) => {
      await transaction.unsafe(sql);
      await transaction`insert into schema_migrations (name, checksum) values (${name}, ${checksum})`;
    });
    console.log(`applied ${name}`);
  }
} finally {
  await db.end();
}
