// 用户认证路由
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// ---- 邮件发送器 ----
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---- 内存验证码存储（生产环境建议用 Redis） ----
const codeStore = new Map(); // key: email, value: { code, expires, lastSent }

function generateCode() {
  return String(require('crypto').randomInt(100000, 1000000)); // 6位密码学安全随机数
}

// ==========================================
// 2.3 发送邮箱验证码
// ==========================================
router.post('/send-email-code', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  // 检查邮箱是否已注册（静默处理，不泄露注册状态）
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      // 返回成功但不实际发送，防止邮箱枚举
      return res.json({ message: '验证码已发送' });
    }
  } catch (err) {
    return res.status(500).json({ message: '服务器错误' });
  }

  // 60 秒内不可重复发送
  const existing = codeStore.get(email);
  if (existing && Date.now() - existing.lastSent < 60000) {
    return res.status(429).json({ message: '请 60 秒后再试' });
  }

  const code = generateCode();

  // 存入内存，5 分钟过期
  codeStore.set(email, {
    code,
    expires: Date.now() + 5 * 60 * 1000,
    lastSent: Date.now(),
  });

  try {
    await transporter.sendMail({
      from: `"书月舍" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '书月舍 · 注册验证码',
      text: `您的验证码是：${code}，5 分钟内有效。`,
      html: `<p>您的验证码是：<strong>${code}</strong></p><p>5 分钟内有效，请勿泄露。</p>`,
    });

    res.json({ message: '验证码已发送' });
  } catch (err) {
    console.error('邮件发送失败:', err);
    codeStore.delete(email);
    res.status(500).json({ message: '邮件发送失败，请稍后重试' });
  }
});

// ==========================================
// 2.1 注册（含验证码校验）
// ==========================================
router.post('/register', [
  body('username').trim().notEmpty().withMessage('昵称不能为空')
    .isLength({ max: 50 }).withMessage('昵称最长 50 个字符'),
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 8 }).withMessage('密码至少 8 位')
    .matches(/[a-zA-Z]/).withMessage('密码需包含字母')
    .matches(/[0-9]/).withMessage('密码需包含数字'),
  body('code').trim().notEmpty().withMessage('请输入验证码'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, code } = req.body;

  // 2.4 验证码校验
  const stored = codeStore.get(email);
  if (!stored) {
    return res.status(400).json({ message: '请先获取验证码' });
  }
  if (Date.now() > stored.expires) {
    codeStore.delete(email);
    return res.status(400).json({ message: '验证码已过期，请重新获取' });
  }
  if (stored.code !== code) {
    return res.status(400).json({ message: '验证码错误' });
  }

  // 验证码一次性消费
  codeStore.delete(email);

  try {
    // 检查邮箱或昵称是否已注册
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: '邮箱或昵称已被注册' });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, profile_picture, bio, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, passwordHash, 'assets/images/Profile_Picture/Initial_0.jpg', '这个人很神秘，什么都没有写喵~', 'user']
    );

    res.status(201).json({
      message: '注册成功',
      userId: result.insertId,
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 2.2 登录
// ==========================================
router.post('/login', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').notEmpty().withMessage('请输入密码'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 签发 JWT（2 小时有效）
    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 2.7 获取当前用户信息
// ==========================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, profile_picture, bio, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ user: users[0] });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 更新个人资料
// ==========================================
router.put('/profile', authMiddleware, [
  body('username').optional().trim().notEmpty().isLength({ max: 50 }),
  body('bio').optional().trim(),
  body('profile_picture').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const ALLOWED_FIELDS = ['username', 'bio', 'profile_picture'];
    const updates = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: '没有需要更新的字段' });
    }

    const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    await pool.query(
      `UPDATE users SET ${setClauses} WHERE id = ?`,
      [...Object.values(updates), req.user.id]
    );

    // 返回更新后的用户信息
    const [users] = await pool.query(
      'SELECT id, username, email, profile_picture, bio, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: '资料更新成功', user: users[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '昵称已被使用' });
    }
    console.error('更新资料失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// ==========================================
// 获取当前用户的文章和项目
// ==========================================
router.get('/works', authMiddleware, async (req, res) => {
  try {
    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.status, a.created_at
       FROM articles a WHERE a.author_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    const [projects] = await pool.query(
      `SELECT id, title, created_at
       FROM projects WHERE author_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ articles, projects });
  } catch (err) {
    console.error('获取作品列表失败:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
