// 运行 init.sql 初始化数据库
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  // 先连接到 MySQL（不指定数据库）
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('已连接 MySQL');

  const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
  await conn.query(sql);
  console.log('数据库初始化完成');

  await conn.end();
}

run().catch((err) => {
  console.error('初始化失败:', err.message);
  process.exit(1);
});
