/**
 * 角色权限中间件
 * @file 基于 req.user.role 进行访问控制，通常配合 authMiddleware 使用
 * @module server/middleware/roleMiddleware
 */

/**
 * 限制只有指定角色可访问
 * @param  {...string} roles - 允许的角色列表，例如 'admin'、'user'
 * @returns {Function} Express 中间件函数
 */
function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '请先登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
}

module.exports = roleMiddleware;
