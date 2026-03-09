const { Client } = require('pg');

async function recreateDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin666',
    database: 'postgres', // 连接到默认数据库
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // 终止所有连接到 flowgenall 数据库的会话
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'flowgenall'
        AND pid <> pg_backend_pid();
    `);
    console.log('Terminated all connections to flowgenall');

    // 删除数据库
    await client.query('DROP DATABASE IF EXISTS flowgenall;');
    console.log('Dropped database flowgenall');

    // 创建数据库
    await client.query('CREATE DATABASE flowgenall;');
    console.log('Created database flowgenall');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

recreateDatabase();
