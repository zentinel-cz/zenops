import { readFileSync } from "node:fs";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_HOST: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_DB: z.string().default("zenops"),
  POSTGRES_USER: z.string().default("zenops"),
  POSTGRES_PASSWORD_FILE: z.string().optional(),
  WEB_ORIGIN: z.string().url(),
  SESSION_COOKIE_NAME: z.string().default("zenops_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.parse(environment);
  if (parsed.DATABASE_URL) return parsed;
  if (!parsed.POSTGRES_PASSWORD_FILE) {
    throw new Error("DATABASE_URL or POSTGRES_PASSWORD_FILE must be configured.");
  }
  const databaseUrl = new URL("postgresql://localhost");
  databaseUrl.username = parsed.POSTGRES_USER;
  databaseUrl.password = readFileSync(parsed.POSTGRES_PASSWORD_FILE, "utf8").trim();
  databaseUrl.hostname = parsed.POSTGRES_HOST;
  databaseUrl.port = String(parsed.POSTGRES_PORT);
  databaseUrl.pathname = `/${parsed.POSTGRES_DB}`;
  return { ...parsed, DATABASE_URL: databaseUrl.toString() };
}
