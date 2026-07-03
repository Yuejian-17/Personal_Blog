// 文章列表页

import { createBackButton } from '../components/backButton.js';
import { Card3DRotator } from '../components/card3dRotator.js';

let _rotator = null;
let _articles = [];

async function renderArticleListPage() {
  console.log('[路由] 文章列表');
  const app = document.getElementById('app');

  const qMatch = window.location.hash.match(/\?q=(.+)/);
  const initialQuery = qMatch ? decodeURIComponent(qMatch[1]) : '';

  app.innerHTML = `
    <div class="article-list-page">
      <div class="al-search">
        <input type="text" class="al-search-input" id="al-search-input"
               placeholder="搜索文章标题或标签..." value="${escapeAttr(initialQuery)}">
      </div>
      <div class="al-list" id="al-list">
        <p class="al-empty">加载中...</p>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 从后端 API 加载文章
  _articles = await loadArticles();
  document.getElementById('al-list').innerHTML = renderFilteredList(_articles, initialQuery);

  // 激活 3D
  _rotator = new Card3DRotator('.al-card');
  initCardClicks();

  // 实时搜索
  let searchTimer = null;
  document.getElementById('al-search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    document.getElementById('al-list').innerHTML = renderFilteredList(_articles, query);
    if (_rotator) _rotator.updateCards();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const url = query ? `#/articles?q=${encodeURIComponent(query)}` : '#/articles';
      window.history.replaceState(null, '', url);
    }, 300);
  });

  // 右下角新建按钮
  ensureNewArticleBtn();
}

async function loadArticles() {
  try {
    const res = await fetch('/api/articles?limit=50');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const articles = (data.articles || []).map(a => ({
      id: String(a.id),
      title: a.title,
      date: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '',
      author: a.author_name || '',
      tags: a.tags || [],
      content: a.content || '',
    }));
    // 同步到 store
    if (window.store) {
      window.store.articles = articles;
    }
    return articles;
  } catch (err) {
    console.warn('API 加载失败，回退到本地数据:', err.message);
    const storeArticles = window.store?.articles || [];
    if (storeArticles.length === 0 && window.store) {
      // 等待 store 加载
      return new Promise(resolve => {
        window.store.on('dataLoaded', () => resolve(window.store.articles));
      });
    }
    return storeArticles;
  }
}

function renderFilteredList(articles, query) {
  const filtered = query
    ? articles.filter((a) => {
        const q = query.toLowerCase();
        return a.title.toLowerCase().includes(q) ||
          (a.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q));
      })
    : articles;

  if (filtered.length === 0) {
    return '<p class="al-empty">暂无文章</p>';
  }

  return filtered
    .map(
      (a) => `
    <div class="card-wrapper">
      <div class="al-card" data-id="${a.id}">
        <h3 class="al-card-title">${escapeHtml(a.title)}</h3>
        <div class="al-card-meta">
          <span>${a.date}</span>
          <span>${(a.tags || []).join(' · ')}</span>
        </div>
        <p class="al-card-excerpt">${escapeHtml(truncateExcerpt(a.content, 120))}</p>
      </div>
    </div>
  `
    )
    .join('');
}

function initCardClicks() {
  document.getElementById('al-list').addEventListener('click', (e) => {
    const card = e.target.closest('.al-card');
    if (card) {
      window.location.hash = `#/article/${card.dataset.id}`;
    }
  });
}

function truncateExcerpt(content, maxLen) {
  if (!content) return '';
  const text = content.replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

function ensureNewArticleBtn() {
  if (document.getElementById('al-new-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'al-new-btn';
  btn.className = 'al-new-btn';
  btn.innerHTML = '&#xFF0B;';
  btn.title = '新建文章';
  btn.addEventListener('click', () => {
    window.location.hash = '#/editor';
  });
  document.body.appendChild(btn);
}

export { renderArticleListPage };
