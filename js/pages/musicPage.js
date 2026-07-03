// 音乐页

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

function renderMusicPage() {
  console.log('[路由] 音乐页');
  const app = document.getElementById('app');

  const musicList = window.store?.musicList || [];
  const musicPlayer = window.musicPlayer;

  if (musicList.length === 0 && window.store) {
    app.innerHTML = '<div class="placeholder-page"><h2>数据加载中...</h2></div>';
    app.prepend(createBackButton());
    window.store.on('dataLoaded', () => renderMusicPage());
    return;
  }

  const isLoggedIn = AuthService.isLoggedIn();

  app.innerHTML = `
    <div class="music-page">
      <div class="mu-toolbar">
        <input type="text" class="mu-search-input" id="mu-search-input" placeholder="搜索歌曲...">
        ${isLoggedIn ? `
          <button class="mu-edit-btn" id="mu-edit-btn">编辑</button>
          <label class="mu-import-btn" id="mu-import-btn" style="display:none">&#xFF0B; 导入
            <input type="file" id="mu-file-input" accept=".mp3,.ogg,.wav,.flac,.aac,.m4a" hidden>
          </label>
        ` : ''}
      </div>
      <div class="mu-list" id="mu-list">
        ${renderMusicList(musicList, musicPlayer)}
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  let editMode = false;

  // 搜索
  document.getElementById('mu-search-input').addEventListener('input', (e) => {
    document.getElementById('mu-list').innerHTML = renderMusicList(musicList, musicPlayer, e.target.value.trim(), editMode);
  });

  if (isLoggedIn) {
    const editBtn = document.getElementById('mu-edit-btn');
    const importBtn = document.getElementById('mu-import-btn');

    // 编辑模式切换
    editBtn.addEventListener('click', () => {
      editMode = !editMode;
      editBtn.textContent = editMode ? '完成' : '编辑';
      editBtn.classList.toggle('mu-edit-btn--active', editMode);
      importBtn.style.display = editMode ? '' : 'none';
      document.getElementById('mu-list').innerHTML = renderMusicList(musicList, musicPlayer, document.getElementById('mu-search-input').value.trim(), editMode);
      if (editMode) bindDeleteButtons();
    });

    // 导入
    document.getElementById('mu-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append('music', file);
        formData.append('title', file.name.replace(/\.[^.]+$/, ''));
        const uploadRes = await fetch('/api/media/music', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('上传失败');
        const track = await uploadRes.json();
        if (musicPlayer) {
          musicPlayer.addTrack(track);
          window.store.musicList = musicPlayer.playlist;
          document.getElementById('mu-list').innerHTML = renderMusicList(musicPlayer.playlist, musicPlayer, '', editMode);
          if (editMode) bindDeleteButtons();
        }
      } catch (err) { alert('导入失败: ' + err.message); }
    });
  }

  // 点击切歌
  bindMusicClicks(musicPlayer);
  bindMusicRefresh(musicPlayer);
}

function renderMusicList(list, musicPlayer, query = '', editMode = false) {
  const filtered = query
    ? list.filter(t => t.title.toLowerCase().includes(query.toLowerCase()))
    : list;

  if (filtered.length === 0) return '<p class="mu-empty">没有找到匹配的歌曲</p>';

  return filtered.map((track, i) => {
    const globalIdx = list.indexOf(track);
    const isActive = musicPlayer && musicPlayer.currentIndex !== -1
      && musicPlayer.playlist[musicPlayer.currentIndex] === track;
    return `
      <div class="mu-item${isActive ? ' mu-item--active' : ''}" data-index="${globalIdx}">
        <span class="mu-item-idx">${String(i + 1).padStart(2, '0')}</span>
        <div class="mu-item-info">
          <span class="mu-item-title">${escapeHtml(track.title)}</span>
          <span class="mu-item-artist">${escapeHtml(track.artist)}</span>
        </div>
        ${editMode ? `<button class="mu-item-del" data-id="${track.id || ''}" data-index="${globalIdx}">删除</button>` : ''}
      </div>
    `;
  }).join('');
}

function bindMusicClicks(musicPlayer) {
  document.getElementById('mu-list')?.addEventListener('click', (e) => {
    if (e.target.closest('.mu-item-del')) return;
    // 编辑模式下不切歌
    const editBtn = document.getElementById('mu-edit-btn');
    if (editBtn?.classList.contains('mu-edit-btn--active')) return;
    const item = e.target.closest('.mu-item');
    if (!item || !musicPlayer) return;
    const index = parseInt(item.dataset.index, 10);
    if (!isNaN(index)) musicPlayer.play(index);
  });
}

function bindDeleteButtons() {
  document.querySelectorAll('.mu-item-del').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const list = window.musicPlayer?.playlist || [];
      if (list.length <= 1) { alert('至少保留一首歌曲'); return; }
      if (!confirm('确定删除这首歌曲吗？')) return;
      const id = btn.dataset.id;
      const idx = parseInt(btn.dataset.index);
      try {
        if (id) {
          await fetch(`/api/media/music/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AuthService.getToken()}` },
          });
        }
        if (window.musicPlayer) {
          window.musicPlayer.playlist.splice(idx, 1);
          if (window.musicPlayer.currentIndex === idx) {
            window.musicPlayer.pause();
            // 如果还有歌曲，切换到下一首或前一首
            if (window.musicPlayer.playlist.length > 0) {
              const nextIdx = idx < window.musicPlayer.playlist.length ? idx : idx - 1;
              window.musicPlayer.currentIndex = -1;
            }
          } else if (window.musicPlayer.currentIndex > idx) {
            window.musicPlayer.currentIndex--;
          }
          window.store.musicList = window.musicPlayer.playlist;
        }
        renderMusicPage();
      } catch (err) { alert(err.message); }
    });
  });
}

function bindMusicRefresh(musicPlayer) {
  ['play', 'pause', 'ended', 'trackchange'].forEach(evt => {
    musicPlayer.audio.addEventListener(evt, () => {
      const listEl = document.getElementById('mu-list');
      if (listEl && window.location.hash.startsWith('#/music')) {
        const editMode = document.getElementById('mu-edit-btn')?.classList.contains('mu-edit-btn--active');
        listEl.innerHTML = renderMusicList(musicPlayer.playlist, musicPlayer, document.getElementById('mu-search-input')?.value || '', editMode);
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

export { renderMusicPage };
