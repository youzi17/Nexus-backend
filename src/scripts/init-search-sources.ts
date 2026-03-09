import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { initializeSearchSources } from '../modules/search-aggregator/scripts/init-sources';

// 加载环境变量
config();

/**
 * 独立脚本：初始化搜索数据源
 * 运行方式：npx ts-node src/scripts/init-search-sources.ts
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
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    await initializeSearchSources(dataSource);

    console.log('Search sources initialization completed');
  } catch (error) {
    console.error('Error initializing search sources:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

main();
