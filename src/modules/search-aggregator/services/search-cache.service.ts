import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * 搜索缓存服务
 * 使用 Redis 缓存搜索结果
 */
@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);
  private readonly redis: Redis;
  private readonly cachePrefix = 'search:';
  private readonly defaultTTL = 3600; // 默认缓存 1 小时
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD', '');

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      this.logger.log('Redis is ready');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(source: string, query: string, limit: number): string {
    return `${this.cachePrefix}${source}:${query}:${limit}`;
  }

  /**
   * 获取缓存
   */
  async get<T>(
    source: string,
    query: string,
    limit: number,
  ): Promise<T | null> {
    // Redis 未连接时直接返回 null，不影响主流程
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const key = this.getCacheKey(source, query, limit);
      const cached = await this.redis.get(key);

      if (cached) {
        this.logger.log(`Cache hit: ${key}`);
        return JSON.parse(cached) as T;
      }

      this.logger.log(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache get error: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    source: string,
    query: string,
    limit: number,
    data: T,
    ttl: number = this.defaultTTL,
  ): Promise<void> {
    // Redis 未连接时直接返回，不影响主流程
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const key = this.getCacheKey(source, query, limit);
      await this.redis.setex(key, ttl, JSON.stringify(data));
      this.logger.log(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache set error: ${errorMessage}`);
    }
  }

  /**
   * 删除缓存
   */
  async delete(source: string, query: string, limit: number): Promise<void> {
    try {
      const key = this.getCacheKey(source, query, limit);
      await this.redis.del(key);
      this.logger.log(`Cache deleted: ${key}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache delete error: ${errorMessage}`);
    }
  }

  /**
   * 清空所有搜索缓存
   * 使用 SCAN 代替 KEYS 避免阻塞 Redis
   */
  async clearAll(): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache clear');
      return;
    }

    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        // 使用 SCAN 迭代查找匹配的键
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${this.cachePrefix}*`,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        this.logger.log(`Cleared ${totalDeleted} cache entries`);
      } else {
        this.logger.log('No cache entries to clear');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache clear error: ${errorMessage}`);
    }
  }

  /**
   * 关闭 Redis 连接
   */
  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}
