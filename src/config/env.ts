import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  BASE_URL: z.string().url().optional(),
  SHORT_CODE_LENGTH: z.coerce.number().int().min(6).max(7).default(7),
  // Rotating this changes codes for new requests (breaks dedup), but existing links keep working.
  SHORT_CODE_SECRET: z.string().min(32, "SHORT_CODE_SECRET must be at least 32 chars"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  CACHE_MISS_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  PGHOST: z.string().default("localhost"),
  PGPORT: z.coerce.number().int().positive().default(5432),
  PGUSER: z.string().default("postgres"),
  PGPASSWORD: z.string().default(""),
  PGDATABASE: z.string().default("url_shortner"),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),
  PG_SSL: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  // Disable on Lambda: concurrent cold starts would race; run `npm run migration:run` at deploy time instead.
  DB_RUN_MIGRATIONS: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
