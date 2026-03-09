import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { createHash } from 'crypto';
import { QwenModel } from '../types/model.enum';
import { AiGenerateResult } from '../types/ai.types';

/**
 * AI 结果缓存服务
 * 使用 Redis 缓存 AI 生成结果，按模型动态配置 TTL
 */
@Injectable()
export class AiCacheService {
  private readonly cachePrefix: string;
  private readonly cacheTtlMap: Record<QwenModel, number>;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.cachePrefix = this.configService.get<string>('AI_CACHE_PREFIX', 'ai');

    // 按模型配置缓存 TTL（秒）
    this.cacheTtlMap = {
      [QwenModel.QWEN_PLUS]: this.configService.get<number>(
        'AI_CACHE_TTL_QWEN_PLUS',
        1800,
      ), // 30分钟
      [QwenModel.QWEN_MAX]: this.configService.get<number>(
        'AI_CACHE_TTL_QWEN_MAX',
        7200,
      ), // 2小时
      [QwenModel.QWEN_VL]: this.configService.get<number>(
        'AI_CACHE_TTL_QWEN_VL',
        3600,
      ), // 1小时
    };
  }

  /**
   * 生成缓存键
   * @param model 模型
   * @param contextHash 上下文哈希
   * @returns 缓存键
   */
  private generateCacheKey(model: QwenModel, contextHash: string): string {
    return `${this.cachePrefix}:${model}:${contextHash}`;
  }

  /**
   * 计算上下文哈希
   * @param query 查询文本
   * @param fileIds 文件 ID 列表
   * @param sources 外部来源列表
   * @returns 上下文哈希
   */
  generateContextHash(
    query: string,
    fileIds: string[] = [],
    sources: Array<{ url: string }> = [],
  ): string {
    const content = JSON.stringify({
      query,
      fileIds: fileIds.sort(),
      sourceUrls: sources.map((s) => s.url).sort(),
    });

    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 获取缓存的 AI 结果
   * @param model 模型
   * @param contextHash 上下文哈希
   * @returns 缓存的结果，如果不存在则返回 null
   */
  async getCachedResult(
    model: QwenModel,
    contextHash: string,
  ): Promise<AiGenerateResult | null> {
    const cacheKey = this.generateCacheKey(model, contextHash);
    const cached = await this.cacheManager.get<AiGenerateResult>(cacheKey);
    return cached || null;
  }

  /**
   * 设置缓存的 AI 结果
   * @param model 模型
   * @param contextHash 上下文哈希
   * @param result AI 生成结果
   */
  async setCachedResult(
    model: QwenModel,
    contextHash: string,
    result: AiGenerateResult,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(model, contextHash);
    const ttl = this.getCacheTTL(model);

    // 标记结果来自缓存
    const cachedResult: AiGenerateResult = {
      ...result,
      fromCache: true,
    };

    await this.cacheManager.set(cacheKey, cachedResult, ttl * 1000); // TTL 单位转换为毫秒
  }

  /**
   * 获取模型的缓存 TTL
   * @param model 模型
   * @returns TTL（秒）
   */
  getCacheTTL(model: QwenModel): number {
    return this.cacheTtlMap[model];
  }

  /**
   * 删除缓存
   * @param model 模型
   * @param contextHash 上下文哈希
   */
  async deleteCachedResult(
    model: QwenModel,
    contextHash: string,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(model, contextHash);
    await this.cacheManager.del(cacheKey);
  }

  /**
   * 清空所有 AI 缓存
   * 注意：由于 cache-manager 的限制，这个方法暂不实现
   * 如果需要清空缓存，可以直接重启 Redis 或使用 Redis CLI
   */
  clearAllCache(): void {
    // cache-manager v5 不再提供 reset 方法
    // 如果需要清空所有 AI 缓存，需要使用 Redis 的 SCAN 命令
    // 这里暂不实现，因为不是核心功能
    throw new Error(
      'clearAllCache is not implemented. Please use Redis CLI to clear cache.',
    );
  }
}
