/**
 * 搜索结果项
 */
export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
  source: string; // 数据源标识
  metadata?: Record<string, string | number | boolean | undefined>; // 额外元数据
}

/**
 * 聚合搜索响应
 */
export interface AggregatedSearchResponse {
  query: string;
  totalResults: number;
  sources: {
    [sourceName: string]: {
      count: number;
      results: SearchResultItem[];
      error?: string;
    };
  };
  timestamp: string;
}

/**
 * 数据源信息
 */
export interface SourceInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  rateLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
