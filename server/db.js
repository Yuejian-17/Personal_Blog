/**
 * 数据库连接池模块
 * @file 基于 mysql2/promise 创建 MySQL 连接池，供整个后端复用
 * @module server/db
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * MySQL 连接池实例
 * 使用环境变量配置，未设置时 fallback 到本地开发默认值
 * charset 使用 utf8mb4 以支持完整的 Unicode 字符（包括 emoji）
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'MyBlog',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

module.exports = pool;
