/**
 * 背景图片轮播管理模块
 * @file 管理首页背景图列表，支持 API 动态加载、自动轮播与手动切换
 * @module js/utils/background
 */

// 默认本地背景图列表（游客或未登录时使用）
let bgImages = [
  { id: 0, src: 'assets/images/Background_Image/101439746_p0.jpg' },
  { id: 0, src: 'assets/images/Background_Image/144299158_p3.jpg' },
  { id: 0, src: 'assets/images/Background_Image/84662366_p0.jpg' },
  { id: 0, src: 'assets/images/Background_Image/86708470_p0.jpg' },
  { id: 0, src: 'assets/images/Background_Image/88296129_p0.jpg' },
];

let currentIndex = 0;
let intervalId = null;
let _onChange = null;

/**
 * 从后端 API 加载登录用户的背景列表
 * 未登录或请求失败时保留本地默认背景
 * @returns {Object[]} 当前生效的背景图数组
 */
async function initBackgrounds() {
  const token = localStorage.getItem('blog-auth-token');
  if (!token) return bgImages; // 游客：使用本地默认
  try {
    const res = await fetch('/api/media/backgrounds', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.backgrounds && data.backgrounds.length > 0) {
        bgImages = data.backgrounds;
      }
    }
  } catch (err) { /* 网络异常时保留默认背景，避免首页空白 */ }
  return bgImages;
}

/**
 * 注册背景切换监听器
 * @param {Function} callback - 切换背景时回调，参数为当前背景对象
 */
function onBackgroundChange(callback) {
  _onChange = callback;
}

/**
 * 启动背景图片自动轮播
 * @param {number} intervalMs - 切换间隔（毫秒），默认 10000ms
 */
function startBackgroundSlideshow(intervalMs = 10000) {
  const layer = document.getElementById('background-layer');
  if (!layer || bgImages.length === 0) return;

  // 首次启动时若未设置背景，则先显示第一张
  if (!layer.style.backgroundImage || !layer.style.backgroundImage.includes('url')) {
    setBackground(layer, getSrc(bgImages[currentIndex]));
  }

  intervalId = setInterval(() => {
    currentIndex = (currentIndex + 1) % bgImages.length;
    setBackground(layer, getSrc(bgImages[currentIndex]));
    if (_onChange) _onChange(bgImages[currentIndex]);
  }, intervalMs);
}

/**
 * 设置背景图（先预加载再应用到 DOM，避免闪烁）
 * @param {HTMLElement} layer - 背景层 DOM 元素
 * @param {string} src - 图片地址
 */
function setBackground(layer, src) {
  const img = new Image();
  img.onload = () => {
    layer.style.backgroundImage = `url("${encodeURI(src)}")`;
  };
  img.src = src;
}

/**
 * 停止背景自动轮播
 */
function stopBackgroundSlideshow() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

/**
 * 手动设置某张图片为背景，并停止自动轮播
 * @param {Object|string} item - 背景对象或图片地址
 */
function setManualBackground(item) {
  stopBackgroundSlideshow();
  const idx = bgImages.findIndex(b => getSrc(b) === getSrc(item));
  if (idx !== -1) currentIndex = idx;
  const layer = document.getElementById('background-layer');
  if (layer) setBackground(layer, getSrc(item));
}

/**
 * 向背景列表中添加一张图片
 * @param {Object|string} item - 背景对象或图片地址
 */
function addBackgroundImage(item) {
  bgImages.push(typeof item === 'string' ? { id: 0, src: item } : item);
}

/**
 * 统一获取背景对象的图片地址
 * @param {Object|string} item - 背景对象或图片地址
 * @returns {string} 图片地址
 */
function getSrc(item) {
  return typeof item === 'string' ? item : item.src;
}

export { initBackgrounds, startBackgroundSlideshow, stopBackgroundSlideshow, setManualBackground, addBackgroundImage, onBackgroundChange, bgImages, getSrc };
