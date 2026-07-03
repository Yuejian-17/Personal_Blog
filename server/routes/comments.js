// 评论路由
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// ---- 获取某篇文章的评论（平铺返回，前端组装树形） ----
router.get('/articles/:articleId/comments', async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT c.*, u.username AS author_name, u.profile_picture AS author_avatar
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.article_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.articleId]
    );
    res.json({ comments });
  } catch (err) {
    console.error('获取评论失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 创建评论（需登录，最多两层） ----
router.post('/articles/:articleId/comments', authMiddleware, [
  body('content').trim().notEmpty().withMessage('评论内容不能为空')
    .isLength({ max: 5000 }).withMessage('评论内容最多 5000 字'),
  body('parent_id').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  let { content, parent_id } = req.body;
  let realParentId = parent_id || null;

  try {
    // 验证文章存在
    const [articles] = await pool.query('SELECT id FROM articles WHERE id = ?', [req.params.articleId]);
    if (articles.length === 0) return res.status(404).json({ message: '文章不存在' });

    // 两层限制：如果回复的是回复，扁平化为回复顶层评论
    if (parent_id) {
      const [parents] = await pool.query('SELECT id, parent_id, author_id FROM comments WHERE id = ? AND article_id = ?',
        [parent_id, req.params.articleId]);
      if (parents.length === 0) return res.status(400).json({ message: '父评论不存在' });

      // 如果父评论本身是回复，则 parent_id 设为祖父评论
      if (parents[0].parent_id) {
        realParentId = parents[0].parent_id;
        // 前置 "回复@username "
        const [grandparent] = await pool.query(
          'SELECT u.username FROM comments c JOIN users u ON c.author_id = u.id WHERE c.id = ?',
          [parents[0].id]
        );
        // 实际的被回复对象
        const [replyTarget] = await pool.query(
          'SELECT u.username FROM users u WHERE u.id = ?', [parents[0].author_id]
        );
        content = `回复@${replyTarget[0].username} ${content}`;
      }
    }

    const [result] = await pool.query(
      'INSERT INTO comments (article_id, parent_id, author_id, content) VALUES (?, ?, ?, ?)',
      [req.params.articleId, realParentId, req.user.id, content]
    );

    res.status(201).json({ message: '评论发表成功', commentId: result.insertId });
  } catch (err) {
    console.error('创建评论失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除评论（作者或 admin，级联删除子评论） ----
router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const [comments] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (comments.length === 0) return res.status(404).json({ message: '评论不存在' });

    // 权限：作者本人或管理员
    if (comments[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除此评论' });
    }

    // 递归删除所有子评论（MySQL FOREIGN KEY ON DELETE CASCADE 已处理）
    // 但需要手动查找孙子评论（因为只设了一级外键）
    await deleteCommentTree(req.params.id, pool);

    res.json({ message: '评论已删除' });
  } catch (err) {
    console.error('删除评论失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

/** 递归删除评论树 */
async function deleteCommentTree(commentId, conn) {
  // 查找所有直接子评论
  const [children] = await conn.query('SELECT id FROM comments WHERE parent_id = ?', [commentId]);
  for (const child of children) {
    await deleteCommentTree(child.id, conn);
  }
  await conn.query('DELETE FROM comments WHERE id = ?', [commentId]);
}

module.exports = router;
