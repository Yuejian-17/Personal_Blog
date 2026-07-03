// 运行时间时钟组件

class Clock {
  /**
   * @param {string} containerSelector - 挂载容器选择器
   * @param {string} startDate - 博客上线日期，默认 2025-01-01T00:00:00
   */
  constructor(containerSelector, startDate = '2025-01-01T00:00:00') {
    this.container = document.querySelector(containerSelector);
    this.startDate = new Date(startDate);
    this.timerId = null;

    if (this.container) {
      this._buildUI();
    }
  }

  // ---------- 构建 UI ----------
  _buildUI() {
    this.container.innerHTML = `
      <div class="clock-bar">
        <span class="clock-current" id="clock-current"></span>
        <span class="clock-uptime" id="clock-uptime"></span>
      </div>
    `;
    this.currentEl = this.container.querySelector('#clock-current');
    this.uptimeEl = this.container.querySelector('#clock-uptime');
  }

  // ---------- 启动定时更新 ----------
  start() {
    this._update();
    this.timerId = setInterval(() => this._update(), 1000);
  }

  // ---------- 停止 ----------
  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // ---------- 更新显示 ----------
  _update() {
    const now = new Date();
    this.currentEl.textContent = this._formatDateTime(now);
    this.uptimeEl.textContent = '已稳定运行 ' + this._formatUptime(now);
  }

  // ---------- 格式化当前时间 ----------
  _formatDateTime(date) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }

  // ---------- 格式化运行时长 ----------
  _formatUptime(now) {
    let diff = Math.floor((now - this.startDate) / 1000); // 总秒数
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / 86400);
    diff %= 86400;
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
  }
}

export { Clock };
