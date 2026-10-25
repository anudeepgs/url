import "reflect-metadata";
import { DataSource } from "typeorm";
import { CreateUrls1761300000000 } from "../migrations/1761300000000-CreateUrls.js";
import { Url } from "../model/url.entity.js";
import { env } from "./env.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.PGHOST,
  port: env.PGPORT,
  username: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  ssl: env.PG_SSL,
  entities: [Url],
  migrations: [CreateUrls1761300000000],
  synchronize: false,
  migrationsRun: env.DB_RUN_MIGRATIONS,
  logging: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  extra: { max: env.PG_POOL_MAX },
});
