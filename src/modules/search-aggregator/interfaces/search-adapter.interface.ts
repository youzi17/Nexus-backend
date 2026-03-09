import { SearchResultItem } from '../dto/search-response.dto';

/**
 * 搜索适配器接口
 * 所有外部数据源适配器必须实现此接口
 */
export interface ISearchAdapter {
  /**
   * 适配器名称
   */
  readonly name: string;

  /**
   * 适配器描述
   */
  readonly description: string;

  /**
   * 执行搜索
   * @param query 搜索关键词
   * @param limit 返回结果数量限制
   * @returns 搜索结果列表
   */
  search(query: string, limit: number): Promise<SearchResultItem[]>;

  /**
   * 检查适配器是否可用
   * @returns 是否可用
   */
  isAvailable(): Promise<boolean>;
}
