// 搜索路由
const express = require('express');
const { query, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');

router.get('/', [
  query('q').trim().notEmpty().withMessage('搜索关键词不能为空'),
  query('type').optional().isIn(['articles', 'projects', 'all']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const q = `%${req.query.q}%`;
  const type = req.query.type || 'all';
  const results = {};

  try {
    if (type === 'all' || type === 'articles') {
      const [articles] = await pool.query(
        `SELECT a.id, a.title, a.created_at, u.username AS author_name
         FROM articles a JOIN users u ON a.author_id = u.id
         WHERE a.status = 'published' AND (a.title LIKE ? OR a.content LIKE ?)
         ORDER BY a.created_at DESC LIMIT 20`,
        [q, q]
      );
      results.articles = articles;
    }

    if (type === 'all' || type === 'projects') {
      const [projects] = await pool.query(
        `SELECT id, title, description, tech_stack, github_url
         FROM projects
         WHERE title LIKE ? OR description LIKE ? OR tech_stack LIKE ?
         ORDER BY created_at DESC LIMIT 20`,
        [q, q, q]
      );
      results.projects = projects;
    }

    res.json(results);
  } catch (err) {
    console.error('搜索失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
