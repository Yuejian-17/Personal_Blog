/**
 * 文章列表页组件
 * @file 渲染文章列表，支持搜索、状态/年份/标签筛选、3D 卡片交互及新建文章入口
 * @module js/pages/articleListPage
 */

import { createBackButton } from '../components/backButton.js';
import { Card3DRotator } from '../components/card3dRotator.js';

let _rotator = null;
let _articles = [];
let _filterState = {
  query: '',
  status: 'all',      // all | published | draft
  year: 'all',        // all | thisYear | lastYear | older
  tag: 'all',
};

/**
 * 渲染文章列表页
 */
async function renderArticleListPage() {
  console.log('[路由] 文章列表');
  const app = document.getElementById('app');

  // 解析 URL 中的搜索关键词
  const qMatch = window.location.hash.match(/\?q=(.+)/);
  _filterState.query = qMatch ? decodeURIComponent(qMatch[1]) : '';

  app.innerHTML = `
    <div class="article-list-page">
      <div class="al-search">
        <input type="text" class="al-search-input" id="al-search-input"
               placeholder="搜索文章标题或标签..." value="${escapeAttr(_filterState.query)}">
      </div>
      <div class="al-filter-bar" id="al-filter-bar">
        <select class="al-filter-select" id="al-filter-status">
          <option value="all">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
        <select class="al-filter-select" id="al-filter-year">
          <option value="all">全部时间</option>
          <option value="thisYear">今年</option>
          <option value="lastYear">去年</option>
          <option value="older">更早</option>
        </select>
        <select class="al-filter-select" id="al-filter-tag">
          <option value="all">全部标签</option>
        </select>
      </div>
      <div class="al-list" id="al-list">
        <p class="al-empty">加载中...</p>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 从后端 API 加载文章
  _articles = await loadArticles();
  populateTagFilter(_articles);
  applyFilters();

  // 激活 3D
  _rotator = new Card3DRotator('.al-card');
  initCardClicks();

  // 实时搜索
  let searchTimer = null;
  document.getElementById('al-search-input').addEventListener('input', (e) => {
    _filterState.query = e.target.value.trim();
    applyFilters();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const url = _filterState.query ? `#/articles?q=${encodeURIComponent(_filterState.query)}` : '#/articles';
      window.history.replaceState(null, '', url);
    }, 300);
  });

  // 筛选器事件
  document.getElementById('al-filter-status').addEventListener('change', (e) => {
    _filterState.status = e.target.value;
    applyFilters();
  });
  document.getElementById('al-filter-year').addEventListener('change', (e) => {
    _filterState.year = e.target.value;
    applyFilters();
  });
  document.getElementById('al-filter-tag').addEventListener('change', (e) => {
    _filterState.tag = e.target.value;
    applyFilters();
  });

  // 右下角新建按钮
  ensureNewArticleBtn();
}

/**
 * 从后端 API 加载文章，失败时回退到本地 store
 * @returns {Promise<Object[]>} 文章数组
 */
async function loadArticles() {
  try {
    const res = await fetch('/api/articles?limit=50');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const articles = (data.articles || []).map(a => ({
      id: String(a.id),
      title: a.title,
      status: a.status || 'published',
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

/**
 * 根据文章标签填充标签筛选下拉框
 * @param {Object[]} articles 文章数组
 */
function populateTagFilter(articles) {
  const tagSet = new Set();
  articles.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));
  const select = document.getElementById('al-filter-tag');
  if (!select || tagSet.size === 0) return;
  [...tagSet].sort().forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    select.appendChild(opt);
  });
}

/**
 * 根据当前筛选条件过滤文章并重新渲染列表
 */
function applyFilters() {
  const filtered = _articles.filter((a) => {
    const q = _filterState.query.toLowerCase();
    const matchesQuery = !q ||
      a.title.toLowerCase().includes(q) ||
      (a.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (a.content && a.content.toLowerCase().includes(q));

    const matchesStatus = _filterState.status === 'all' || a.status === _filterState.status;

    let matchesYear = true;
    if (a.date && _filterState.year !== 'all') {
      const year = new Date(a.date).getFullYear();
      const nowYear = new Date().getFullYear();
      if (_filterState.year === 'thisYear') matchesYear = year === nowYear;
      else if (_filterState.year === 'lastYear') matchesYear = year === nowYear - 1;
      else if (_filterState.year === 'older') matchesYear = year < nowYear - 1;
    }

    const matchesTag = _filterState.tag === 'all' || (a.tags || []).includes(_filterState.tag);

    return matchesQuery && matchesStatus && matchesYear && matchesTag;
  });

  document.getElementById('al-list').innerHTML = renderArticleCards(filtered);
  if (_rotator) _rotator.updateCards();
  initCardClicks();
}

/**
 * 渲染文章卡片列表 HTML
 * @param {Object[]} articles 文章数组
 * @returns {string} HTML 字符串
 */
function renderArticleCards(articles) {
  if (articles.length === 0) {
    return '<p class="al-empty">暂无文章</p>';
  }

  return articles
    .map(
      (a) => `
    <div class="card-wrapper">
      <div class="al-card" data-id="${a.id}">
        <h3 class="al-card-title">${escapeHtml(a.title)}</h3>
        <div class="al-card-meta">
          <span>${a.date}</span>
          <span>${a.status === 'published' ? '已发布' : '草稿'}</span>
          <span>${(a.tags || []).join(' · ')}</span>
        </div>
        <p class="al-card-excerpt">${escapeHtml(truncateExcerpt(a.content, 120))}</p>
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * 绑定卡片点击跳转事件（事件委托）
 */
function initCardClicks() {
  document.getElementById('al-list').addEventListener('click', (e) => {
    const card = e.target.closest('.al-card');
    if (card) {
      window.location.hash = `#/article/${card.dataset.id}`;
    }
  });
}

/**
 * 截断正文生成摘要
 * @param {string} content 文章内容
 * @param {number} maxLen 最大长度
 * @returns {string} 摘要
 */
function truncateExcerpt(content, maxLen) {
  if (!content) return '';
  const text = content.replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

/**
 * HTML 转义
 * @param {string} str 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * HTML 属性转义
 * @param {string} str 原始字符串
 * @returns {string} 转义后的属性值
 */
function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

/**
 * 确保右下角新建文章按钮存在
 */
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
