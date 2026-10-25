import type { Redis } from "ioredis";
import { Url } from "../model/url.entity.js";
import { logger } from "../util/logger.js";

const KEY_PREFIX = "url:";
const MISSING = "__missing__";

interface CachedUrl {
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

// All operations fail open: a Redis outage degrades to Postgres reads, never to errors.
export class UrlCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
    private readonly missTtlSeconds: number,
  ) {}

  /** `undefined` = cache miss, `null` = cached "does not exist". */
  async get(alias: string): Promise<Url | null | undefined> {
    try {
      const raw = await this.redis.get(KEY_PREFIX + alias);
      if (raw === null) return undefined;
      if (raw === MISSING) return null;
      const cached = JSON.parse(raw) as CachedUrl;
      return Object.assign(new Url(), {
        alias,
        originalUrl: cached.originalUrl,
        expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
        createdAt: new Date(cached.createdAt),
      });
    } catch (err) {
      logger.warn({ err, alias }, "Cache read failed");
      return undefined;
    }
  }

  async set(url: Url): Promise<void> {
    const ttl = url.expiresAt
      ? Math.min(this.ttlSeconds, Math.floor((url.expiresAt.getTime() - Date.now()) / 1000))
      : this.ttlSeconds;
    if (ttl <= 0) return;
    const value: CachedUrl = {
      originalUrl: url.originalUrl,
      expiresAt: url.expiresAt?.toISOString() ?? null,
      createdAt: url.createdAt.toISOString(),
    };
    await this.write(url.alias, JSON.stringify(value), ttl);
  }

  async setMissing(alias: string): Promise<void> {
    await this.write(alias, MISSING, this.missTtlSeconds);
  }

  private async write(alias: string, value: string, ttl: number): Promise<void> {
    try {
      await this.redis.set(KEY_PREFIX + alias, value, "EX", ttl);
    } catch (err) {
      logger.warn({ err, alias }, "Cache write failed");
    }
  }
}
