// 认证服务：封装后端 Auth API 调用与 Token 管理

const API_BASE = window.location.origin + '/api/auth';
const TOKEN_KEY = 'blog-auth-token';

const AuthService = {
  // ---------- Token 管理 ----------
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    this._cachedUser = null;
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  // 缓存用户信息
  _cachedUser: null,

  /** 获取当前用户信息（带缓存） */
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
  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  /** 发送邮箱验证码 */
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

  /** 注册 */
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

  /** 登录 */
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

  /** 退出登录 */
  logout() {
    this.removeToken();
  },

};

export { AuthService };
