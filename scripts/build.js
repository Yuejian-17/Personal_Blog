// 构建脚本：复制文件到 dist/ 并压缩 CSS/JS
// 运行: node scripts/build.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// 确保 dist 存在
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// 需要复制的目录和文件
const copyDirs = [
  'assets',
  'data',
  'css',
  'js',
  'fonts',
];
const copyFiles = [
  'index.html',
  'feed.xml',
];

// 复制目录
for (const dir of copyDirs) {
  const src = path.join(ROOT, dir);
  const dest = path.join(DIST, dir);
  if (fs.existsSync(src)) {
    copyDirSync(src, dest);
    console.log(`[copy] ${dir}/`);
  }
}

// 复制文件
for (const file of copyFiles) {
  const src = path.join(ROOT, file);
  const dest = path.join(DIST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`[copy] ${file}`);
  }
}

// 压缩 CSS（使用 clean-css）
try {
  const CleanCSS = require('clean-css');
  const cssPath = path.join(DIST, 'css', 'style.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf-8');
    const minified = new CleanCSS().minify(css);
    fs.writeFileSync(cssPath, minified.styles, 'utf-8');
    console.log('[minify] css/style.css');
  }
} catch (e) {
  console.log('[skip] clean-css not installed, run: npm install');
}

// 压缩 JS（使用 terser）
try {
  // 对于简单的 vanilla JS 项目，跳过压缩（ES modules 不适合简单压缩）
  console.log('[info] JS files kept as-is (ES modules)');
} catch (e) {
  // ignore
}

console.log('\nBuild complete! Output: dist/');

// -- 辅助函数 --
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
