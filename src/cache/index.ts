import { createClient, RedisClientType } from "redis";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { CacheEntry } from "../types/index.js";

class CacheService {
  private client: RedisClientType;
  private ttl: number = 300; // 5 minutes default

  constructor() {
    const reconnectStrategy = (retries: number) => Math.min(retries * 50, 500);

    this.client = config.REDIS_URL
      ? createClient({
          url: config.REDIS_URL,
          socket: { reconnectStrategy },
        })
      : createClient({
          password: config.REDIS_PASSWORD || undefined,
          socket: {
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            reconnectStrategy,
          },
        });

    this.client.on("error", (err) => {
      logger.error(`Redis client error: ${err instanceof Error ? err.message : "Unknown error"}`);
    });

    this.client.on("connect", () => {
      logger.info("Redis cache connected");
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.ttl = parseInt(process.env.WTO_CACHE_TTL || "300");
    } catch (err) {
      logger.warn(`Failed to connect to Redis, will continue without cache: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client.isOpen) return null;

      const cached = await this.client.get(key);
      if (!cached) return null;

      return JSON.parse(cached) as T;
    } catch (err) {
      logger.error(`Cache GET error for key ${key}: ${err instanceof Error ? err.message : "Unknown error"}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.client.isOpen) return false;

      const finalTTL = ttlSeconds || this.ttl;
      await this.client.setEx(key, finalTTL, JSON.stringify(value));
      return true;
    } catch (err) {
      logger.error(`Cache SET error for key ${key}: ${err instanceof Error ? err.message : "Unknown error"}`);
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      if (!this.client.isOpen) return false;
      const exists = await this.client.exists(key);
      return exists > 0;
    } catch (err) {
      logger.error(`Cache EXISTS error for key ${key}: ${err instanceof Error ? err.message : "Unknown error"}`);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (!this.client.isOpen) return false;
      const deleted = await this.client.del(key);
      return deleted > 0;
    } catch (err) {
      logger.error(`Cache DEL error for key ${key}: ${err instanceof Error ? err.message : "Unknown error"}`);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.client.isOpen) return;
      await this.client.flushDb();
    } catch (err) {
      logger.error(`Cache FLUSH error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  /**
   * Get or compute pattern: if cache miss, call fetcher and cache result
   */
  async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      logger.debug(`Cache hit for ${key}`);
      return cached;
    }

    logger.debug(`Cache miss for ${key}, fetching...`);
    const result = await fetcher();
    await this.set(key, result, ttlSeconds);
    return result;
  }
}

// Singleton instance
export const cacheService = new CacheService();
