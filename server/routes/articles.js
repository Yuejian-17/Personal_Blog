/**
 * 文章路由
 * @file 处理文章的分页列表、详情、创建、更新、删除及标签管理
 * @module server/routes/articles
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const authMiddlewareOptional = require('../middleware/authMiddlewareOptional');

// ==========================================
// 3.1 文章列表（分页，仅已发布）
// ==========================================
/**
 * GET /api/articles
 * 获取已发布文章列表，支持分页
 * @param {number} [req.query.page=1] 页码
 * @param {number} [req.query.limit=10] 每页条数，最大 20
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt(), // 限制最大 20 条
], async (req, res) => {
  const page = req.query.page || 1;
  const limit = Math.min(req.query.limit || 10, 20);
  const offset = (page - 1) * limit;

  try {
    const [countResult] = await pool.query(
      "SELECT COUNT(*) AS total FROM articles WHERE status = 'published'"
    );
    const total = countResult[0].total;

    const [articles] = await pool.query(
      `SELECT a.id, a.title, LEFT(a.content, 200) AS content, a.status, a.created_at, a.updated_at,
              u.username AS author_name, u.profile_picture AS author_avatar
       FROM articles a
       JOIN users u ON a.author_id = u.id
       WHERE a.status = 'published'
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 为每篇文章加载标签
    for (const article of articles) {
      const [tags] = await pool.query(
        'SELECT tag FROM article_tags WHERE article_id = ?',
        [article.id]
      );
      article.tags = tags.map((t) => t.tag);
    }

    res.json({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('获取文章列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 3.2 文章详情（浏览量自增，草稿仅作者/admin可见）
// ==========================================
/**
 * GET /api/articles/:id
 * 获取单篇文章详情；草稿仅作者本人或管理员可见
 * @param {string} req.params.id 文章 ID
 */
router.get('/:id', authMiddlewareOptional, async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.content, a.status, a.created_at, a.updated_at,
              u.username AS author_name, u.profile_picture AS author_avatar,
              a.author_id
       FROM articles a
       JOIN users u ON a.author_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (articles.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    const article = articles[0];

    // 草稿仅作者本人或管理员可见
    if (article.status !== 'published') {
      if (!req.user || (req.user.id !== article.author_id && req.user.role !== 'admin')) {
        return res.status(404).json({ message: '文章不存在' });
      }
    }

    delete article.author_id; // 不暴露给前端

    // 加载标签
    const [tags] = await pool.query(
      'SELECT tag FROM article_tags WHERE article_id = ?',
      [req.params.id]
    );
    article.tags = tags.map((t) => t.tag);

    res.json({ article });
  } catch (err) {
    console.error('获取文章详情失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 3.3 创建文章（需认证）
// ==========================================
/**
 * POST /api/articles
 * 创建新文章；普通用户只能保存为草稿，admin 可直接发布
 * @param {string} req.body.title 标题
 * @param {string} req.body.content 正文
 * @param {('published'|'draft')} [req.body.status='draft'] 状态
 * @param {string[]} [req.body.tags=[]] 标签数组，最多 10 个
 */
router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空'),
  body('status').optional().isIn(['published', 'draft']),
  body('tags').optional().isArray({ max: 10 }).withMessage('标签最多 10 个'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { title, content, status = 'draft', tags = [] } = req.body;
  // admin 可设置任意状态，普通用户只能 draft
  const finalStatus = req.user.role === 'admin' ? status : 'draft';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO articles (author_id, title, content, status) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, finalStatus]
    );

    // 插入标签
    const articleId = result.insertId;
    if (tags.length > 0) {
      const values = tags.map((t) => [articleId, t]);
      await conn.query('INSERT INTO article_tags (article_id, tag) VALUES ?', [values]);
    }

    await conn.commit();

    res.status(201).json({
      message: '文章创建成功',
      article: { id: articleId, title, status: finalStatus, tags },
    });
  } catch (err) {
    await conn.rollback();
    console.error('创建文章失败:', err);
    res.status(500).json({ message: '服务器错误' });
  } finally {
    conn.release();
  }
});

// ==========================================
// 3.4 更新文章（作者或 admin）
// ==========================================
/**
 * PUT /api/articles/:id
 * 更新指定文章；仅作者本人或管理员可修改
 * 若提供 tags，会先清空旧标签再重新写入
 * @param {string} req.params.id 文章 ID
 */
router.put('/:id', authMiddleware, [
  body('title').optional().trim().notEmpty(),
  body('content').optional().notEmpty(),
  body('status').optional().isIn(['published', 'draft']),
  body('tags').optional().isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (articles.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    const article = articles[0];
    if (article.author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改此文章' });
    }

    const { title, content, status, tags } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
        await conn.query(
          `UPDATE articles SET ${setClauses} WHERE id = ?`,
          [...Object.values(updates), req.params.id]
        );
      }

      // 更新标签
      if (tags !== undefined) {
        await conn.query('DELETE FROM article_tags WHERE article_id = ?', [req.params.id]);
        if (tags.length > 0) {
          const values = tags.map((t) => [req.params.id, t]);
          await conn.query('INSERT INTO article_tags (article_id, tag) VALUES ?', [values]);
        }
      }

      await conn.commit();
      res.json({ message: '文章更新成功' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('更新文章失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 3.5 删除文章（作者或 admin）
// ==========================================
/**
 * DELETE /api/articles/:id
 * 删除指定文章；仅作者本人或管理员可删除
 * 关联的评论、标签由数据库级联删除
 * @param {string} req.params.id 文章 ID
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [articles] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (articles.length === 0) {
      return res.status(404).json({ message: '文章不存在' });
    }

    if (articles[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除此文章' });
    }

    // 级联删除由数据库 FOREIGN KEY ... ON DELETE CASCADE 处理
    await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);

    res.json({ message: '文章已删除' });
  } catch (err) {
    console.error('删除文章失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
