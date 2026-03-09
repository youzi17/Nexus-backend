import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISearchAdapter } from '../interfaces/search-adapter.interface';
import { SearchResultItem } from '../dto/search-response.dto';
import { retryAsync } from '../../../common/utils/retry.util';

/**
 * 百度AI搜索请求消息接口
 */
interface BaiduSearchMessage {
  content: string;
  role: 'user';
}

/**
 * 百度AI搜索资源类型过滤器接口
 */
interface BaiduSearchResourceFilter {
  type: 'web' | 'video' | 'image' | 'aladdin';
  top_k: number;
}

/**
 * 百度AI搜索请求接口
 */
interface BaiduSearchRequest {
  messages: BaiduSearchMessage[];
  search_source?: string;
  resource_type_filter?: BaiduSearchResourceFilter[];
  edition?: 'standard' | 'lite';
  search_recency_filter?: 'week' | 'month' | 'semiyear' | 'year' | 'noTimeLimit';
  safe_search?: boolean;
}

/**
 * 百度AI搜索结果引用接口
 */
interface BaiduSearchReference {
  id: number;
  title: string;
  content: string;
  url: string;
  date?: string;
  type: string;
  web_anchor?: string;
  image?: string | null;
  video?: string | null;
  icon?: string | null;
}

/**
 * 百度AI搜索响应接口
 */
interface BaiduSearchResponse {
  request_id: string;
  references?: BaiduSearchReference[];
  code?: string;
  message?: string;
}

/**
 * 百度AI搜索适配器
 * 提供百度搜索结果
 */
@Injectable()
export class BaiduSearchAdapter implements ISearchAdapter {
  private readonly logger = new Logger(BaiduSearchAdapter.name);
  readonly name = 'baidu-search';
  readonly description = '百度AI搜索';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://qianfan.baidubce.com/v2/ai_search/web_search';
  private readonly timeout = 15000; // 15秒超时

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BAIDU_SEARCH_API_KEY') || '';
  }

  /**
   * 执行搜索
   */
  async search(query: string, limit: number = 10): Promise<SearchResultItem[]> {
    if (!this.apiKey) {
      this.logger.warn('Baidu Search API key not configured');
      return [];
    }

    try {
      this.logger.log(`Searching with Baidu AI Search: ${query}`);

      // 使用重试机制执行搜索
      return await retryAsync(
        async () => {
          // 构造请求体
          const requestBody: BaiduSearchRequest = {
            messages: [
              {
                content: query,
                role: 'user',
              },
            ],
            search_source: 'baidu_search_v2',
            resource_type_filter: [
              {
                type: 'web',
                top_k: Math.min(limit, 50), // 百度AI搜索网页最多返回 50 条
              },
            ],
            edition: 'standard',
          };

          const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(this.timeout),
          });

          if (!response.ok) {
            throw new Error(
              `Baidu Search request failed: ${response.status} ${response.statusText}`,
            );
          }

          const data = (await response.json()) as BaiduSearchResponse;

          // 检查是否有错误
          if (data.code) {
            throw new Error(
              `Baidu Search API error: ${data.code} - ${data.message || 'Unknown error'}`,
            );
          }

          // 解析搜索结果
          const references = data.references || [];
          const results: SearchResultItem[] = references
            .slice(0, limit)
            .map((item: BaiduSearchReference) => ({
              title: item.title || '',
              snippet: item.content || '',
              url: item.url || '',
              source: this.name,
              metadata: {
                id: item.id,
                date: item.date,
                type: item.type,
                webAnchor: item.web_anchor,
              },
            }));

          this.logger.log(`Baidu Search returned ${results.length} results`);
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
      this.logger.error(`Baidu Search failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * 检查适配器是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // 执行一个简单的测试查询
      const requestBody: BaiduSearchRequest = {
        messages: [
          {
            content: 'test',
            role: 'user',
          },
        ],
        search_source: 'baidu_search_v2',
        resource_type_filter: [
          {
            type: 'web',
            top_k: 1,
          },
        ],
        edition: 'lite', // 使用 lite 版本减少延迟
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as BaiduSearchResponse;

      // 检查是否有错误码
      return !data.code;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Baidu Search availability check failed: ${errorMessage}`);
      return false;
    }
  }
}
