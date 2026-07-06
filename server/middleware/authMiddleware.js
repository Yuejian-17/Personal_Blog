/**
 * JWT 鉴权中间件
 * @file 从请求头中提取 Bearer Token 并校验，校验通过后将用户信息挂载到 req.user
 * @module server/middleware/authMiddleware
 */
const jwt = require('jsonwebtoken');

/**
 * 强制 JWT 认证中间件
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 * @returns {void} 校验失败时直接返回 401，成功时调用 next()
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供有效的认证 Token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, username }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token 已过期或无效' });
  }
}

module.exports = authMiddleware;
