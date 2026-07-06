/**
 * 音乐播放器组件模块
 * @file 提供播放列表管理、播放控制、进度拖拽及切歌事件广播的通用音乐播放器
 * @module js/components/musicPlayer
 */

class MusicPlayer {
  /**
   * 创建音乐播放器组件
   * @param {string} containerSelector - 播放器挂载容器选择器，默认 '#music-player-container'
   */
  constructor(containerSelector = '#music-player-container') {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      // 若页面未提供容器，则自动创建并挂载到 body
      this.container = document.createElement('div');
      this.container.id = 'music-player-container';
      document.body.appendChild(this.container);
    }

    this.playlist = [];
    this.currentIndex = -1;
    this.isExpanded = false;
    this._shouldPlay = false;

    this._buildUI();
    this._bindEvents();
  }

  // ---------- 构建 UI ----------

  /**
   * 构建播放器 HTML 结构并缓存关键 DOM 引用
   */
  _buildUI() {
    this.container.innerHTML = `
      <audio id="mp-audio" preload="metadata"></audio>
      <div class="mp-panel" id="mp-panel">
        <div class="mp-info">
          <span class="mp-title" id="mp-title">未在播放</span>
          <span class="mp-artist" id="mp-artist"></span>
        </div>
        <div class="mp-progress" id="mp-progress-bar">
          <div class="mp-progress-fill" id="mp-progress-fill"></div>
        </div>
        <div class="mp-time">
          <span id="mp-current">0:00</span>
          <span id="mp-duration">0:00</span>
        </div>
        <div class="mp-controls">
          <button class="mp-btn" id="mp-prev" title="上一曲">&#9664;</button>
          <button class="mp-btn mp-btn-play" id="mp-play" title="播放">&#9654;</button>
          <button class="mp-btn" id="mp-next" title="下一曲">&#9654;</button>
        </div>
      </div>
      <button class="mp-toggle" id="mp-toggle" title="展开播放器">&#9835;</button>
    `;

    this.audio = this.container.querySelector('#mp-audio');
    this.panel = this.container.querySelector('#mp-panel');
    this.toggleBtn = this.container.querySelector('#mp-toggle');
    this.titleEl = this.container.querySelector('#mp-title');
    this.artistEl = this.container.querySelector('#mp-artist');
    this.progressFill = this.container.querySelector('#mp-progress-fill');
    this.currentEl = this.container.querySelector('#mp-current');
    this.durationEl = this.container.querySelector('#mp-duration');
    this.playBtn = this.container.querySelector('#mp-play');
  }

  // ---------- 绑定事件 ----------

  /**
   * 绑定播放器面板、控制按钮及音频元素相关事件
   */
  _bindEvents() {
    this.toggleBtn.addEventListener('click', () => this._togglePanel());
    this.playBtn.addEventListener('click', () => this._togglePlay());
    this.container.querySelector('#mp-prev').addEventListener('click', () => this.prev());
    this.container.querySelector('#mp-next').addEventListener('click', () => this.next());

    // 进度条点击跳转
    this.container.querySelector('#mp-progress-bar').addEventListener('click', (e) => {
      if (!this.audio.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      this.audio.currentTime = ratio * this.audio.duration;
    });

    // audio 事件
    this.audio.addEventListener('timeupdate', () => this._updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this._updateDuration());
    this.audio.addEventListener('ended', () => this.next());

    // 音频数据就绪后自动播放（如果之前请求了播放）
    this.audio.addEventListener('canplay', () => {
      if (this._shouldPlay) {
        this._shouldPlay = false;
        this.audio.play().catch((err) => {
          console.error('[MusicPlayer] canplay 自动播放失败:', err);
          this.titleEl.textContent = '播放失败';
        });
      }
    });

    this.audio.addEventListener('play', () => {
      this.playBtn.innerHTML = '&#10074;&#10074;';
    });
    this.audio.addEventListener('pause', () => {
      this.playBtn.innerHTML = '&#9654;';
    });
    this.audio.addEventListener('error', () => {
      console.error('[MusicPlayer] 音频加载失败:', this.audio.src);
      this.titleEl.textContent = '加载失败';
    });
  }

  // ---------- 面板展开/收起 ----------

  /**
   * 切换播放器面板的展开/收起状态
   */
  _togglePanel() {
    this.isExpanded = !this.isExpanded;
    this.panel.classList.toggle('mp-panel--visible', this.isExpanded);
  }

  // ---------- 播放/暂停切换（用户点击播放按钮） ----------

  /**
   * 处理播放按钮点击：首次播放从列表第一首开始，否则切换播放/暂停
   */
  _togglePlay() {
    if (this.currentIndex === -1 && this.playlist.length > 0) {
      this.play(0);
    } else if (this.audio.paused) {
      // 音频已加载，直接恢复播放
      if (this.audio.src && this.audio.readyState >= 2) {
        this.audio.play().catch((err) => {
          console.error('[MusicPlayer] 恢复播放失败:', err);
        });
      } else {
        // 未就绪则重新加载
        this.play(this.currentIndex);
      }
    } else {
      this.audio.pause();
    }
  }

  // ---------- 更新进度条 ----------

  /**
   * 根据音频当前播放时间更新进度条与当前时间显示
   */
  _updateProgress() {
    if (!this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    this.progressFill.style.width = pct + '%';
    this.currentEl.textContent = this._formatTime(this.audio.currentTime);
  }

  // ---------- 更新总时长 ----------

  /**
   * 音频元数据加载完成后更新总时长显示
   */
  _updateDuration() {
    this.durationEl.textContent = this._formatTime(this.audio.duration);
  }

  // ---------- 格式化时间 ----------

  /**
   * 将秒数格式化为 mm:ss
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时间字符串
   */
  _formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  // ========== 公开方法 ==========

  /**
   * 加载播放列表并初始化到第一首
   * @param {Object[]} playlist - 歌曲对象数组，每个对象需包含 title、artist、src
   */
  loadPlaylist(playlist) {
    this.playlist = playlist;
    if (this.playlist.length > 0) {
      this.currentIndex = 0;
      this._loadTrack(0);
    }
  }

  /**
   * 播放指定索引的歌曲
   * @param {number} index - 歌曲索引
   */
  play(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    this._shouldPlay = true;
    this._loadTrack(index);
  }

  /**
   * 暂停播放
   */
  pause() {
    this._shouldPlay = false;
    this.audio.pause();
  }

  /**
   * 播放下一曲
   */
  next() {
    if (this.playlist.length === 0) return;
    const idx = (this.currentIndex + 1) % this.playlist.length;
    this.play(idx);
  }

  /**
   * 播放上一曲
   */
  prev() {
    if (this.playlist.length === 0) return;
    const idx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.play(idx);
  }

  /**
   * 添加单首歌曲到播放列表末尾
   * @param {Object} track - 歌曲对象
   */
  addTrack(track) {
    this.playlist.push(track);
  }

  // ---------- 内部：加载音轨 ----------

  /**
   * 加载指定索引的音轨到 audio 元素，并广播切歌事件
   * @param {number} index - 歌曲索引
   */
  _loadTrack(index) {
    const track = this.playlist[index];
    if (!track) return;

    this.audio.src = track.src || '';
    this.audio.load();
    this.titleEl.textContent = track.title || '未知歌曲';
    this.artistEl.textContent = track.artist || '';
    this.progressFill.style.width = '0%';
    this.currentEl.textContent = '0:00';
    this.durationEl.textContent = '0:00';

    // 广播切歌事件，供首页歌词等外部组件监听
    this.audio.dispatchEvent(new CustomEvent('trackchange', {
      detail: { track, index },
    }));
  }
}

export { MusicPlayer };
