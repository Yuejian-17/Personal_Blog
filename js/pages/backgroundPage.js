/**
 * 背景管理页组件
 * @file 渲染背景图片网格，支持自动轮播开关、手动选择、登录用户导入/删除背景
 * @module js/pages/backgroundPage
 */

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';
import {
  bgImages, getSrc,
  setManualBackground, addBackgroundImage,
  startBackgroundSlideshow, stopBackgroundSlideshow,
  onBackgroundChange,
} from '../utils/background.js';

let _currentBgItem = null;
let _autoMode = true;

/**
 * 渲染背景管理页
 */
function renderBackgroundPage() {
  console.log('[路由] 背景页');
  const app = document.getElementById('app');

  const isLoggedIn = AuthService.isLoggedIn();

  app.innerHTML = `
    <div class="bg-page">
      <div class="bg-toolbar">
        <div class="bg-auto-wrapper">
          <label class="theme-auto-switch">
            <input type="checkbox" id="bg-auto-input" ${_autoMode ? 'checked' : ''}>
            <span class="theme-auto-slider"></span>
          </label>
          <span class="bg-auto-label">auto</span>
        </div>
        <div class="bg-actions" id="bg-actions" style="display:flex;gap:8px">
          ${isLoggedIn ? `
            <button class="bg-edit-btn" id="bg-edit-btn">编辑</button>
            <label class="bg-import-btn" id="bg-import-btn" style="display:none">&#xFF0B; 导入
              <input type="file" id="bg-file-input" accept="image/*" hidden>
            </label>
          ` : ''}
        </div>
      </div>
      <div class="bg-grid" id="bg-grid">
        ${renderBgGrid(false)}
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  let editMode = false;

  onBackgroundChange((item) => {
    _currentBgItem = item;
    refreshGrid(editMode);
  });

  document.getElementById('bg-auto-input').addEventListener('change', (e) => {
    _autoMode = e.target.checked;
    if (_autoMode) startBackgroundSlideshow(10000);
    else stopBackgroundSlideshow();
  });

  document.getElementById('bg-grid').addEventListener('click', (e) => {
    if (e.target.closest('.bg-item-del')) return;
    // 编辑模式下不切换背景
    const editBtn = document.getElementById('bg-edit-btn');
    if (editBtn?.classList.contains('bg-edit-btn--active')) return;
    const card = e.target.closest('.bg-card');
    if (!card) return;
    const src = card.dataset.src;
    if (src) {
      _autoMode = false;
      const autoInput = document.getElementById('bg-auto-input');
      if (autoInput) autoInput.checked = false;
      _currentBgItem = bgImages.find(b => getSrc(b) === src);
      setManualBackground(_currentBgItem);
      refreshGrid(editMode);
    }
  });

  if (isLoggedIn) {
    const editBtn = document.getElementById('bg-edit-btn');
    const importBtn = document.getElementById('bg-import-btn');

    editBtn.addEventListener('click', () => {
      editMode = !editMode;
      editBtn.textContent = editMode ? '完成' : '编辑';
      editBtn.classList.toggle('bg-edit-btn--active', editMode);
      importBtn.style.display = editMode ? '' : 'none';
      refreshGrid(editMode);
      if (editMode) bindBgDelete();
    });

    document.getElementById('bg-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await fetch('/api/media/backgrounds', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('上传失败');
        const newBg = await uploadRes.json();
        addBackgroundImage(newBg);
        _currentBgItem = newBg;
        setManualBackground(newBg);
        refreshGrid(editMode);
        if (editMode) bindBgDelete();
      } catch (err) { alert('导入失败: ' + err.message); }
    });
  }
}

/**
 * 刷新背景网格
 * @param {boolean} editMode 是否处于编辑模式
 */
function refreshGrid(editMode) {
  const grid = document.getElementById('bg-grid');
  if (grid) grid.innerHTML = renderBgGrid(editMode);
}

/**
 * 渲染背景图片网格 HTML
 * @param {boolean} editMode 是否处于编辑模式
 * @returns {string} HTML 字符串
 */
function renderBgGrid(editMode) {
  if (bgImages.length === 0) return '<p class="bg-empty">暂无背景图片</p>';

  return bgImages.map((item) => {
    const src = getSrc(item);
    const isActive = _currentBgItem && getSrc(_currentBgItem) === src;
    return `
    <div class="bg-card${isActive ? ' bg-card--active' : ''}" data-src="${escapeAttr(src)}">
      <img src="${escapeAttr(src)}" alt="" loading="lazy">
      <div class="bg-card-check">&#10003;</div>
      ${editMode ? `<button class="bg-item-del" data-id="${item.id || 0}" data-src="${escapeAttr(src)}">删除</button>` : ''}
    </div>
  `;
  }).join('');
}

/**
 * 绑定编辑模式下背景删除按钮事件
 */
function bindBgDelete() {
  document.querySelectorAll('.bg-item-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (bgImages.length <= 1) { alert('至少保留一张背景图片'); return; }
      if (!confirm('确定删除这张背景吗？')) return;
      const id = btn.dataset.id;
      try {
        if (id && id !== '0') {
          await fetch(`/api/media/backgrounds/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          });
        }
        const src = btn.dataset.src;
        const idx = bgImages.findIndex(b => getSrc(b) === src);
        if (idx !== -1) {
          // 如果删除的是当前背景，切换到下一张
          if (_currentBgItem && getSrc(_currentBgItem) === src) {
            const newItem = bgImages[idx < bgImages.length - 1 ? idx + 1 : idx > 0 ? idx - 1 : 0];
            _currentBgItem = newItem;
            setManualBackground(newItem);
          }
          bgImages.splice(idx, 1);
        }
        refreshGrid(true);
        bindBgDelete();
      } catch (err) { alert(err.message); }
    });
  });
}

/**
 * HTML 属性转义
 * @param {string} str 原始字符串
 * @returns {string} 转义后的属性值
 */
function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}

export { renderBackgroundPage };
