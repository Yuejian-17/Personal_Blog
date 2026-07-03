// 返回按钮组件

/**
 * 创建一个返回按钮 DOM 元素
 * @param {string} text - 按钮文字，默认"返回"
 * @returns {HTMLElement}
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
