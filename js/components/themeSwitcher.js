/**
 * 主题切换组件模块
 * @file 提供 auto / 日间 / 夜间三种模式的主题切换 UI 与逻辑，支持根据时间自动切换
 * @module js/components/themeSwitcher
 */

class ThemeSwitcher {
  /**
   * 创建主题切换组件
   * @param {string} buttonContainerSelector - 按钮组挂载容器选择器，默认 '#global-nav'
   */
  constructor(buttonContainerSelector = '#global-nav') {
    this.mode = localStorage.getItem('blog-theme') || 'auto';
    this.autoTimer = null;

    // 创建按钮组
    this._createButtons(buttonContainerSelector);

    // 初始应用主题
    this._applyMode();
  }

  // ---------- 创建 UI：滑块开关 + 日/夜按钮 ----------

  /**
   * 在指定容器内创建 auto 滑块开关和日/夜切换按钮
   * @param {string} selector - 容器选择器
   */
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

  /**
   * 根据当前模式应用主题，并设置自动刷新定时器
   */
  _applyMode() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }

    if (this.mode === 'auto') {
      this._applyAutoTheme();
      // 每小时检查一次时间，确保主题随时间变化
      this.autoTimer = setInterval(() => this._applyAutoTheme(), 60 * 60 * 1000);
    } else {
      this._applyTheme(this.mode);
    }

    localStorage.setItem('blog-theme', this.mode);
    this._updateUI();
  }

  // ---------- 日/夜切换 ----------

  /**
   * 切换日间/夜间模式
   */
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

  /**
   * 开启或关闭自动主题模式
   */
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

  /**
   * 外部设置主题模式
   * @param {'auto'|'light'|'dark'} mode - 主题模式
   */
  setTheme(mode) {
    this.mode = mode;
    this._applyMode();
  }

  // ---------- 获取当前模式 ----------

  /**
   * 获取当前主题模式
   * @returns {'auto'|'light'|'dark'}
   */
  getCurrentTheme() {
    return this.mode;
  }

  // ---------- 应用具体主题 ----------

  /**
   * 切换 body 的 dark 类以应用浅色或深色主题
   * @param {'light'|'dark'} theme - 主题
   */
  _applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  // ---------- 自动模式：6:00-18:00 浅色 ----------

  /**
   * 根据当前小时自动判断应使用的主题
   */
  _applyAutoTheme() {
    const hour = new Date().getHours();
    const theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
    this._applyTheme(theme);
    this._updateUI();
  }

  // ---------- 更新 UI 状态 ----------

  /**
   * 同步滑块开关与日/夜按钮的显示状态
   */
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
