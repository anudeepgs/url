import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { AppDataSource } from "./config/data-source.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import { UrlController } from "./controller/url.controller.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { Url } from "./model/url.entity.js";
import { UrlCache } from "./service/url-cache.service.js";
import { UrlService } from "./service/url.service.js";
import { logger } from "./util/logger.js";

export function createApp() {
  const urlCache = new UrlCache(redis, env.CACHE_TTL_SECONDS, env.CACHE_MISS_TTL_SECONDS);
  const urlController = new UrlController(new UrlService(AppDataSource.getRepository(Url), urlCache));

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", async (_req, res) => {
    const cache = redis.status === "ready" ? "up" : "down";
    try {
      await AppDataSource.query("SELECT 1");
      res.json({ status: cache === "up" ? "ok" : "degraded", db: "up", cache });
    } catch {
      res.status(503).json({ status: "down", db: "down", cache });
    }
  });

  app.use("/api", urlController.apiRouter());
  app.use("/", urlController.redirectRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
