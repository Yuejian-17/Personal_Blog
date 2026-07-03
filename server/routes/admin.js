// 管理员路由
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// 所有路由需要 admin 权限
router.use(authMiddleware, roleMiddleware('admin'));

// ---- 获取所有用户 ----
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, profile_picture, bio, role, created_at FROM users ORDER BY id ASC'
    );
    res.json({ users });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除用户 ----
router.delete('/users/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role != ?', [req.params.id, 'admin']);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '用户不存在或无法删除管理员' });
    }
    res.json({ message: '用户已删除' });
  } catch (err) {
    console.error('删除用户失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 获取所有文章（含草稿） ----
router.get('/articles', async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.*, u.username AS author_name
       FROM articles a JOIN users u ON a.author_id = u.id
       ORDER BY a.id ASC`
    );
    res.json({ articles });
  } catch (err) {
    console.error('获取文章列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除任意文章 ----
router.delete('/articles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ message: '文章已删除' });
  } catch (err) {
    console.error('删除文章失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 获取所有项目 ----
router.get('/projects', async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, u.username AS author_name
       FROM projects p JOIN users u ON p.author_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json({ projects });
  } catch (err) {
    console.error('获取项目列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除任意项目 ----
router.delete('/projects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: '项目已删除' });
  } catch (err) {
    console.error('删除项目失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
