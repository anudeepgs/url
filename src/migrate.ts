import { AppDataSource } from "./config/data-source.js";
import { logger } from "./util/logger.js";

// Invoked by the deploy pipeline; the DB is private so CI can't run migrations directly.
export const handler = async () => {
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  const applied = await AppDataSource.runMigrations({ transaction: "all" });
  const names = applied.map((m) => m.name);
  logger.info({ applied: names }, "Migrations complete");
  return { applied: names };
};
