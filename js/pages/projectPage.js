/**
 * 项目展示页组件
 * @file 渲染项目列表，支持搜索、年份/技术栈筛选、新增项目弹窗及删除操作
 * @module js/pages/projectPage
 */

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

let _projects = [];
let _filterState = {
  query: '',
  year: 'all',
  tech: 'all',
};

/**
 * 渲染项目页
 */
async function renderProjectPage() {
  console.log('[路由] 项目页');
  const app = document.getElementById('app');

  const isLoggedIn = AuthService.isLoggedIn();
  let currentUser = null;
  if (isLoggedIn) {
    try { currentUser = await AuthService.getMe(); } catch (e) { /* ignore */ }
  }

  app.innerHTML = `
    <div class="project-page">
      <div class="pj-search">
        <input type="text" class="pj-search-input" id="pj-search-input" placeholder="搜索项目...">
      </div>
      <div class="pj-filter-bar" id="pj-filter-bar">
        <select class="pj-filter-select" id="pj-filter-year">
          <option value="all">全部时间</option>
          <option value="thisYear">今年</option>
          <option value="lastYear">去年</option>
          <option value="older">更早</option>
        </select>
        <select class="pj-filter-select" id="pj-filter-tech">
          <option value="all">全部技术</option>
        </select>
      </div>
      ${isLoggedIn ? `
        <div class="pj-toolbar">
          <button class="pj-add-btn" id="pj-add-btn">&#xFF0B; 添加项目</button>
        </div>
      ` : ''}
      <div class="pj-list" id="pj-list">
        <p class="pj-empty">加载中...</p>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 从 API 加载
  _projects = await loadProjects();
  populateTechFilter(_projects);
  applyFilters(isLoggedIn, currentUser);

  // 搜索过滤
  document.getElementById('pj-search-input').addEventListener('input', (e) => {
    _filterState.query = e.target.value.trim();
    applyFilters(isLoggedIn, currentUser);
    bindDeleteButtons(currentUser);
  });

  // 筛选器事件
  document.getElementById('pj-filter-year').addEventListener('change', (e) => {
    _filterState.year = e.target.value;
    applyFilters(isLoggedIn, currentUser);
  });
  document.getElementById('pj-filter-tech').addEventListener('change', (e) => {
    _filterState.tech = e.target.value;
    applyFilters(isLoggedIn, currentUser);
  });

  // 删除按钮（事件委托）
  bindDeleteButtons(currentUser);

  // 添加项目
  if (isLoggedIn) {
    document.getElementById('pj-add-btn').addEventListener('click', () => {
      openProjectModal(currentUser);
    });
  }
}

/**
 * 从后端 API 加载项目，失败时回退到本地 store
 * @returns {Promise<Object[]>} 项目数组
 */
async function loadProjects() {
  try {
    const res = await fetch('/api/projects?limit=50');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const projects = (data.projects || []).map(p => ({
      id: p.id,
      author_id: p.author_id,
      name: p.title,
      description: p.description,
      tags: p.tech_stack ? p.tech_stack.split(',').map(t => t.trim()).filter(Boolean) : [],
      url: p.github_url || (p.live_url || '#'),
      author_name: p.author_name || '',
      created_at: p.created_at || '',
    }));
    // 同步到 store
    if (window.store) {
      window.store.projects = projects;
    }
    return projects;
  } catch (err) {
    console.warn('API 加载项目失败，回退到本地数据:', err.message);
    const storeProjects = window.store?.projects || [];
    if (storeProjects.length === 0 && window.store) {
      return new Promise(resolve => {
        window.store.on('dataLoaded', () => resolve(window.store.projects));
      });
    }
    return storeProjects;
  }
}

/**
 * 根据项目技术栈填充技术筛选下拉框
 * @param {Object[]} projects 项目数组
 */
function populateTechFilter(projects) {
  const techSet = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => techSet.add(t)));
  const select = document.getElementById('pj-filter-tech');
  if (!select || techSet.size === 0) return;
  [...techSet].sort().forEach(tech => {
    const opt = document.createElement('option');
    opt.value = tech;
    opt.textContent = tech;
    select.appendChild(opt);
  });
}

/**
 * 根据当前筛选条件过滤项目并重新渲染列表
 * @param {boolean} isLoggedIn 当前是否登录
 * @param {Object|null} currentUser 当前用户信息
 */
function applyFilters(isLoggedIn, currentUser) {
  const filtered = _projects.filter((p) => {
    const q = _filterState.query.toLowerCase();
    const matchesQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    let matchesYear = true;
    if (p.created_at && _filterState.year !== 'all') {
      const year = new Date(p.created_at).getFullYear();
      const nowYear = new Date().getFullYear();
      if (_filterState.year === 'thisYear') matchesYear = year === nowYear;
      else if (_filterState.year === 'lastYear') matchesYear = year === nowYear - 1;
      else if (_filterState.year === 'older') matchesYear = year < nowYear - 1;
    }

    const matchesTech = _filterState.tech === 'all' || (p.tags || []).includes(_filterState.tech);

    return matchesQuery && matchesYear && matchesTech;
  });

  const listEl = document.getElementById('pj-list');
  if (listEl) {
    listEl.innerHTML = renderProjectCards(filtered, isLoggedIn, currentUser);
  }
}

/**
 * 渲染项目卡片列表 HTML
 * @param {Object[]} projects 项目数组
 * @param {boolean} isLoggedIn 当前是否登录
 * @param {Object|null} currentUser 当前用户信息
 * @returns {string} HTML 字符串
 */
function renderProjectCards(projects, isLoggedIn = false, currentUser = null) {
  if (projects.length === 0) {
    return '<p class="pj-empty">没有找到匹配的项目</p>';
  }

  return projects
    .map((p) => {
      const canDelete = isLoggedIn && currentUser && (currentUser.id === p.author_id || currentUser.role === 'admin');
      return `
    <div class="pj-card-wrapper">
      <a class="pj-card" href="${escapeAttr(p.url)}" target="_blank" rel="noopener">
        ${canDelete ? `<button class="pj-delete-btn" data-id="${p.id}" title="删除项目">&times;</button>` : ''}
        <h3 class="pj-card-name">${escapeHtml(p.name)}</h3>
        <p class="pj-card-desc">${escapeHtml(p.description)}</p>
        <div class="pj-card-tags">
          ${(p.tags || []).map((t) => `<span class="pj-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </a>
    </div>
  `;
    })
    .join('');
}

/**
 * 绑定项目删除按钮事件
 * @param {Object|null} currentUser 当前用户信息
 */
function bindDeleteButtons(currentUser) {
  document.querySelectorAll('.pj-delete-btn').forEach(btn => {
    // 避免重复绑定
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('确定要删除该项目吗？')) return;
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || '删除失败');
        }
        // 重新加载
        _projects = await loadProjects();
        populateTechFilter(_projects);
        const listEl = document.getElementById('pj-list');
        if (listEl) {
          const isLoggedIn = AuthService.isLoggedIn();
          applyFilters(isLoggedIn, currentUser);
          bindDeleteButtons(currentUser);
        }
      } catch (err) {
        alert('删除失败: ' + err.message);
      }
    });
  });
}

// ---------- 新增项目弹窗 ----------
/**
 * 打开新增项目弹窗
 * @param {Object} currentUser 当前用户信息
 */
function openProjectModal(currentUser) {
  const old = document.getElementById('project-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'project-modal';
  modal.className = 'project-modal';
  modal.innerHTML = `
    <div class="project-dialog">
      <h3 class="project-dialog-title">添加项目</h3>
      <label class="project-label">项目名称</label>
      <input type="text" class="project-input" id="pj-modal-name" placeholder="项目名称">
      <label class="project-label">简介</label>
      <textarea class="project-textarea" id="pj-modal-desc" placeholder="项目简介..."></textarea>
      <label class="project-label">技术栈（用逗号分隔）</label>
      <input type="text" class="project-input" id="pj-modal-tech" placeholder="例如：C#, WPF, .NET">
      <label class="project-label">GitHub 仓库地址</label>
      <input type="text" class="project-input" id="pj-modal-github" placeholder="https://github.com/...">
      <p class="project-error" id="pj-modal-error"></p>
      <div class="project-dialog-btns">
        <button class="project-btn project-btn--cancel" id="pj-modal-cancel">取消</button>
        <button class="project-btn project-btn--confirm" id="pj-modal-confirm">确认</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const errorEl = document.getElementById('pj-modal-error');

  document.getElementById('pj-modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('pj-modal-confirm').addEventListener('click', async () => {
    const title = document.getElementById('pj-modal-name').value.trim();
    const description = document.getElementById('pj-modal-desc').value.trim();
    const techStack = document.getElementById('pj-modal-tech').value.trim();
    const githubUrl = document.getElementById('pj-modal-github').value.trim();

    if (!title) { errorEl.textContent = '请输入项目名称'; return; }
    if (!description) { errorEl.textContent = '请输入项目简介'; return; }
    if (githubUrl && !/^https?:\/\//.test(githubUrl)) { errorEl.textContent = 'GitHub 地址格式不正确'; return; }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
        },
        body: JSON.stringify({
          title,
          description,
          tech_stack: techStack,
          github_url: githubUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建失败');

      modal.remove();
      _projects = await loadProjects();
      populateTechFilter(_projects);
      applyFilters(AuthService.isLoggedIn(), currentUser);
      bindDeleteButtons(currentUser);
    } catch (err) {
      errorEl.textContent = '创建失败: ' + err.message;
    }
  });
}

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

export { renderProjectPage };
