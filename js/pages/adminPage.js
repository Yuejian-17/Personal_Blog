/**
 * 后台管理页组件
 * @file 仅管理员可访问：用户、文章、项目的管理表格与删除操作
 * @module js/pages/adminPage
 */

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

/**
 * 渲染后台管理页
 */
function renderAdminPage() {
  const app = document.getElementById('app');

  if (!AuthService.isLoggedIn()) {
    app.innerHTML = '<div class="placeholder-page"><h2>请先登录</h2></div>';
    app.prepend(createBackButton());
    return;
  }

  app.innerHTML = `
    <div class="admin-page">
      <div class="admin-tabs">
        <button class="admin-tab admin-tab--active" data-tab="users">用户管理</button>
        <button class="admin-tab" data-tab="articles">文章管理</button>
        <button class="admin-tab" data-tab="projects">项目管理</button>
      </div>
      <p class="admin-error" id="admin-error" style="display:none"></p>
      <div class="admin-table-wrap" id="admin-table-wrap">
        <p class="admin-loading">加载中...</p>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 切换 Tab
  document.querySelector('.admin-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.admin-tab');
    if (!tab) return;
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('admin-tab--active'));
    tab.classList.add('admin-tab--active');
    loadTab(tab.dataset.tab);
  });

  loadTab('users');
}

/**
 * 加载并渲染指定管理 Tab 的数据
 * @param {string} tab 类型：users | articles | projects
 */
async function loadTab(tab) {
  const wrap = document.getElementById('admin-table-wrap');
  const errEl = document.getElementById('admin-error');
  wrap.innerHTML = '<p class="admin-loading">加载中...</p>';
  errEl.style.display = 'none';

  try {
    const res = await fetch(`/api/admin/${tab}`, {
      headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || '无权限访问');
    }
    const data = await res.json();
    const items = data[tab] || data.users || [];

    if (tab === 'users') renderUsers(wrap, items);
    else if (tab === 'articles') renderArticles(wrap, items);
    else if (tab === 'projects') renderProjects(wrap, items);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

/**
 * 渲染用户管理表格
 * @param {HTMLElement} wrap 表格容器
 * @param {Object[]} users 用户数组
 */
function renderUsers(wrap, users) {
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>昵称</th><th>邮箱</th><th>角色</th><th>注册时间</th><th>操作</th></tr></thead>
      <tbody>
        ${users.map((u) => `
          <tr>
            <td>${u.id}</td>
            <td>${escapeHtml(u.username)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>${u.role === 'admin' ? '管理员' : '用户'}</td>
            <td>${new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
            <td>${u.role !== 'admin' ? `<button class="admin-del-btn" data-type="users" data-id="${u.id}">删除</button>` : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindDeleteButtons(wrap);
}

/**
 * 渲染文章管理表格
 * @param {HTMLElement} wrap 表格容器
 * @param {Object[]} articles 文章数组
 */
function renderArticles(wrap, articles) {
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>标题</th><th>作者</th><th>状态</th><th>日期</th><th>操作</th></tr></thead>
      <tbody>
        ${articles.map((a) => `
          <tr>
            <td>${a.id}</td>
            <td>${escapeHtml(a.title)}</td>
            <td>${escapeHtml(a.author_name)}</td>
            <td>${a.status === 'published' ? '已发布' : '草稿'}</td>
            <td>${new Date(a.created_at).toLocaleDateString('zh-CN')}</td>
            <td><button class="admin-del-btn" data-type="articles" data-id="${a.id}">删除</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindDeleteButtons(wrap);
}

/**
 * 渲染项目管理表格
 * @param {HTMLElement} wrap 表格容器
 * @param {Object[]} projects 项目数组
 */
function renderProjects(wrap, projects) {
  wrap.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>标题</th><th>作者</th><th>日期</th><th>操作</th></tr></thead>
      <tbody>
        ${projects.map((p) => `
          <tr>
            <td>${p.id}</td>
            <td>${escapeHtml(p.title)}</td>
            <td>${escapeHtml(p.author_name)}</td>
            <td>${new Date(p.created_at).toLocaleDateString('zh-CN')}</td>
            <td><button class="admin-del-btn" data-type="projects" data-id="${p.id}">删除</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  bindDeleteButtons(wrap);
}

/**
 * 绑定管理表格中的删除按钮事件
 * @param {HTMLElement} wrap 表格容器
 */
function bindDeleteButtons(wrap) {
  wrap.querySelectorAll('.admin-del-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定要删除吗？')) return;
      const type = btn.dataset.type;
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/api/admin/${type}/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || '删除失败');
        }
        // 重新加载当前 tab
        const activeTab = document.querySelector('.admin-tab--active');
        if (activeTab) loadTab(activeTab.dataset.tab);
      } catch (err) {
        alert(err.message);
      }
    });
  });
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

export { renderAdminPage };
