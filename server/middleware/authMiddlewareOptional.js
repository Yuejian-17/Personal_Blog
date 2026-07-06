/**
 * 可选 JWT 认证中间件
 * @file 验证通过时将用户信息挂载到 req.user；无 Token 或 Token 无效时以匿名身份继续访问
 * @module server/middleware/authMiddlewareOptional
 */
const jwt = require('jsonwebtoken');

/**
 * 可选 JWT 认证中间件
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - 下一个中间件
 * @returns {void} 无论认证是否成功均调用 next()
 */
function authMiddlewareOptional(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // Token 无效，继续以匿名身份访问，不阻断请求
  }
  next();
}

module.exports = authMiddlewareOptional;
