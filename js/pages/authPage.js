/**
 * 登录/注册页面组件
 * @file 渲染登录与注册表单，处理验证码发送、登录、注册及登录后跳转
 * @module js/pages/authPage
 */

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

/**
 * 渲染登录/注册页面
 */
function renderAuthPage() {
  const app = document.getElementById('app');
  const tab = window.location.hash.includes('?tab=register') ? 'register' : 'login';

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab${tab === 'login' ? ' auth-tab--active' : ''}" data-tab="login">登录</button>
          <button class="auth-tab${tab === 'register' ? ' auth-tab--active' : ''}" data-tab="register">注册</button>
        </div>

        <!-- 登录表单 -->
        <form class="auth-form${tab === 'login' ? '' : ' auth-form--hidden'}" id="auth-login-form" novalidate>
          <input type="email" class="auth-input" id="login-email" placeholder="邮箱" required
                 oninvalid="this.setCustomValidity('请输入正确的邮箱地址')" oninput="this.setCustomValidity('')">
          <input type="password" class="auth-input" id="login-password" placeholder="密码" required>
          <p class="auth-error" id="login-error"></p>
          <button type="submit" class="auth-submit">登录</button>
        </form>

        <!-- 注册表单 -->
        <form class="auth-form${tab === 'register' ? '' : ' auth-form--hidden'}" id="auth-register-form" novalidate>
          <input type="text" class="auth-input" id="reg-username" placeholder="昵称" required maxlength="50">
          <input type="email" class="auth-input" id="reg-email" placeholder="邮箱" required
                 oninvalid="this.setCustomValidity('请输入正确的邮箱地址')" oninput="this.setCustomValidity('')">
          <input type="password" class="auth-input" id="reg-password" placeholder="密码（至少8位，含字母和数字）" required minlength="8">
          <div class="auth-code-row">
            <input type="text" class="auth-input auth-code-input" id="reg-code" placeholder="验证码" required>
            <button type="button" class="auth-code-btn" id="reg-send-code">获取验证码</button>
          </div>
          <p class="auth-error" id="reg-error"></p>
          <button type="submit" class="auth-submit">注册</button>
        </form>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 切换 Tab
  document.querySelector('.auth-tabs').addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.auth-tab');
    if (!tabBtn) return;
    const targetTab = tabBtn.dataset.tab;

    document.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('auth-tab--active', t.dataset.tab === targetTab));
    document.getElementById('auth-login-form').classList.toggle('auth-form--hidden', targetTab !== 'login');
    document.getElementById('auth-register-form').classList.toggle('auth-form--hidden', targetTab !== 'register');
    document.getElementById('login-error').textContent = '';
    document.getElementById('reg-error').textContent = '';
  });

  // 发送验证码
  let codeCooldown = 0;
  const codeBtn = document.getElementById('reg-send-code');
  codeBtn.addEventListener('click', async () => {
    if (codeCooldown > 0) return;
    const email = document.getElementById('reg-email').value.trim();
    if (!email) {
      document.getElementById('reg-error').textContent = '请先输入邮箱';
      return;
    }
    codeBtn.disabled = true;
    document.getElementById('reg-error').textContent = '';

    try {
      await AuthService.sendEmailCode(email);
      codeCooldown = 60;
      updateCooldown();
    } catch (err) {
      document.getElementById('reg-error').textContent = err.message;
      codeBtn.disabled = false;
    }
  });

  /**
   * 更新验证码按钮倒计时
   */
  function updateCooldown() {
    if (codeCooldown > 0) {
      codeBtn.textContent = `${codeCooldown}s`;
      codeCooldown--;
      setTimeout(updateCooldown, 1000);
    } else {
      codeBtn.textContent = '获取验证码';
      codeBtn.disabled = false;
    }
  }

  // 登录
  document.getElementById('auth-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    document.getElementById('login-error').textContent = '';

    try {
      await AuthService.login(email, password);
      if (window.updateAuthNav) window.updateAuthNav();
      // 如果有 returnTo 参数，登录后跳转回去
      const match = window.location.hash.match(/[?&]returnTo=([^&]*)/);
      const returnTo = match ? match[1] : '';
      window.location.hash = returnTo ? `#/${returnTo}` : '#/';
    } catch (err) {
      document.getElementById('login-error').textContent = err.message;
    }
  });

  // 注册
  document.getElementById('auth-register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const code = document.getElementById('reg-code').value.trim();
    document.getElementById('reg-error').textContent = '';

    try {
      await AuthService.register(username, email, password, code);
      // 注册成功后自动跳转登录
      document.querySelector('.auth-tab[data-tab="login"]').click();
      document.getElementById('reg-error').textContent = '注册成功，请登录';
    } catch (err) {
      document.getElementById('reg-error').textContent = err.message;
    }
  });
}

export { renderAuthPage };
