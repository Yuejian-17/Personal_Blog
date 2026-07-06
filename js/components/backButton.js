/**
 * 返回按钮组件模块
 * @file 提供统一的返回首页按钮创建函数
 * @module js/components/backButton
 */

/**
 * 创建一个返回首页的按钮 DOM 元素
 * @param {string} text - 按钮文字，默认"返回"
 * @returns {HTMLElement} 返回按钮元素
 */
function createBackButton(text = '返回') {
  const btn = document.createElement('button');
  btn.className = 'back-btn';
  btn.innerHTML = `&#8592; ${text}`; // ← 返回
  btn.addEventListener('click', () => {
    window.location.hash = '#/';
  });
  return btn;
}

export { createBackButton };
