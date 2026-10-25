import { QueryFailedError, type Repository } from "typeorm";
import { env } from "../config/env.js";
import { Url } from "../model/url.entity.js";
import { AppError, ConflictError, GoneError, NotFoundError } from "../util/errors.js";
import { logger } from "../util/logger.js";
import { hashToShortCode } from "../util/short-code.js";
import type { UrlCache } from "./url-cache.service.js";

const PG_UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 5;
// Top-level paths that a custom alias would shadow.
const RESERVED_ALIASES = new Set(["api", "health"]);

export interface ShortenOptions {
  alias?: string | undefined;
  expiresAt?: Date | undefined;
}

export class UrlService {
  constructor(
    private readonly urlRepository: Repository<Url>,
    private readonly cache: UrlCache,
  ) {}

  async shorten(originalUrl: string, { alias, expiresAt }: ShortenOptions = {}): Promise<Url> {
    const normalizedUrl = new URL(originalUrl).toString();

    if (alias) {
      if (RESERVED_ALIASES.has(alias.toLowerCase())) throw new ConflictError(`Alias '${alias}' is reserved`);
      try {
        return await this.insert(alias, normalizedUrl, expiresAt);
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError(`Alias '${alias}' is already taken`);
        throw err;
      }
    }

    // Deterministic: same URL + salt => same code; salt bumps only on a collision with a different mapping.
    for (let salt = 0; salt < MAX_CODE_ATTEMPTS; salt++) {
      const candidate = hashToShortCode(normalizedUrl, salt, env.SHORT_CODE_LENGTH, env.SHORT_CODE_SECRET);
      try {
        return await this.insert(candidate, normalizedUrl, expiresAt);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        const existing = await this.urlRepository.findOneBy({ alias: candidate });
        if (existing && isSameMapping(existing, normalizedUrl, expiresAt)) return existing;
        logger.warn({ salt, alias: candidate }, "Short code collision, rehashing with next salt");
      }
    }
    throw new AppError(503, "Could not allocate a short code, please retry");
  }

  async getByAlias(alias: string): Promise<Url> {
    let url = await this.cache.get(alias);
    if (url === undefined) {
      url = await this.urlRepository.findOneBy({ alias });
      void (url ? this.cache.set(url) : this.cache.setMissing(alias));
    }
    if (!url) throw new NotFoundError(`Short URL '${alias}' not found`);
    if (url.expiresAt && url.expiresAt <= new Date()) throw new GoneError(`Short URL '${alias}' has expired`);
    return url;
  }

  // insert() (not save()) so an existing PK raises a unique violation instead of being overwritten.
  private async insert(alias: string, originalUrl: string, expiresAt?: Date): Promise<Url> {
    const url = this.urlRepository.create({ alias, originalUrl, expiresAt: expiresAt ?? null });
    await this.urlRepository.insert(url);
    // Overwrites any negative-cache entry left by earlier 404 lookups.
    void this.cache.set(url);
    return url;
  }
}

function isSameMapping(existing: Url, url: string, expiresAt?: Date): boolean {
  return (
    existing.originalUrl === url &&
    (existing.expiresAt?.getTime() ?? null) === (expiresAt?.getTime() ?? null)
  );
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string } | undefined)?.code === PG_UNIQUE_VIOLATION
  );
}
