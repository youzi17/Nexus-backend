import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SearchSource } from '../modules/search-aggregator/entities/search-source.entity';

// 加载环境变量
config();

/**
 * 测试脚本：模拟 SearchAggregatorService 的查询逻辑
 * 运行方式：npx ts-node src/scripts/test-aggregator.ts
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
    logging: true, // 开启日志查看 SQL
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected successfully\n');

    const repository = dataSource.getRepository(SearchSource);

    // 模拟 getEnabledSources 方法的查询逻辑
    console.log('=== Testing getEnabledSources Query ===\n');

    const queryBuilder = repository
      .createQueryBuilder('source')
      .where('source.enabled = :enabled', { enabled: true });

    console.log('Generated SQL:');
    console.log(queryBuilder.getSql());
    console.log('\nParameters:', { enabled: true });
    console.log('\n');

    const enabledSources = await queryBuilder
      .orderBy('source.priority', 'DESC')
      .getMany();

    console.log(`\nQuery Result: Found ${enabledSources.length} enabled sources\n`);

    enabledSources.forEach((source) => {
      console.log(`- ${source.name}`);
      console.log(`  enabled: ${source.enabled}`);
      console.log(`  priority: ${source.priority}`);
      console.log(`  id: ${source.id}`);
      console.log('');
    });

    // 测试不同的查询方式
    console.log('\n=== Testing Alternative Query (find method) ===\n');

    const enabledSources2 = await repository.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    });

    console.log(`Query Result: Found ${enabledSources2.length} enabled sources\n`);

  } catch (error) {
    console.error('Error testing aggregator:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

main();
