/**
 * Express 服务入口
 * @file 配置中间件、路由挂载、速率限制、CORS、安全头及全局错误处理
 * @module server/app
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 5.4 CORS 白名单 ----------
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 curl、Postman）或白名单内的来源
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

// ---------- 5.5 安全 HTTP 头 ----------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://giscus.app", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://giscus.app"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'", "https://giscus.app"],
      frameSrc: ["https://giscus.app"],
    },
  },
}));

// ---------- 5.8 请求日志 ----------
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

// ---------- 5.2 全局速率限制 ----------
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: '请求过多，请稍后再试' },
});

// 登录接口速率限制（防暴力破解）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '登录尝试过多，请 15 分钟后再试' },
});

// 发送验证码速率限制
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: '验证码发送次数过多，请 15 分钟后再试' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/send-email-code', emailLimiter);

// ---------- 中间件 ----------
app.use(express.json({ limit: '1mb' }));

// 仅暴露前端资源，阻止访问 server/ 等敏感目录
app.use((req, res, next) => {
  const blocked = ['/server', '/node_modules', '/.env', '/package', '/.git', 'setup'];
  if (blocked.some(p => req.path.toLowerCase().startsWith(p) || req.path.toLowerCase().includes('/.env'))) {
    return res.status(404).end();
  }
  next();
});
app.use(express.static(path.join(__dirname, '..')));

const pool = require('./db');

// 健康检查
/**
 * GET /api/health
 * 检查数据库连接是否正常
 */
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 路由挂载
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/comments'));
app.use('/api/search', require('./routes/search'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/media', require('./routes/media'));

// ---------- 5.8 全局错误处理 ----------
app.use((err, req, res, next) => {
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({ message: '请求被拒绝' });
  }
  console.error('[Error]', err.message || err);
  res.status(500).json({ message: '服务器内部错误' });
});

/**
 * 启动 HTTP 服务并校验数据库连接
 */
app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
  pool.query('SELECT 1')
    .then(() => console.log('数据库连接成功'))
    .catch((err) => console.error('数据库连接失败:', err.message));
});
