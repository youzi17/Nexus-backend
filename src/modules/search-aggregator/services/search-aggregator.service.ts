import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ISearchAdapter } from '../interfaces/search-adapter.interface';
import {
  SearchResultItem,
  AggregatedSearchResponse,
} from '../dto/search-response.dto';
import { SearchSource } from '../entities/search-source.entity';
import { SearchCacheService } from './search-cache.service';
import { BaiduSearchAdapter } from '../adapters/baidu-search.adapter';
import { WikipediaAdapter } from '../adapters/wikipedia.adapter';

/**
 * 搜索聚合服务
 * 负责协调多个搜索适配器，聚合搜索结果
 */
@Injectable()
export class SearchAggregatorService {
  private readonly logger = new Logger(SearchAggregatorService.name);
  private readonly adapters: Map<string, ISearchAdapter> = new Map();

  constructor(
    @InjectRepository(SearchSource)
    private readonly searchSourceRepository: Repository<SearchSource>,
    private readonly cacheService: SearchCacheService,
    private readonly baiduSearchAdapter: BaiduSearchAdapter,
    private readonly wikipediaAdapter: WikipediaAdapter,
  ) {
    // 注册所有适配器
    this.registerAdapter(this.baiduSearchAdapter);
    this.registerAdapter(this.wikipediaAdapter);

    // 初始化时检查数据源
    this.checkSourcesOnInit();
  }

  /**
   * 初始化时检查数据源
   */
  private async checkSourcesOnInit(): Promise<void> {
    try {
      const allSources = await this.searchSourceRepository.find();
      this.logger.log(`[INIT] Total sources in database: ${allSources.length}`);

      allSources.forEach(s => {
        this.logger.log(`[INIT] Source: ${s.name}, enabled: ${s.enabled}, priority: ${s.priority}`);
      });

      const enabledSources = allSources.filter(s => s.enabled);
      this.logger.log(`[INIT] Enabled sources: ${enabledSources.length}`);
    } catch (error) {
      this.logger.error('[INIT] Failed to check sources on init', error);
    }
  }

  /**
   * 注册适配器
   */
  private registerAdapter(adapter: ISearchAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.logger.log(`Registered adapter: ${adapter.name}`);
  }

  /**
   * 聚合搜索
   */
  async aggregateSearch(
    query: string,
    sourceNames?: string[],
    limit: number = 10,
  ): Promise<AggregatedSearchResponse> {
    this.logger.log(`Aggregating search for query: ${query}`);

    // 获取启用的数据源
    const enabledSources = await this.getEnabledSources(sourceNames);

    if (enabledSources.length === 0) {
      this.logger.warn('No enabled sources found');
      return {
        query,
        totalResults: 0,
        sources: {},
        timestamp: new Date().toISOString(),
      };
    }

    // 并行执行所有数据源的搜索
    const searchPromises = enabledSources.map((source) =>
      this.searchWithSource(source, query, limit),
    );

    const searchResults = await Promise.allSettled(searchPromises);

    // 聚合结果
    const sources: AggregatedSearchResponse['sources'] = {};
    let totalResults = 0;

    searchResults.forEach((result, index) => {
      const sourceName = enabledSources[index].name;

      if (result.status === 'fulfilled') {
        const results = result.value;
        sources[sourceName] = {
          count: results.length,
          results,
        };
        totalResults += results.length;
      } else {
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        this.logger.error(`Search failed for ${sourceName}: ${errorMessage}`);
        sources[sourceName] = {
          count: 0,
          results: [],
          error: errorMessage,
        };
      }
    });

    return {
      query,
      totalResults,
      sources,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 使用指定数据源搜索
   */
  private async searchWithSource(
    source: SearchSource,
    query: string,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const adapter = this.adapters.get(source.name);

    if (!adapter) {
      throw new Error(`Adapter not found: ${source.name}`);
    }

    // 检查缓存
    const cached = await this.cacheService.get<SearchResultItem[]>(
      source.name,
      query,
      limit,
    );

    if (cached) {
      return cached;
    }

    // 执行搜索
    const results = await adapter.search(query, limit);

    // 缓存结果
    await this.cacheService.set(source.name, query, limit, results);

    return results;
  }

  /**
   * 获取启用的数据源
   * 支持通过 ID 或 name 筛选数据源
   */
  private async getEnabledSources(
    sourceIdentifiers?: string[],
  ): Promise<SearchSource[]> {
    this.logger.log('getEnabledSources called');
    this.logger.log(`sourceIdentifiers: ${JSON.stringify(sourceIdentifiers)}`);

    const queryBuilder = this.searchSourceRepository
      .createQueryBuilder('source')
      .where('source.enabled = :enabled', { enabled: true });

    if (sourceIdentifiers && sourceIdentifiers.length > 0) {
      // 支持通过 ID 或 name 筛选
      queryBuilder.andWhere(
        '(source.id IN (:...identifiers) OR source.name IN (:...identifiers))',
        { identifiers: sourceIdentifiers },
      );
    }

    this.logger.log(`SQL: ${queryBuilder.getSql()}`);

    const result = await queryBuilder.orderBy('source.priority', 'DESC').getMany();

    this.logger.log(`Found ${result.length} enabled sources`);
    result.forEach(s => {
      this.logger.log(`  - ${s.name} (enabled: ${s.enabled}, priority: ${s.priority})`);
    });

    return result;
  }

  /**
   * 获取所有数据源列表
   */
  async getAllSources(): Promise<SearchSource[]> {
    return await this.searchSourceRepository.find({
      order: { priority: 'DESC' },
    });
  }

  /**
   * 更新数据源状态
   */
  async updateSourceStatus(
    sourceName: string,
    enabled: boolean,
  ): Promise<SearchSource> {
    const source = await this.searchSourceRepository.findOne({
      where: { name: sourceName },
    });

    if (!source) {
      throw new Error(`Source not found: ${sourceName}`);
    }

    source.enabled = enabled;
    return await this.searchSourceRepository.save(source);
  }

  /**
   * 检查所有适配器的可用性
   */
  async checkAdaptersAvailability(): Promise<Record<string, boolean>> {
    const availability: Record<string, boolean> = {};

    const checkPromises = Array.from(this.adapters.entries()).map(
      async ([name, adapter]) => {
        try {
          availability[name] = await adapter.isAvailable();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Availability check failed for ${name}: ${errorMessage}`,
          );
          availability[name] = false;
        }
      },
    );

    await Promise.all(checkPromises);

    return availability;
  }
}
