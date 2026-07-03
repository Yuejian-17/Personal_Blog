// 主题切换组件（滑块开关 auto + 圆形按钮日/夜切换）

class ThemeSwitcher {
  constructor(buttonContainerSelector = '#global-nav') {
    this.mode = localStorage.getItem('blog-theme') || 'auto';
    this.autoTimer = null;

    // 创建按钮组
    this._createButtons(buttonContainerSelector);

    // 初始应用主题
    this._applyMode();
  }

  // ---------- 创建 UI：滑块开关 + 日/夜按钮 ----------
  _createButtons(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    // 外层容器（右边界 at 5% 由 CSS 控制）
    const group = document.createElement('div');
    group.className = 'nav-theme-group';

    // auto 滑块开关
    group.innerHTML = `
      <div class="theme-auto-wrapper">
        <label class="theme-auto-switch">
          <input type="checkbox" id="theme-auto-input">
          <span class="theme-auto-slider"></span>
        </label>
        <span class="theme-auto-label">auto</span>
      </div>
      <button class="theme-toggle-btn" id="theme-daynight-btn"></button>
    `;

    container.appendChild(group);

    // 缓存 DOM 引用
    this.autoInput = group.querySelector('#theme-auto-input');
    this.dayNightBtn = group.querySelector('#theme-daynight-btn');

    // 绑定事件
    this.autoInput.addEventListener('change', () => this._toggleAuto());
    this.dayNightBtn.addEventListener('click', () => this._toggleDayNight());
  }

  // ---------- 应用当前 mode ----------
  _applyMode() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }

    if (this.mode === 'auto') {
      this._applyAutoTheme();
      this.autoTimer = setInterval(() => this._applyAutoTheme(), 60 * 60 * 1000);
    } else {
      this._applyTheme(this.mode);
    }

    localStorage.setItem('blog-theme', this.mode);
    this._updateUI();
  }

  // ---------- 日/夜切换 ----------
  _toggleDayNight() {
    const isDark = document.body.classList.contains('dark');

    if (this.mode === 'auto') {
      this.mode = isDark ? 'light' : 'dark';
    } else {
      this.mode = isDark ? 'light' : 'dark';
    }

    this._applyMode();
  }

  // ---------- 自动模式切换 ----------
  _toggleAuto() {
    if (this.autoInput.checked) {
      this.mode = 'auto';
    } else {
      const isDark = document.body.classList.contains('dark');
      this.mode = isDark ? 'dark' : 'light';
    }

    this._applyMode();
  }

  // ---------- 设置主题（外部调用） ----------
  setTheme(mode) {
    this.mode = mode;
    this._applyMode();
  }

  // ---------- 获取当前模式 ----------
  getCurrentTheme() {
    return this.mode;
  }

  // ---------- 应用具体主题 ----------
  _applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  // ---------- 自动模式：6:00-18:00 浅色 ----------
  _applyAutoTheme() {
    const hour = new Date().getHours();
    const theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    this._applyTheme(theme);
    this._updateUI();
  }

  // ---------- 更新 UI 状态 ----------
  _updateUI() {
    const isDark = document.body.classList.contains('dark');

    // 滑块开关状态
    if (this.autoInput) {
      this.autoInput.checked = (this.mode === 'auto');
    }

    // 日/夜按钮图标
    if (this.dayNightBtn) {
      this.dayNightBtn.textContent = isDark ? '\u{1F319}' : '\u{2600}\u{FE0F}';
      this.dayNightBtn.title = isDark ? '切换为日间模式' : '切换为夜间模式';
    }
  }
}

export { ThemeSwitcher };
