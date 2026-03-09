import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

// 加载环境变量（从项目根目录）
config({ path: resolve(__dirname, '../../.env') });

/**
 * 检查数据库中的表名
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
    synchronize: false,
    logging: false,
  };

  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('Database connected successfully\n');

    // 查询所有表名
    const tables = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%search%'
      ORDER BY table_name;
    `);

    console.log('=== Tables with "search" in name ===');
    tables.forEach((row: { table_name: string }) => {
      console.log(`  - ${row.table_name}`);
    });

    // 检查 search_source_configs 表的数据
    console.log('\n=== Data in search_source_configs ===');
    const data = await dataSource.query(`
      SELECT id, name, enabled, priority
      FROM search_source_configs
      ORDER BY priority DESC;
    `);

    console.log(`Total rows: ${data.length}\n`);
    data.forEach((row: { id: string; name: string; enabled: boolean; priority: number }) => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`Enabled: ${row.enabled}`);
      console.log(`Priority: ${row.priority}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('\nDatabase connection closed');
  }
}

main();
