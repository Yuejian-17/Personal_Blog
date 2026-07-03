// 文件上传路由
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'assets', 'images', 'Profile_Picture');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  },
});

// 上传头像（含魔术字节校验）
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
