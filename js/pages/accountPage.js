// 账户页：查看和修改个人资料 + 我的作品

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

function renderAccountPage() {
  const app = document.getElementById('app');

  if (!AuthService.isLoggedIn()) {
    app.innerHTML = '<div class="placeholder-page"><h2>请先登录</h2></div>';
    app.prepend(createBackButton());
    return;
  }

  app.innerHTML = `
    <div class="account-page">
      <div class="account-card">
        <h2>个人资料</h2>
        <div class="acc-avatar-section">
          <img class="acc-avatar" id="acc-avatar" src="" alt="头像">
          <div class="acc-avatar-upload">
            <label class="acc-upload-label" id="acc-upload-label" style="display:none">更换头像
              <input type="file" id="acc-avatar-input" accept="image/*" hidden>
            </label>
          </div>
          <p class="acc-hint" id="acc-msg" style="display:none"></p>
        </div>
        <div class="acc-form">
          <label class="acc-label">昵称</label>
          <input type="text" class="acc-input" id="acc-username" disabled>
          <label class="acc-label">邮箱</label>
          <input type="text" class="acc-input" id="acc-email" disabled>
          <label class="acc-label">简介</label>
          <textarea class="acc-textarea" id="acc-bio" disabled></textarea>
          <label class="acc-label">注册时间</label>
          <input type="text" class="acc-input" id="acc-created" disabled>
        </div>
        <div class="acc-actions">
          <button class="acc-btn acc-btn--edit" id="acc-edit-btn">编辑</button>
          <button class="acc-btn acc-btn--save" id="acc-save-btn" style="display:none">保存</button>
          <button class="acc-btn acc-btn--cancel" id="acc-cancel-btn" style="display:none">取消</button>
        </div>
      </div>

      <!-- 我的作品 -->
      <div class="account-card acc-works-card">
        <h2>我的</h2>
        <div id="acc-works-loading" class="acc-loading">加载中...</div>
        <div id="acc-works-content" style="display:none">
          <h3 class="acc-works-title">文章</h3>
          <div id="acc-articles-list"></div>
          <h3 class="acc-works-title" style="margin-top:16px">项目</h3>
          <div id="acc-projects-list"></div>
        </div>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  let avatarFile = null;

  loadProfile();
  loadWorks();

  // 头像上传 + 裁剪
  document.getElementById('acc-avatar-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      openCropModal(ev.target.result, (croppedBlob) => {
        avatarFile = croppedBlob;
        document.getElementById('acc-avatar').src = URL.createObjectURL(croppedBlob);
      });
    };
    reader.readAsDataURL(file);
  });

  // 编辑模式
  document.getElementById('acc-edit-btn').addEventListener('click', () => {
    document.getElementById('acc-username').disabled = false;
    document.getElementById('acc-bio').disabled = false;
    document.getElementById('acc-upload-label').style.display = '';
    document.getElementById('acc-edit-btn').style.display = 'none';
    document.getElementById('acc-save-btn').style.display = '';
    document.getElementById('acc-cancel-btn').style.display = '';
  });

  // 取消
  document.getElementById('acc-cancel-btn').addEventListener('click', () => {
    avatarFile = null;
    document.getElementById('acc-avatar-input').value = '';
    loadProfile();
    setReadOnly();
  });

  // 保存
  document.getElementById('acc-save-btn').addEventListener('click', async () => {
    const msg = document.getElementById('acc-msg');
    msg.style.display = 'none';
    const username = document.getElementById('acc-username').value.trim();
    const bio = document.getElementById('acc-bio').value.trim();
    const body = { username, bio };

    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || '上传失败');
        body.profile_picture = uploadData.url;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AuthService.getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存失败');

      msg.textContent = '保存成功';
      msg.style.display = 'block';
      msg.style.color = '#4caf50';
      avatarFile = null;
      setReadOnly();
      loadProfile();
      if (window.updateAuthNav) window.updateAuthNav();
    } catch (err) {
      msg.textContent = err.message;
      msg.style.display = 'block';
      msg.style.color = '#ff5252';
    }
  });
}

async function loadProfile() {
  try {
    const user = await AuthService.getMe();
    document.getElementById('acc-avatar').src = user.profile_picture || 'assets/images/Profile_Picture/Initial_0.jpg';
    document.getElementById('acc-username').value = user.username || '';
    document.getElementById('acc-email').value = user.email || '';
    document.getElementById('acc-bio').value = user.bio || '';
    document.getElementById('acc-created').value = user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '';
  } catch (err) {
    document.getElementById('acc-msg').textContent = '加载失败: ' + err.message;
    document.getElementById('acc-msg').style.display = 'block';
    document.getElementById('acc-msg').style.color = '#ff5252';
  }
}

function setReadOnly() {
  document.getElementById('acc-username').disabled = true;
  document.getElementById('acc-bio').disabled = true;
  document.getElementById('acc-upload-label').style.display = 'none';
  document.getElementById('acc-avatar-input').value = '';
  document.getElementById('acc-edit-btn').style.display = '';
  document.getElementById('acc-save-btn').style.display = 'none';
  document.getElementById('acc-cancel-btn').style.display = 'none';
}

// ---------- 我的作品 ----------
async function loadWorks() {
  try {
    const res = await fetch('/api/auth/works', {
      headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
    });
    if (!res.ok) throw new Error('加载失败');
    const data = await res.json();

    document.getElementById('acc-works-loading').style.display = 'none';
    document.getElementById('acc-works-content').style.display = '';

    // 文章列表
    const articlesEl = document.getElementById('acc-articles-list');
    if (data.articles.length === 0) {
      articlesEl.innerHTML = '<p class="acc-empty">暂无文章</p>';
    } else {
      articlesEl.innerHTML = data.articles.map(a => `
        <div class="acc-work-item">
          <span class="acc-work-title">${escapeHtml(a.title)}</span>
          <span class="acc-work-meta">${a.status === 'published' ? '已发布' : '草稿'} · ${new Date(a.created_at).toLocaleDateString('zh-CN')}</span>
          <button class="acc-work-del" data-type="articles" data-id="${a.id}">删除</button>
        </div>
      `).join('');
    }

    // 项目列表
    const projectsEl = document.getElementById('acc-projects-list');
    if (data.projects.length === 0) {
      projectsEl.innerHTML = '<p class="acc-empty">暂无项目</p>';
    } else {
      projectsEl.innerHTML = data.projects.map(p => `
        <div class="acc-work-item">
          <span class="acc-work-title">${escapeHtml(p.title)}</span>
          <span class="acc-work-meta">${new Date(p.created_at).toLocaleDateString('zh-CN')}</span>
          <button class="acc-work-del" data-type="projects" data-id="${p.id}">删除</button>
        </div>
      `).join('');
    }

    // 绑定删除
    document.querySelectorAll('.acc-work-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('确定要删除吗？')) return;
        const type = btn.dataset.type;
        const id = btn.dataset.id;
        try {
          const delRes = await fetch(`/api/${type}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          });
          if (!delRes.ok) {
            const d = await delRes.json();
            throw new Error(d.message || '删除失败');
          }
          loadWorks();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  } catch (err) {
    document.getElementById('acc-works-loading').textContent = '加载失败: ' + err.message;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------- 头像裁剪 ----------
function openCropModal(src, callback) {
  const old = document.getElementById('crop-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'crop-modal';
  modal.className = 'crop-modal';
  modal.innerHTML = `
    <div class="crop-dialog">
      <h3 class="crop-title">裁剪头像（1:1）</h3>
      <div class="crop-canvas-wrap">
        <canvas id="crop-canvas"></canvas>
      </div>
      <div class="crop-controls">
        <span class="crop-label">缩放</span>
        <input type="range" class="crop-slider" id="crop-slider" min="20" max="100" value="80">
      </div>
      <p class="crop-hint">鼠标拖动移动框 / 滑动条缩放</p>
      <div class="crop-btns">
        <button class="crop-btn crop-btn--cancel">取消</button>
        <button class="crop-btn crop-btn--confirm">确认</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = document.getElementById('crop-canvas');
  const ctx = canvas.getContext('2d');
  const slider = document.getElementById('crop-slider');
  const img = new Image();

  let size, cx, cy, dragging;

  img.onload = () => {
    const maxW = Math.min(img.width, window.innerWidth - 60, 420);
    const ratio = maxW / img.width;
    canvas.width = maxW;
    canvas.height = img.height * ratio;

    const maxSize = Math.min(canvas.width, canvas.height);

    function setSize(pct) {
      size = Math.round(maxSize * pct / 100);
      cx = Math.max(0, Math.min(cx || (canvas.width - size) / 2, canvas.width - size));
      cy = Math.max(0, Math.min(cy || (canvas.height - size) / 2, canvas.height - size));
      draw();
    }

    setSize(80); // 默认 80%

    slider.addEventListener('input', () => setSize(parseInt(slider.value)));

    function draw() {
      // 背景层：变暗原图
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      // 裁剪区域：明亮清晰
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, size, size);
      ctx.clip();
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // 白边框 + 四角
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, size, size);

      const cornerLen = 16;
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 3;
      // 四角高亮
      [[cx, cy], [cx + size, cy], [cx, cy + size], [cx + size, cy + size]].forEach(([x, y]) => {
        const dx = x === cx ? 1 : -1;
        const dy = y === cy ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + dx * cornerLen, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * cornerLen);
        ctx.stroke();
      });
    }
    draw();

    canvas.addEventListener('mousedown', (e) => { dragging = true; });
    canvas.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
      cx = Math.max(0, Math.min(sx - size / 2, canvas.width - size));
      cy = Math.max(0, Math.min(sy - size / 2, canvas.height - size));
      draw();
    });
    canvas.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mouseleave', () => { dragging = false; });

    modal.querySelector('.crop-btn--confirm').addEventListener('click', () => {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = size;
      outCanvas.height = size;
      const outCtx = outCanvas.getContext('2d');
      const sx = cx / canvas.width * img.width;
      const sy = cy / canvas.height * img.height;
      const sw = size / canvas.width * img.width;
      const sh = size / canvas.height * img.height;
      outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
      outCanvas.toBlob((blob) => {
        modal.remove();
        if (callback) callback(blob);
      }, 'image/jpeg', 0.9);
    });
  };
  img.src = src;

  modal.querySelector('.crop-btn--cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

export { renderAccountPage };
