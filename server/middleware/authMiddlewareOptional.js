// 可选认证中间件：Token 有效则注入用户，无效则匿名访问
const jwt = require('jsonwebtoken');

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
    // Token 无效，继续以匿名身份访问
  }
  next();
}

module.exports = authMiddlewareOptional;
