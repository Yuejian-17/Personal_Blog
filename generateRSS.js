// RSS 订阅源生成脚本
// 运行: node generateRSS.js

const fs = require('fs');
const path = require('path');

const SITE_TITLE = '书月舍 · 清歌';
const SITE_URL = 'https://your-domain.com'; // 替换为实际域名
const SITE_DESC = '一个平平无奇的普通人，偶尔写点自己喜欢的东西。';
const ARTICLES_PATH = path.join(__dirname, 'data', 'articles.json');
const OUTPUT_PATH = path.join(__dirname, 'feed.xml');

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRSS() {
  const raw = fs.readFileSync(ARTICLES_PATH, 'utf-8');
  const articles = JSON.parse(raw);

  const items = articles.map((a) => {
    const link = `${SITE_URL}/#/article/${a.id}`;
    const pubDate = new Date(a.date).toUTCString();
    const desc = a.content
      ? a.content.replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      : '';

    return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${escapeXml(a.author || '清歌')}</author>
      <description>${escapeXml(desc)}</description>
      ${(a.tags || []).map((t) => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`;
  }).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(SITE_URL)}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  fs.writeFileSync(OUTPUT_PATH, rss, 'utf-8');
  console.log(`RSS feed generated: ${OUTPUT_PATH}`);
  console.log(`Total articles: ${articles.length}`);
}

generateRSS();
