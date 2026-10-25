import { createApp } from "./app.js";
import { AppDataSource } from "./config/data-source.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import { logger } from "./util/logger.js";

async function main() {
  await AppDataSource.initialize();
  logger.info("Connected to Postgres, migrations applied");

  // Cache is optional: start anyway and let ioredis keep reconnecting in the background.
  await redis.connect().then(
    () => logger.info("Connected to Redis"),
    (err) => logger.warn({ err }, "Redis unavailable, serving from Postgres only"),
  );

  const server = createApp().listen(env.PORT, () => logger.info(`Server listening on port ${env.PORT}`));

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      redis.disconnect();
      await AppDataSource.destroy();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
