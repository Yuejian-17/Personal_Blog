/**
 * 3D 卡片翻转滚动效果组件模块
 * @file 监听页面滚动，使卡片从向后倾斜平滑过渡到直立，营造 3D 入场效果
 * @module js/components/card3dRotator
 */

class Card3DRotator {
  /**
   * 创建 3D 卡片旋转器
   * @param {string} selector - 卡片元素选择器，默认 '.al-card'
   */
  constructor(selector = '.al-card') {
    this.selector = selector;
    this.cards = [];
    this._ticking = false;

    this._onScroll = this._onScroll.bind(this);
    this._update = this._update.bind(this);

    this._collectCards();
    this._bindEvents();
    this._update();
  }

  // ---------- 收集卡片元素 ----------

  /**
   * 收集所有符合选择器的卡片元素
   */
  _collectCards() {
    this.cards = Array.from(document.querySelectorAll(this.selector));
  }

  // ---------- 绑定事件 ----------

  /**
   * 绑定滚动与resize事件，使用 passive 提升滚动性能
   */
  _bindEvents() {
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
  }

  // ---------- 解绑事件（必要时调用） ----------

  /**
   * 移除滚动与 resize 监听，释放资源
   */
  destroy() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
  }

  // ---------- 滚动事件（RAF 节流） ----------

  /**
   * 滚动事件回调，使用 requestAnimationFrame 节流避免频繁重绘
   */
  _onScroll() {
    if (!this._ticking) {
      this._ticking = true;
      requestAnimationFrame(this._update);
    }
  }

  // ---------- 更新所有卡片 ----------

  /**
   * 根据每张卡片在视口中的位置计算并应用旋转角度
   */
  _update() {
    this._ticking = false;

    const windowHeight = window.innerHeight;
    const isMobile = window.innerWidth < 768;
    const maxAngle = isMobile ? 20 : 45;

    for (const card of this.cards) {
      // 获取卡片相对于视口的位置
      const rect = card.getBoundingClientRect();
      const sectionTop = rect.top;

      let rotationAngle = maxAngle;
      let translateY = 0;

      if (sectionTop < 0) {
        // 卡片已滚出屏幕上方：保持直立，微上移
        rotationAngle = 0;
        translateY = Math.abs(sectionTop) * 0.1;
      } else if (sectionTop < windowHeight / 2) {
        // 卡片顶部在视口上半部分：完全直立
        rotationAngle = 0;
      } else if (sectionTop < windowHeight) {
        // 卡片在视口下半部分 → 线性从 0 过渡到 maxAngle
        const progress = (sectionTop - windowHeight / 2) / (windowHeight / 2);
        rotationAngle = progress * maxAngle;
      }
      // else: sectionTop >= windowHeight → 完全在视口下方 → 保持 maxAngle

      card.style.transform = `rotateX(${rotationAngle.toFixed(1)}deg) translateY(${translateY.toFixed(1)}px)`;
    }
  }

  // ---------- 手动更新卡片列表（动态添加卡片后调用） ----------

  /**
   * 重新收集卡片并立即更新一次状态，适用于动态添加卡片后
   */
  updateCards() {
    this._collectCards();
    this._update();
  }
}

export { Card3DRotator };
