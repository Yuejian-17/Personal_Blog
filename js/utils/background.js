// 背景图片轮播管理（支持 API 动态加载）

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

/** 从 API 加载背景列表（仅登录用户，游客保留默认） */
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
  } catch (err) { /* 保留默认 */ }
  return bgImages;
}

/** 监听背景切换事件 */
function onBackgroundChange(callback) {
  _onChange = callback;
}

function startBackgroundSlideshow(intervalMs = 10000) {
  const layer = document.getElementById('background-layer');
  if (!layer || bgImages.length === 0) return;

  if (!layer.style.backgroundImage || !layer.style.backgroundImage.includes('url')) {
    setBackground(layer, getSrc(bgImages[currentIndex]));
  }

  intervalId = setInterval(() => {
    currentIndex = (currentIndex + 1) % bgImages.length;
    setBackground(layer, getSrc(bgImages[currentIndex]));
    if (_onChange) _onChange(bgImages[currentIndex]);
  }, intervalMs);
}

function setBackground(layer, src) {
  const img = new Image();
  img.onload = () => {
    layer.style.backgroundImage = `url("${encodeURI(src)}")`;
  };
  img.src = src;
}

function stopBackgroundSlideshow() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

function setManualBackground(item) {
  stopBackgroundSlideshow();
  const idx = bgImages.findIndex(b => getSrc(b) === getSrc(item));
  if (idx !== -1) currentIndex = idx;
  const layer = document.getElementById('background-layer');
  if (layer) setBackground(layer, getSrc(item));
}

function addBackgroundImage(item) {
  bgImages.push(typeof item === 'string' ? { id: 0, src: item } : item);
}

function getSrc(item) {
  return typeof item === 'string' ? item : item.src;
}

export { initBackgrounds, startBackgroundSlideshow, stopBackgroundSlideshow, setManualBackground, addBackgroundImage, onBackgroundChange, bgImages, getSrc };
