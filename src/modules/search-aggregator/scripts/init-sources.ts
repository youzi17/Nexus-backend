import { DataSource } from 'typeorm';
import { SearchSource } from '../entities/search-source.entity';

/**
 * 初始化搜索数据源
 * 在数据库中创建默认的搜索数据源配置
 */
export async function initializeSearchSources(
  dataSource: DataSource,
): Promise<void> {
  const searchSourceRepository = dataSource.getRepository(SearchSource);

  // 检查是否已经初始化
  const existingCount = await searchSourceRepository.count();
  if (existingCount > 0) {
    console.log('Search sources already initialized');
    return;
  }

  // 创建默认数据源
  const sources = [
    {
      name: 'baidu-search',
      description: '百度AI搜索',
      enabled: true,
      priority: 100,
      rateLimit: 100,
      config: {
        baseUrl: 'https://qianfan.baidubce.com/v2/ai_search/web_search',
        timeout: 15000,
      },
    },
    {
      name: 'wikipedia',
      description: '维基百科知识库',
      enabled: true,
      priority: 90,
      rateLimit: 200,
      config: {
        baseUrl: 'https://zh.wikipedia.org/w/api.php',
        timeout: 10000,
      },
    },
  ];

  for (const sourceData of sources) {
    const source = searchSourceRepository.create(sourceData);
    await searchSourceRepository.save(source);
    console.log(`Created search source: ${source.name}`);
  }

  console.log('Search sources initialized successfully');
}
