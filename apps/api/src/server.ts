import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "./db.js";

const config = loadConfig();
const db = createDatabase(config);
const app = buildApp(config, db);

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutdown requested");
  await app.close();
  await db.end({ timeout: 5 });
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ host: config.HOST, port: config.PORT });
