// 插入管理员账号（凭据来自 .env）
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function seedAdmin() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MyBlog',
  });

  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const profilePicture = process.env.ADMIN_AVATAR || '';
  const bio = process.env.ADMIN_BIO || '';

  if (!username || !email || !password) {
    console.error('请在 .env 中设置 ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD');
    process.exit(1);
  }

  // 检查是否已存在
  const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log('管理员账号已存在，跳过');
    await conn.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await conn.query(
    'INSERT INTO users (username, email, password_hash, profile_picture, bio, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, email, passwordHash, profilePicture, bio, 'admin', '2026-07-01 11:17:00']
  );

  console.log('管理员账号创建成功');
  console.log(`  邮箱: ${email}`);

  await conn.end();
}

seedAdmin().catch((err) => {
  console.error('创建失败:', err.message);
  process.exit(1);
});
