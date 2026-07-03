// 执行索引创建
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MyBlog',
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'indexes.sql'), 'utf-8');
  await conn.query(sql);
  console.log('索引创建完成');

  await conn.end();
}

run().catch((err) => {
  // 索引已存在等错误不影响
  if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_KEY') {
    console.log('部分索引已存在，跳过');
  } else {
    console.error('创建索引失败:', err.message);
  }
  process.exit(0);
});
