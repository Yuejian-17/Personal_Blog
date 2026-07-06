/**
 * 认证服务模块
 * @file 封装后端 Auth API 调用、JWT Token 管理以及当前用户信息缓存
 * @module js/utils/authService
 */

const API_BASE = window.location.origin + '/api/auth';
const TOKEN_KEY = 'blog-auth-token';

const AuthService = {
  // ---------- Token 管理 ----------

  /**
   * 从 localStorage 获取当前登录 Token
   * @returns {string|null} JWT Token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * 将 JWT Token 写入 localStorage
   * @param {string} token - JWT Token
   */
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * 清除 Token 并清空用户信息缓存
   */
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    this._cachedUser = null;
  },

  /**
   * 判断当前是否已登录
   * @returns {boolean}
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  // 缓存用户信息，避免频繁请求 /api/auth/me
  _cachedUser: null,

  /**
   * 获取当前登录用户信息（带缓存）
   * @returns {Promise<Object>} 当前用户信息
   */
  async getMe() {
    if (this._cachedUser) return this._cachedUser;
    const res = await fetch(`${API_BASE}/me`, {
      headers: this._headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '获取失败');
    this._cachedUser = data.user;
    return data.user;
  },

  // ---------- API 请求封装 ----------

  /**
   * 构造带认证头的请求头对象
   * @returns {Object} 请求头
   */
  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  /**
   * 发送邮箱验证码
   * @param {string} email - 邮箱地址
   * @returns {Promise<Object>} 后端响应数据
   */
  async sendEmailCode(email) {
    const res = await fetch(`${API_BASE}/send-email-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '发送失败');
    return data;
  },

  /**
   * 用户注册
   * @param {string} username - 昵称
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @param {string} code - 邮箱验证码
   * @returns {Promise<Object>} 后端响应数据
   */
  async register(username, email, password, code) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.errors?.[0]?.msg || '注册失败');
    return data;
  },

  /**
   * 用户登录，登录成功后保存 Token
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 后端响应数据
   */
  async login(email, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '登录失败');
    this.setToken(data.token);
    return data;
  },

  /**
   * 退出登录并清除本地认证信息
   */
  logout() {
    this.removeToken();
  },

};

export { AuthService };
