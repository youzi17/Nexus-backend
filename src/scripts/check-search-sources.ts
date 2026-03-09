import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SearchSource } from '../modules/search-aggregator/entities/search-source.entity';

// 加载环境变量
config();

/**
 * 查询脚本：检查搜索数据源状态
 * 运行方式：npx ts-node src/scripts/check-search-sources.ts
 */
async function main() {
  console.log('Connecting to database...');

  const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'flowgenall',
    entities: [SearchSource],
    synchronize: false,
    logging: false,
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected successfully\n');

    const repository = dataSource.getRepository(SearchSource);

    // 查询所有数据源
    const allSources = await repository.find({
      order: { priority: 'DESC' },
    });

    console.log('=== All Search Sources ===');
    console.log(`Total count: ${allSources.length}\n`);

    allSources.forEach((source) => {
      console.log(`ID: ${source.id}`);
      console.log(`Name: ${source.name}`);
      console.log(`Description: ${source.description}`);
      console.log(`Enabled: ${source.enabled}`);
      console.log(`Priority: ${source.priority}`);
      console.log(`Rate Limit: ${source.rateLimit}`);
      console.log(`Created At: ${source.createdAt}`);
      console.log('---');
    });

    // 查询启用的数据源
    const enabledSources = await repository.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    });

    console.log('\n=== Enabled Search Sources ===');
    console.log(`Enabled count: ${enabledSources.length}\n`);

    enabledSources.forEach((source) => {
      console.log(`- ${source.name} (priority: ${source.priority})`);
    });

  } catch (error) {
    console.error('Error checking search sources:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\nDatabase connection closed');
  }
}

main();
