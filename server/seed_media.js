// 创建媒体表并导入现有数据
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'MyBlog',
    multipleStatements: true,
  });

  // 创建表
  const sql = fs.readFileSync(path.join(__dirname, 'init_media.sql'), 'utf-8');
  await conn.query(sql);
  console.log('表创建完成');

  // 获取管理员 ID
  const [users] = await conn.query("SELECT id FROM users WHERE email = '728799678@qq.com'");
  const userId = users[0].id;

  // ---- 导入音乐 ----
  const musicData = [
    { title: 'Good Dream', artist: 'Kirara Magic (feat. Shion)', path: 'assets/music/Kirara Magic - Good Dream (feat_ Shion).ogg' },
    { title: 'Summer Dream', artist: 'Kirara Magic (feat. Chevy)', path: 'assets/music/Kirara Magic - Summer Dream (feat. Chevy).ogg' },
    { title: 'Rubia', artist: '周深', path: 'assets/music/周深 - Rubia.ogg' },
    { title: '惊鹊', artist: '海伊 / 星尘Minus / 忘川风华录', path: 'assets/music/海伊、星尘Minus、忘川风华录 - 惊鹊.ogg' },
    { title: '彼女は旅に出る', artist: '鎖那', path: 'assets/music/鎖那 - 彼女は旅に出る.ogg' },
    { title: 'crack', artist: '鹿乃', path: 'assets/music/鹿乃 - crack.ogg' },
  ];

  // 检查是否已有数据
  const [existing] = await conn.query('SELECT COUNT(*) as cnt FROM music_files');
  if (existing[0].cnt === 0) {
    for (const m of musicData) {
      await conn.query(
        'INSERT INTO music_files (user_id, title, artist, file_path) VALUES (?, ?, ?, ?)',
        [userId, m.title, m.artist, m.path]
      );
    }
    console.log(`导入 ${musicData.length} 首音乐`);
  } else {
    console.log('音乐数据已存在，跳过');
  }

  // ---- 导入背景图片 ----
  const bgData = [
    'assets/images/Background_Image/101439746_p0.jpg',
    'assets/images/Background_Image/144299158_p3.jpg',
    'assets/images/Background_Image/84662366_p0.jpg',
    'assets/images/Background_Image/86708470_p0.jpg',
    'assets/images/Background_Image/88296129_p0.jpg',
  ];

  const [bgExisting] = await conn.query('SELECT COUNT(*) as cnt FROM background_images');
  if (bgExisting[0].cnt === 0) {
    for (const bg of bgData) {
      await conn.query(
        'INSERT INTO background_images (user_id, file_path) VALUES (?, ?)',
        [userId, bg]
      );
    }
    console.log(`导入 ${bgData.length} 张背景`);
  } else {
    console.log('背景数据已存在，跳过');
  }

  await conn.end();
  console.log('完成');
}

run().catch(err => { console.error(err.message); process.exit(1); });
