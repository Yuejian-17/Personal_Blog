// 项目页

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

let _projects = [];

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
  document.getElementById('pj-list').innerHTML = renderProjectCards(_projects, '', isLoggedIn, currentUser);

  // 搜索过滤
  document.getElementById('pj-search-input').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    document.getElementById('pj-list').innerHTML = renderProjectCards(_projects, query, isLoggedIn, currentUser);
    bindDeleteButtons(currentUser);
  });

  // 删除按钮（事件委托）
  bindDeleteButtons(currentUser);

  // 添加项目
  if (isLoggedIn) {
    document.getElementById('pj-add-btn').addEventListener('click', () => {
      window.location.hash = '#/project-editor';
    });
  }
}

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

function renderProjectCards(projects, query = '', isLoggedIn = false, currentUser = null) {
  const filtered = query
    ? projects.filter((p) => {
        const q = query.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
        return inName || inTags;
      })
    : projects;

  if (filtered.length === 0) {
    return '<p class="pj-empty">没有找到匹配的项目</p>';
  }

  return filtered
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
        const listEl = document.getElementById('pj-list');
        if (listEl) {
          const isLoggedIn = AuthService.isLoggedIn();
          listEl.innerHTML = renderProjectCards(_projects, document.getElementById('pj-search-input')?.value || '', isLoggedIn, currentUser);
          bindDeleteButtons(currentUser);
        }
      } catch (err) {
        alert('删除失败: ' + err.message);
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export { renderProjectPage };
