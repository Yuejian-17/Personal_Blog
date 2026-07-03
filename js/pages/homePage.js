// 首页渲染

import { createBackButton } from '../components/backButton.js';
import { parseLRC, findCurrentLine } from '../utils/lrcParser.js';

/** 渲染首页 */
async function renderHomePage() {
  console.log('[路由] 首页');
  const app = document.getElementById('app');

  const musicPlayer = window.musicPlayer;

  // 加载文章（API 优先，回退 store）
  let articles = [];
  try {
    const res = await fetch('/api/articles?limit=5');
    if (res.ok) {
      const data = await res.json();
      articles = (data.articles || []).map(a => ({
        id: String(a.id),
        title: a.title,
        date: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '',
        tags: a.tags || [],
        content: a.content || '',
      }));
    }
  } catch (err) { /* fallback */ }
  if (articles.length === 0) {
    articles = window.store?.articles || [];
  }

  app.innerHTML = `
    <div class="home-page">

      <!-- 搜索框 -->
      <div class="home-search">
        <input type="text" class="home-search-input" id="home-search-input" placeholder="搜索文章...">
      </div>

      <!-- 关于我 + 正在播放 并行 -->
      <div class="home-row">
        <section class="home-section home-intro">
          <div class="home-intro-avatar">
            <img src="assets/images/Profile_Picture/Profile_Picture_1.jpg" alt="头像" loading="lazy">
          </div>
          <div class="home-intro-text">
            <h2>关于我</h2>
            <p>一个平平无奇的普通人，偶尔写点自己喜欢的东西。</p>
          </div>
        </section>

        <section class="home-section home-nowplaying">
          <h2>正在播放</h2>
          ${renderNowPlaying(musicPlayer)}
        </section>
      </div>

      <!-- 歌词 -->
      <section class="home-section home-lyrics">
        <h2>歌词</h2>
        <p class="home-lyrics-text" id="home-lyrics-text">暂无歌词信息</p>
      </section>

      <!-- 文章轮播 -->
      <section class="home-section home-carousel-section">
        <h2>推荐文章</h2>
        <div class="home-carousel" id="home-carousel">
          ${renderCarouselCards(articles)}
        </div>
        <div class="home-carousel-dots" id="home-carousel-dots">
          ${articles.slice(0, 5).map((_, i) => `<span class="carousel-dot${i === 0 ? ' carousel-dot--active' : ''}" data-index="${i}"></span>`).join('')}
        </div>
      </section>

    </div>
  `;

  // 绑定搜索
  document.getElementById('home-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) {
        window.location.hash = `#/articles?q=${encodeURIComponent(q)}`;
      }
    }
  });

  // 启动文章轮播（如果有文章）
  if (articles.length > 0) {
    startCarousel(articles);
  }

  // 监听音乐更新
  if (musicPlayer) {
    musicPlayer.audio.addEventListener('play', updateNowPlaying);
    musicPlayer.audio.addEventListener('pause', updateNowPlaying);
    musicPlayer.audio.addEventListener('ended', updateNowPlaying);
    musicPlayer.audio.addEventListener('timeupdate', updateLyrics);
    musicPlayer.audio.addEventListener('trackchange', updateNowPlaying);
  }

  // 初始加载歌词
  if (musicPlayer && musicPlayer.playlist.length > 0) {
    updateLyrics();
  }

  // 绑定正在播放控制按钮（事件委托）
  const npControls = document.querySelector('.home-np-controls');
  if (npControls && musicPlayer) {
    npControls.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'np-play-btn') {
        if (musicPlayer.audio.paused) musicPlayer.audio.play();
        else musicPlayer.audio.pause();
      } else if (btn.id === 'np-prev-btn') {
        musicPlayer.prev();
      } else if (btn.id === 'np-next-btn') {
        musicPlayer.next();
      }
    });
  }
}

// ---------- 文章轮播 ----------
let _carouselState = { idx: 0, timer: null, max: 0 };

function renderCarouselCards(articles) {
  if (articles.length === 0) {
    return '<p class="home-empty">暂无文章</p>';
  }
  const visible = articles.slice(0, 5);
  return visible.map((a, i) => `
    <div class="carousel-card${i === 0 ? ' carousel-card--active' : ''}" data-index="${i}">
      <h3>${escapeHtml(a.title)}</h3>
      <div class="carousel-card-meta">
        <span>${a.date}</span>
        <span>${(a.tags || []).join(' · ')}</span>
      </div>
      <p>${escapeHtml(truncateContent(a.content, 100))}</p>
      <a href="#/article/${a.id}" class="carousel-card-link">阅读全文 →</a>
    </div>
  `).join('');
}

function startCarousel(articles) {
  const max = Math.min(articles.length, 5);
  _carouselState = { idx: 0, timer: null, max };
  _startCarouselTimer();
  _bindDotClicks();
}

function _startCarouselTimer() {
  if (_carouselState.timer) clearInterval(_carouselState.timer);
  _carouselState.timer = setInterval(() => {
    _goToSlide((_carouselState.idx + 1) % _carouselState.max);
  }, 5000);
}

function _bindDotClicks() {
  const dotsContainer = document.getElementById('home-carousel-dots');
  if (!dotsContainer) return;
  dotsContainer.addEventListener('click', (e) => {
    const dot = e.target.closest('.carousel-dot');
    if (!dot) return;
    const index = parseInt(dot.dataset.index, 10);
    if (!isNaN(index)) {
      _goToSlide(index);
    }
  });
}

function _goToSlide(index) {
  _carouselState.idx = index;
  const cards = document.querySelectorAll('.carousel-card');
  const dots = document.querySelectorAll('.carousel-dot');
  cards.forEach((c, i) => c.classList.toggle('carousel-card--active', i === index));
  dots.forEach((d, i) => d.classList.toggle('carousel-dot--active', i === index));
  // 重置定时器，从当前卡片开始重新计时
  _startCarouselTimer();
}

// ---------- 正在播放 ----------
function renderNowPlaying(mp) {
  if (!mp || mp.currentIndex === -1 || !mp.playlist.length) {
    return '<p class="home-empty">未在播放</p>';
  }
  const track = mp.playlist[mp.currentIndex];
  const isPaused = mp.audio.paused;
  return `
    <div class="home-np-info">
      <span class="home-np-title" id="home-np-track">${escapeHtml(track.title)}${track.artist ? ` — ${escapeHtml(track.artist)}` : ''}</span>
      <span class="home-np-status" id="home-np-status">${isPaused ? '⏸ 已暂停' : '▶ 播放中'}</span>
    </div>
    <div class="home-np-controls">
      <button class="np-ctrl-btn" id="np-prev-btn" title="上一首">&#9664;</button>
      <button class="np-ctrl-btn np-ctrl-btn--play" id="np-play-btn" title="播放/暂停">${isPaused ? '&#9654;' : '&#10074;&#10074;'}</button>
      <button class="np-ctrl-btn" id="np-next-btn" title="下一首">&#9654;</button>
    </div>
  `;
}

function updateNowPlaying() {
  const statusEl = document.getElementById('home-np-status');
  const trackEl = document.getElementById('home-np-track');
  const playBtn = document.getElementById('np-play-btn');
  const mp = window.musicPlayer;
  if (!statusEl || !mp) return;

  if (mp.currentIndex === -1 || !mp.playlist.length) {
    statusEl.textContent = '未在播放';
    if (playBtn) playBtn.innerHTML = '&#9654;';
    if (trackEl) trackEl.textContent = '';
    return;
  }

  const isPaused = mp.audio.paused;
  statusEl.textContent = isPaused ? '⏸ 已暂停' : '▶ 播放中';
  if (playBtn) playBtn.innerHTML = isPaused ? '&#9654;' : '&#10074;&#10074;';

  // 更新曲目信息
  const track = mp.playlist[mp.currentIndex];
  if (trackEl && track) {
    trackEl.textContent = track.artist ? `${track.title} - ${track.artist}` : track.title;
  }

  // 切歌时更新歌词
  updateLyrics();
}

// ---------- 动态歌词 ----------
let _currentLrcData = [];
let _lastLrcText = '';

function updateLyrics() {
  const mp = window.musicPlayer;
  const el = document.getElementById('home-lyrics-text');
  if (!el || !mp) return;

  const track = mp.playlist[mp.currentIndex];
  if (!track) {
    el.textContent = '暂无歌词信息';
    return;
  }

  const lrcText = track.lrc || '';
  if (!lrcText) {
    el.textContent = '暂无歌词信息';
    _currentLrcData = [];
    return;
  }

  // 新歌重新解析
  if (lrcText !== _lastLrcText) {
    _currentLrcData = parseLRC(lrcText);
    _lastLrcText = lrcText;
  }

  if (_currentLrcData.length === 0) {
    el.textContent = '暂无歌词信息';
    return;
  }

  const activeIdx = findCurrentLine(_currentLrcData, mp.audio.currentTime);
  if (activeIdx >= 0) {
    el.textContent = _currentLrcData[activeIdx].text;
  } else {
    el.textContent = '...';
  }
}

// ---------- 工具函数 ----------
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncateContent(content, maxLen) {
  if (!content) return '';
  const plain = content.replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
}

export { renderHomePage };
