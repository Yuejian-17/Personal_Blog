/**
 * 媒体 API 路由
 * @file 处理音乐、背景图片、用户设置的查询与上传
 * 支持系统默认资源与用户私有资源的隔离
 * @module server/routes/media
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const authMiddlewareOptional = require('../middleware/authMiddlewareOptional');

// ---- 获取所有音乐（公开，登录后仅看自己+系统默认） ----
/**
 * GET /api/media/music
 * 获取音乐列表：未登录仅返回系统默认音乐，登录用户额外返回自己上传的音乐
 */
router.get('/music', authMiddlewareOptional, async (req, res) => {
  try {
    let query, params;
    if (req.user) {
      // 登录用户：看到系统公开（NULL）+ 自己的
      query = 'SELECT id, title, artist, file_path, duration FROM music_files WHERE user_id IS NULL OR user_id = ? ORDER BY id ASC';
      params = [req.user.id];
    } else {
      // 未登录：只看系统公开
      query = 'SELECT id, title, artist, file_path, duration FROM music_files WHERE user_id IS NULL ORDER BY id ASC';
      params = [];
    }
    const [rows] = await pool.query(query, params);
    const musicList = rows.map(r => ({ id: r.id, title: r.title, artist: r.artist, src: r.file_path }));
    res.json({ musicList });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 获取所有背景图片（公开，登录后仅看自己+系统默认） ----
/**
 * GET /api/media/backgrounds
 * 获取背景图片列表：未登录仅返回系统默认背景，登录用户额外返回自己上传的背景
 */
router.get('/backgrounds', authMiddlewareOptional, async (req, res) => {
  try {
    let query, params;
    if (req.user) {
      query = 'SELECT id, file_path FROM background_images WHERE user_id IS NULL OR user_id = ? ORDER BY id ASC';
      params = [req.user.id];
    } else {
      query = 'SELECT id, file_path FROM background_images WHERE user_id IS NULL ORDER BY id ASC';
      params = [];
    }
    const [rows] = await pool.query(query, params);
    res.json({ backgrounds: rows.map(r => ({ id: r.id, src: r.file_path })) });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 获取用户配置（需登录） ----
/**
 * GET /api/media/settings
 * 获取当前登录用户的主题、当前音乐、当前背景等配置
 * 无记录时返回默认值
 */
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({ settings: { theme: 'auto', current_music_id: null, current_background_id: null } });
    }
    res.json({ settings: rows[0] });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 更新用户配置（需登录） ----
/**
 * PUT /api/media/settings
 * 保存或更新当前用户的主题、当前音乐、当前背景配置
 * 使用 INSERT ... ON DUPLICATE KEY UPDATE 实现 upsert
 */
router.put('/settings', authMiddleware, async (req, res) => {
  const { current_music_id, current_background_id, theme } = req.body;
  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, current_music_id, current_background_id, theme)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_music_id = VALUES(current_music_id),
         current_background_id = VALUES(current_background_id),
         theme = VALUES(theme)`,
      [req.user.id, current_music_id || null, current_background_id || null, theme || 'auto']
    );
    res.json({ message: '配置已保存' });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除音乐（需登录，管理员或上传者） ----
/**
 * DELETE /api/media/music/:id
 * 删除指定音乐；仅上传者本人或管理员可删除
 * @param {string} req.params.id 音乐资源 ID
 */
router.delete('/music/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM music_files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '不存在' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除' });
    }
    await pool.query('DELETE FROM music_files WHERE id = ?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 删除背景（需登录，管理员或上传者） ----
/**
 * DELETE /api/media/backgrounds/:id
 * 删除指定背景图片；仅上传者本人或管理员可删除
 * @param {string} req.params.id 背景图片 ID
 */
router.delete('/backgrounds/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM background_images WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '不存在' });
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: '无权删除' });
    }
    await pool.query('DELETE FROM background_images WHERE id = ?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ---- 上传音乐（需登录） ----
/**
 * multer 存储配置：保存到 assets/music，限制 30MB，仅允许常见音频格式
 */
const musicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'assets', 'music');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.ogg';
    cb(null, `upload_${Date.now()}${ext}`);
  },
});
const uploadMusic = multer({
  storage: musicStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp3|ogg|wav|flac|aac|m4a/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

/**
 * POST /api/media/music
 * 上传音乐文件并写入数据库（需登录）
 * @param {File} req.file 音频文件字段名 'music'
 */
router.post('/music', authMiddleware, uploadMusic.single('music'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请选择音频文件' });
  const filePath = `assets/music/${req.file.filename}`;
  const title = req.body.title || req.file.originalname.replace(/\.[^.]+$/, '');
  try {
    const [result] = await pool.query(
      'INSERT INTO music_files (user_id, title, artist, file_path) VALUES (?, ?, ?, ?)',
      [req.user.id, title, req.body.artist || '本地导入', filePath]
    );
    res.json({ id: result.insertId, title, artist: req.body.artist || '本地导入', src: filePath });
  } catch (err) {
    res.status(500).json({ message: '上传失败' });
  }
});

// ---- 上传背景图片（需登录） ----
/**
 * multer 存储配置：保存到 assets/images/Background_Image，限制 10MB，仅允许常见图片格式
 */
const bgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'assets', 'images', 'Background_Image');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `bg_${Date.now()}${ext}`);
  },
});
const uploadBg = multer({
  storage: bgStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

/**
 * POST /api/media/backgrounds
 * 上传背景图片并写入数据库（需登录）
 * @param {File} req.file 图片文件字段名 'image'
 */
router.post('/backgrounds', authMiddleware, uploadBg.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请选择图片文件' });
  const filePath = `assets/images/Background_Image/${req.file.filename}`;
  try {
    const [result] = await pool.query(
      'INSERT INTO background_images (user_id, file_path) VALUES (?, ?)',
      [req.user.id, filePath]
    );
    res.json({ id: result.insertId, src: filePath });
  } catch (err) {
    res.status(500).json({ message: '上传失败' });
  }
});

module.exports = router;
