// 主入口：初始化路由、全局配置

import { router } from './utils/router.js';
import { store } from './store.js';
import { AuthService } from './utils/authService.js';
import { MusicPlayer } from './components/musicPlayer.js';
import { ThemeSwitcher } from './components/themeSwitcher.js';
import { Clock } from './components/clock.js';
import { initBackgrounds, startBackgroundSlideshow } from './utils/background.js';

// 全局单例：音乐播放器
const musicPlayer = new MusicPlayer();
window.musicPlayer = musicPlayer;

// 全局单例：主题切换
const themeSwitcher = new ThemeSwitcher();
window.themeSwitcher = themeSwitcher;

// 全局单例：运行时间时钟
const clock = new Clock('#clock-container');
clock.start();

// 启动背景图片轮播（先从 API 加载列表）
initBackgrounds().then(() => startBackgroundSlideshow(10000));

// 登录用户切换背景时保存设置
import('./utils/background.js').then(({ onBackgroundChange }) => {
  onBackgroundChange((item) => {
    const token = localStorage.getItem('blog-auth-token');
    if (!token) return;
    const id = item?.id;
    if (id) {
      fetch('/api/media/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ current_background_id: id }),
      }).catch(() => {});
    }
  });
});

// 数据加载完成后，加载播放列表
store.on('dataLoaded', ({ musicList }) => {
  if (musicList.length > 0) {
    musicPlayer.loadPlaylist(musicList);
  }
});

// 登录用户切换音乐时保存设置
if (musicPlayer) {
  musicPlayer.audio.addEventListener('trackchange', (e) => {
    const token = localStorage.getItem('blog-auth-token');
    if (!token || !e.detail) return;
    fetch('/api/media/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ current_music_id: e.detail.track.id }),
    }).catch(() => {});
  });
}

// 挂载 store 到全局，方便其他模块和调试时访问
window.store = store;

// 加载初始数据
store.loadData();

console.log('Blog app initialized');

// 更新导航栏登录状态
async function updateAuthNav() {
  const authLink = document.getElementById('nav-auth-link');
  const dropdown = document.getElementById('nav-user-dropdown');
  const avatar = document.getElementById('nav-user-avatar');
  const nameEl = document.getElementById('nav-user-name');
  const emailEl = document.getElementById('nav-user-email');
  const logoutBtn = document.getElementById('nav-logout-btn');

  if (!authLink) return;

  // 点击菜单项后关闭下拉
  if (dropdown) {
    dropdown.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
  }

  if (AuthService.isLoggedIn()) {
    // 已登录：显示头像 + 下拉菜单
    authLink.style.display = 'none';
    dropdown.style.display = 'none';
    avatar.style.display = 'none';
    nameEl.textContent = '';
    emailEl.textContent = '';

    // 从服务端获取用户信息
    try {
      const user = await AuthService.getMe();
      const avatarSrc = user.profile_picture || 'assets/images/Profile_Picture/Profile_Picture_1.jpg';
      // 导航栏显示用户名
      authLink.style.display = '';
      authLink.style.alignItems = '';
      authLink.innerHTML = escapeHtml(user.username);
      authLink.className = 'nav-username';
      authLink.href = '#';
      authLink.onclick = (e) => {
        e.preventDefault();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
      };

      // 填充下拉菜单信息
      avatar.src = avatarSrc;
      avatar.style.display = 'block';
      nameEl.textContent = user.username;
      emailEl.textContent = user.email;

      // 管理员显示管理链接
      const adminLink = document.getElementById('nav-admin-link');
      if (adminLink) {
        adminLink.style.display = user.role === 'admin' ? '' : 'none';
      }
    } catch (err) {
      // Token 失效，清除
      AuthService.logout();
      showLoginLink();
    }

    // 退出按钮
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        AuthService.logout();
        window.location.reload();
      };
    }

    // 点击其他地方关闭下拉
    document.addEventListener('click', (e) => {
      const userItem = document.getElementById('nav-user-item');
      if (dropdown && userItem && !userItem.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    }, { once: true }); // will be re-registered on next nav update if needed

  } else {
    showLoginLink();
  }
}

function showLoginLink() {
  const authLink = document.getElementById('nav-auth-link');
  const dropdown = document.getElementById('nav-user-dropdown');
  const adminLink = document.getElementById('nav-admin-link');
  if (authLink) {
    authLink.style.display = '';
    authLink.innerHTML = '登录';
    authLink.href = '#/auth';
    authLink.onclick = null;
    authLink.className = '';
  }
  if (dropdown) dropdown.style.display = 'none';
  if (adminLink) adminLink.style.display = 'none';
}

updateAuthNav();

// 暴露给其他模块使用
window.updateAuthNav = updateAuthNav;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
