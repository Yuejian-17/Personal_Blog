/**
 * 文章详情页组件
 * @file 渲染 Markdown 文章正文、作者信息、权限操作按钮及评论树
 * @module js/pages/articleDetailPage
 */

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

let _currentUserId = null;
let _currentUserRole = null;

// ---- Giscus 配置 ----
const GISCUS_CONFIG = {
  repo: 'your-username/your-repo',
  repoId: 'R_kgDOxxxxx',
  category: 'Announcements',
  categoryId: 'DIC_kwDOxxxxx',
};

/**
 * 渲染文章详情页
 * @param {string} id 文章 ID
 */
async function renderArticleDetailPage(id) {
  console.log('[路由] 文章详情, id:', id);
  const app = document.getElementById('app');

  app.innerHTML = '<div class="placeholder-page"><h2>数据加载中...</h2></div>';
  app.prepend(createBackButton());

  // 先从 API 加载
  let article = null;
  let isAuthor = false;
  let isAdmin = false;

  try {
    const res = await fetch(`/api/articles/${id}`);
    if (res.ok) {
      const data = await res.json();
      article = data.article;
    }
  } catch (err) { console.warn('API 详情加载失败:', err.message); }

  // 回退到 store
  if (!article) {
    const articles = window.store?.articles || [];
    const found = articles.find((a) => String(a.id) === id);
    if (found) article = { ...found, author_name: found.author };
  }

  if (!article) {
    app.innerHTML = '<div class="placeholder-page"><h2>文章未找到</h2><p>该文章不存在或已被删除。</p></div>';
    app.prepend(createBackButton());
    return;
  }

  // 权限检查
  if (AuthService.isLoggedIn()) {
    try {
      const user = await AuthService.getMe();
      isAuthor = user.id === article.author_id || user.username === article.author_name;
      isAdmin = user.role === 'admin';
      // 存储到模块作用域供评论渲染使用
      _currentUserId = user.id;
      _currentUserRole = user.role;
    } catch (e) { /* ignore */ }
  } else {
    _currentUserId = null;
    _currentUserRole = null;
  }

  const htmlContent = DOMPurify.sanitize(window.marked.parse(article.content || ''));
  const dateStr = article.created_at ? new Date(article.created_at).toISOString().slice(0, 10) : (article.date || '');

  app.innerHTML = `
    <article class="article-detail">
      <header class="article-header">
        <h1>${escapeHtml(article.title)}</h1>
        <div class="article-meta">
          <span>${escapeHtml(article.author_name || '')}</span>
          <span>·</span>
          <span>${dateStr}</span>
        </div>
        <div class="article-tags">
          ${(article.tags || []).map((t) => `<span class="article-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        ${(isAuthor || isAdmin) ? `
          <div class="article-actions">
            <button class="art-act-btn art-act-btn--edit" id="art-edit-btn">编辑</button>
            <button class="art-act-btn art-act-btn--del" id="art-del-btn">删除</button>
          </div>
        ` : ''}
      </header>
      <div class="article-body">
        ${htmlContent}
      </div>
      <div class="article-comments" id="comments-section">
        <h3>评论</h3>
        ${AuthService.isLoggedIn() ? `
          <div class="cmt-form">
            <textarea class="cmt-textarea" id="cmt-textarea" placeholder="写下你的评论..."></textarea>
            <button class="cmt-submit" id="cmt-submit">发表评论</button>
          </div>
        ` : '<p class="cmt-login-hint">请<a href="#/auth?returnTo=article/' + id + '">登录</a>后发表评论</p>'}
        <div class="cmt-list" id="cmt-list"><p class="cmt-loading">加载评论中...</p></div>
      </div>
    </article>
  `;

  app.prepend(createBackButton());

  // 权限按钮事件
  if (isAuthor || isAdmin) {
    document.getElementById('art-del-btn')?.addEventListener('click', async () => {
      if (!confirm('确定要删除这篇文章吗？')) return;
      try {
        const res = await fetch(`/api/articles/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
        });
        if (!res.ok) throw new Error('删除失败');
        window.location.hash = '#/articles';
      } catch (err) { alert(err.message); }
    });
  }

  // 加载评论
  loadComments(id);

  // 发表评论
  if (AuthService.isLoggedIn()) {
    const cmtSubmit = document.getElementById('cmt-submit');
    const cmtTextarea = document.getElementById('cmt-textarea');
    cmtSubmit?.addEventListener('click', async () => {
      const content = cmtTextarea.value.trim();
      if (!content) return;
      try {
        const res = await fetch(`/api/articles/${id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AuthService.getToken()}`,
          },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error('发表失败');
        cmtTextarea.value = '';
        loadComments(id);
      } catch (err) { alert(err.message); }
    });
  }
}

// ---------- 评论加载 ----------
/**
 * 加载并渲染指定文章的评论树
 * @param {string} articleId 文章 ID
 */
async function loadComments(articleId) {
  const list = document.getElementById('cmt-list');
  if (!list) return;
  try {
    const res = await fetch(`/api/articles/${articleId}/comments`);
    if (!res.ok) throw new Error('加载失败');
    const data = await res.json();
    const comments = data.comments || [];
    if (comments.length === 0) {
      list.innerHTML = '<p class="cmt-empty">暂无评论</p>';
      return;
    }
    // 组装树形结构
    const tree = buildCommentTree(comments);
    list.innerHTML = renderCommentTree(tree, articleId);
    bindReplyButtons(articleId);
  } catch (err) {
    list.innerHTML = '<p class="cmt-empty">评论加载失败</p>';
  }
}

/**
 * 将平铺评论列表组装为树形结构
 * @param {Object[]} comments 平铺评论数组
 * @returns {Object[]} 顶层评论树
 */
function buildCommentTree(comments) {
  const map = {};
  const roots = [];
  for (const c of comments) {
    map[c.id] = { ...c, children: [] };
  }
  for (const c of comments) {
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(map[c.id]);
    } else {
      roots.push(map[c.id]);
    }
  }
  return roots;
}

/**
 * 递归渲染评论树 HTML
 * @param {Object[]} nodes 评论节点数组
 * @param {string} articleId 文章 ID
 * @param {number} depth 当前嵌套深度
 * @returns {string} HTML 字符串
 */
function renderCommentTree(nodes, articleId, depth = 0) {
  return nodes.map(c => `
    <div class="cmt-item" style="margin-left:${depth * 24}px" data-id="${c.id}">
      <div class="cmt-header">
        <img class="cmt-avatar" src="${escapeAttr(c.author_avatar || 'assets/images/Profile_Picture/Initial_0.jpg')}" alt="">
        <span class="cmt-author">${escapeHtml(c.author_name)}</span>
        <span class="cmt-time">${new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
        ${_currentUserRole === 'admin' || _currentUserId === c.author_id ? `<button class="cmt-del-btn" data-id="${c.id}">删除</button>` : ''}
      </div>
      <div class="cmt-content">${escapeHtml(c.content)}</div>
      ${AuthService.isLoggedIn() ? `<button class="cmt-reply-btn" data-id="${c.id}">回复</button>` : ''}
      <div class="cmt-reply-box" id="cmt-reply-${c.id}" style="display:none">
        <textarea class="cmt-textarea cmt-textarea--reply" placeholder="回复 ${escapeHtml(c.author_name)}..."></textarea>
        <button class="cmt-submit cmt-submit--small" data-parent="${c.id}">发送</button>
      </div>
      ${c.children.length > 0 ? renderCommentTree(c.children, articleId, depth + 1) : ''}
    </div>
  `).join('');
}

/**
 * 绑定回复、删除、发送回复按钮事件
 * @param {string} articleId 文章 ID
 */
function bindReplyButtons(articleId) {
  document.querySelectorAll('.cmt-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const box = document.getElementById(`cmt-reply-${btn.dataset.id}`);
      if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
  });
  // 删除按钮
  document.querySelectorAll('.cmt-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定要删除这条评论吗？')) return;
      try {
        const res = await fetch(`/api/comments/${btn.dataset.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
        });
        if (!res.ok) throw new Error('删除失败');
        loadComments(articleId);
      } catch (err) { alert(err.message); }
    });
  });
  document.querySelectorAll('.cmt-submit--small').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parentId = btn.dataset.parent;
      const box = document.getElementById(`cmt-reply-${parentId}`);
      const textarea = box?.querySelector('textarea');
      const content = textarea?.value.trim();
      if (!content) return;
      try {
        const res = await fetch(`/api/articles/${articleId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AuthService.getToken()}`,
          },
          body: JSON.stringify({ content, parent_id: parseInt(parentId) }),
        });
        if (!res.ok) throw new Error('回复失败');
        loadComments(articleId);
      } catch (err) { alert(err.message); }
    });
  });
}

// ---------- 工具函数 ----------
/**
 * HTML 转义
 * @param {string} str 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * HTML 属性转义
 * @param {string} str 原始字符串
 * @returns {string} 转义后的属性值
 */
function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { renderArticleDetailPage };
