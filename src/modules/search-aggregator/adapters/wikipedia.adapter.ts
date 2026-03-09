import { Injectable, Logger } from '@nestjs/common';
import { ISearchAdapter } from '../interfaces/search-adapter.interface';
import { SearchResultItem } from '../dto/search-response.dto';
import { retryAsync } from '../../../common/utils/retry.util';

/**
 * Wikipedia OpenSearch API 响应类型
 * 返回格式: [查询词, 标题数组, 描述数组, URL数组]
 */
type WikipediaOpenSearchResponse = [string, string[], string[], string[]];

/**
 * Wikipedia 搜索适配器
 * 提供维基百科搜索结果
 */
@Injectable()
export class WikipediaAdapter implements ISearchAdapter {
  private readonly logger = new Logger(WikipediaAdapter.name);
  readonly name = 'wikipedia';
  readonly description = '维基百科知识库';
  private readonly baseUrl = 'https://zh.wikipedia.org/w/api.php';
  private readonly timeout = 10000; // 10秒超时

  /**
   * 执行搜索
   */
  async search(query: string, limit: number = 10): Promise<SearchResultItem[]> {
    try {
      this.logger.log(`Searching with Wikipedia: ${query}`);

      // 使用重试机制执行搜索
      return await retryAsync(
        async () => {
          // 第一步：搜索相关页面
          const searchParams = new URLSearchParams({
            action: 'opensearch',
            search: query,
            limit: limit.toString(),
            namespace: '0',
            format: 'json',
          });

          const searchResponse = await fetch(
            `${this.baseUrl}?${searchParams.toString()}`,
            {
              signal: AbortSignal.timeout(this.timeout),
            },
          );

          if (!searchResponse.ok) {
            throw new Error(
              `Wikipedia search failed: ${searchResponse.status} ${searchResponse.statusText}`,
            );
          }

          const searchData =
            (await searchResponse.json()) as WikipediaOpenSearchResponse;
          const titles = searchData[1] || [];
          const descriptions = searchData[2] || [];
          const urls = searchData[3] || [];

          // 构建结果
          const results: SearchResultItem[] = titles.map(
            (title: string, index: number) => ({
              title,
              snippet: descriptions[index] || '',
              url: urls[index] || '',
              source: this.name,
              metadata: {
                language: 'zh',
              },
            }),
          );

          this.logger.log(`Wikipedia returned ${results.length} results`);
          return results;
        },
        {
          maxRetries: 2,
          delayMs: 1000,
          backoff: true,
        },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Wikipedia search failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * 检查适配器是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        action: 'opensearch',
        search: 'test',
        limit: '1',
        format: 'json',
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        signal: AbortSignal.timeout(this.timeout),
      });
      return response.ok;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Wikipedia availability check failed: ${errorMessage}`);
      return false;
    }
  }
}
