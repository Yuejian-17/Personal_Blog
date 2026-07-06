/**
 * 文件上传路由
 * @file 处理用户头像上传，包含扩展名与魔术字节双重校验
 * @module server/routes/upload
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// 头像存储目录：位于项目根目录 assets/images/Profile_Picture
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'assets', 'images', 'Profile_Picture');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * multer 磁盘存储配置
 * 文件名格式：avatar_<时间戳>.<扩展名>
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

/**
 * multer 上传实例配置
 * 限制文件大小 5MB，仅允许 jpg/png/gif/webp 扩展名
 */
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  },
});

/**
 * POST /api/upload
 * 上传用户头像（需登录）
 * 通过 file-type 读取文件魔术字节进行二次校验，防止扩展名伪造
 * @param {File} req.file 头像文件字段名 'avatar'
 * @returns {Object} 上传成功后的相对 URL
 */
router.post('/', authMiddleware, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择有效的图片文件' });
  }

  // 魔术字节校验
  try {
    const { fileTypeFromFile } = await import('file-type');
    const type = await fileTypeFromFile(req.file.path);
    if (!type || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type.ext)) {
      fs.unlinkSync(req.file.path); // 删除伪造文件
      return res.status(400).json({ message: '文件类型不符，仅支持 JPG/PNG/GIF/WEBP' });
    }
  } catch (err) {
    console.error('文件类型检测失败:', err);
  }

  const url = `assets/images/Profile_Picture/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
