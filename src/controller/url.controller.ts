import { Router, type Request, type Response } from "express";
import type { ZodType } from "zod";
import { env } from "../config/env.js";
import type { Url } from "../model/url.entity.js";
import type { UrlService } from "../service/url.service.js";
import { ValidationError } from "../util/errors.js";
import { aliasParamSchema, createUrlSchema } from "./url.dto.js";

function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.flatten().fieldErrors);
  return result.data;
}

export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  create = async (req: Request, res: Response) => {
    const { url, alias, expiresAt } = parse(createUrlSchema, req.body);
    const created = await this.urlService.shorten(url, { alias, expiresAt });
    res.status(201).json(this.toResponse(req, created));
  };

  get = async (req: Request, res: Response) => {
    const { alias } = parse(aliasParamSchema, req.params);
    const url = await this.urlService.getByAlias(alias);
    res.json(this.toResponse(req, url));
  };

  redirect = async (req: Request, res: Response) => {
    const { alias } = parse(aliasParamSchema, req.params);
    const url = await this.urlService.getByAlias(alias);
    res.redirect(302, url.originalUrl);
  };

  private toResponse(req: Request, url: Url) {
    const baseUrl = env.BASE_URL ?? `${req.protocol}://${req.get("host")}`;
    return {
      alias: url.alias,
      originalUrl: url.originalUrl,
      shortUrl: `${baseUrl}/${url.alias}`,
      expiresAt: url.expiresAt,
      createdAt: url.createdAt,
    };
  }

  apiRouter(): Router {
    return Router().post("/urls", this.create).get("/urls/:alias", this.get);
  }

  redirectRouter(): Router {
    return Router().get("/:alias", this.redirect);
  }
}
