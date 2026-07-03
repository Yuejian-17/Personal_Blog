// 关于页

import { createBackButton } from '../components/backButton.js';

function renderAboutPage() {
  console.log('[路由] 关于页');
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="about-page">
      <div class="about-card">
        <div class="about-avatar">
          <img src="assets/images/Profile_Picture/Profile_Picture_1.jpg" alt="头像" loading="lazy">
        </div>
        <h1 class="about-name">清歌</h1>
        <p class="about-bio">一个平平无奇的普通人，偶尔写点自己喜欢的东西。</p>
        <div class="about-links">
          <p class="about-link about-link--text">email: qinge1117@hotmail.com</p>
          <a class="about-link" href="https://github.com/Yuejian-17" target="_blank" rel="noopener">
            <span class="about-link-icon">&#9906;</span>
            Github 主页
          </a>
        </div>
      </div>
    </div>
  `;

  app.prepend(createBackButton());
}

export { renderAboutPage };
