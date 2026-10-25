import { Redis } from "ioredis";
import { logger } from "../util/logger.js";
import { env } from "./env.js";

// No offline queue + 1 retry: commands fail fast when Redis is down so callers fall back to Postgres.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on("error", (err) => logger.warn({ err: err.message }, "Redis error"));
