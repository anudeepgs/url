import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../util/errors.js";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) req.log.error({ err }, err.message);
    res.status(err.statusCode).json({ error: err.message, details: err.details });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
