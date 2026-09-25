import postgres from "postgres";
import type { AppConfig } from "./config.js";

export type Database = ReturnType<typeof postgres>;

export function createDatabase(config: AppConfig): Database {
  if (!config.DATABASE_URL) throw new Error("Database URL was not resolved.");
  return postgres(config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });
}
