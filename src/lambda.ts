import type { Context, Handler } from "aws-lambda";
import serverless from "serverless-http";
import { createApp } from "./app.js";
import { AppDataSource } from "./config/data-source.js";
import { redis } from "./config/redis.js";
import { logger } from "./util/logger.js";

type HttpHandler = ReturnType<typeof serverless>;

// Module scope survives warm invocations, so DB/Redis connections are reused across requests.
let appHandler: Promise<HttpHandler> | undefined;

async function bootstrap(): Promise<HttpHandler> {
  await AppDataSource.initialize();
  await redis.connect().catch((err) => logger.warn({ err }, "Redis unavailable, serving from Postgres only"));
  logger.info("Lambda cold start complete");
  return serverless(createApp());
}

export const handler: Handler = async (event: unknown, context: Context) => {
  appHandler ??= bootstrap().catch((err) => {
    appHandler = undefined;
    throw err;
  });
  return (await appHandler)(event as object, context);
};
