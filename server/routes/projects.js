/**
 * 项目路由
 * @file 处理项目作品的分页列表、详情、创建、更新、删除
 * @module server/routes/projects
 */
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// ---- 项目列表 ----
/**
 * GET /api/projects
 * 获取项目列表，支持分页
 * @param {number} [req.query.page=1] 页码
 * @param {number} [req.query.limit=10] 每页条数，最大 50
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
], async (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const offset = (page - 1) * limit;

  try {
    const [countResult] = await pool.query('SELECT COUNT(*) AS total FROM projects');
    const total = countResult[0].total;

    const [projects] = await pool.query(
      `SELECT p.*, u.username AS author_name
       FROM projects p
       JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      projects,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('获取项目列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 项目详情 ----
/**
 * GET /api/projects/:id
 * 获取单个项目详情
 * @param {string} req.params.id 项目 ID
 */
router.get('/:id', async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, u.username AS author_name
       FROM projects p JOIN users u ON p.author_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (projects.length === 0) return res.status(404).json({ message: '项目不存在' });
    res.json({ project: projects[0] });
  } catch (err) {
    console.error('获取项目详情失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 创建项目 ----
/**
 * POST /api/projects
 * 创建新项目（需登录）
 * @param {string} req.body.title 项目标题
 * @param {string} req.body.description 项目描述
 * @param {string} [req.body.tech_stack] 技术栈
 * @param {string} [req.body.github_url] GitHub 地址
 * @param {string} [req.body.live_url] 线上演示地址
 */
router.post('/', authMiddleware, [
  body('title').trim().notEmpty().withMessage('标题不能为空'),
  body('description').trim().notEmpty().withMessage('描述不能为空'),
  body('tech_stack').optional().trim(),
  body('github_url').optional().trim(),
  body('live_url').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, tech_stack, github_url, live_url } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO projects (author_id, title, description, tech_stack, github_url, live_url) VALUES (?,?,?,?,?,?)',
      [req.user.id, title, description, tech_stack || null, github_url || null, live_url || null]
    );
    res.status(201).json({ message: '项目创建成功', projectId: result.insertId });
  } catch (err) {
    console.error('创建项目失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 更新项目 ----
/**
 * PUT /api/projects/:id
 * 更新指定项目；仅作者本人或管理员可修改
 * 未提供的字段保持原值不变
 * @param {string} req.params.id 项目 ID
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ message: '项目不存在' });

    if (projects[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权修改' });
    }

    const { title, description, tech_stack, github_url, live_url } = req.body;
    await pool.query(
      'UPDATE projects SET title=?, description=?, tech_stack=?, github_url=?, live_url=? WHERE id=?',
      [title ?? projects[0].title, description ?? projects[0].description,
       tech_stack ?? projects[0].tech_stack, github_url ?? projects[0].github_url,
       live_url ?? projects[0].live_url, req.params.id]
    );
    res.json({ message: '项目更新成功' });
  } catch (err) {
    console.error('更新项目失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除项目 ----
/**
 * DELETE /api/projects/:id
 * 删除指定项目；仅作者本人或管理员可删除
 * @param {string} req.params.id 项目 ID
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ message: '项目不存在' });

    if (projects[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: '项目已删除' });
  } catch (err) {
    console.error('删除项目失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
