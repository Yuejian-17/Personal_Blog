// 全局状态管理

const STORAGE_KEY = 'blog-store';

const store = {
  // 数据
  articles: [],
  projects: [],
  musicList: [],
  settings: {
    theme: 'auto',
    musicVolume: 1,
    blogStartDate: '2025-01-01T00:00:00',
  },

  // 发布/订阅
  _listeners: {},
  _loaded: false,

  /** 订阅事件 */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    if (event === 'dataLoaded' && this._loaded) {
      callback({ articles: this.articles, projects: this.projects, musicList: this.musicList });
    }
  },

  /** 触发事件 */
  emit(event, data) {
    const callbacks = this._listeners[event];
    if (callbacks) {
      callbacks.forEach((fn) => fn(data));
    }
  },

  /** 从 API/JSON 加载数据 */
  async loadData() {
    try {
      const token = localStorage.getItem('blog-auth-token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 并行加载
      const [articlesRes, projectsRes, musicRes] = await Promise.allSettled([
        fetch('/api/articles?limit=50').then(r => r.ok ? r.json() : Promise.reject('articles API failed')),
        fetch('/api/projects?limit=50').then(r => r.ok ? r.json() : Promise.reject('projects API failed')),
        token
          ? fetch('/api/media/music', { headers }).then(r => r.ok ? r.json() : Promise.reject('music API failed'))
          : fetch('data/music.json').then(r => r.json()),
      ]);

      let articles = articlesRes.status === 'fulfilled'
        ? (articlesRes.value.articles || []).map(a => ({ id: String(a.id), title: a.title, date: a.created_at?.slice(0,10) || '', author: a.author_name || '', tags: a.tags || [], content: a.content || '' }))
        : [];
      if (articles.length === 0) {
        // 回退 JSON
        try { articles = await fetch('data/articles.json').then(r => r.json()); } catch {}
      }

      let projects = projectsRes.status === 'fulfilled'
        ? (projectsRes.value.projects || []).map(p => ({
            id: p.id, author_id: p.author_id, name: p.title, description: p.description,
            tags: p.tech_stack ? p.tech_stack.split(',').map(t => t.trim()).filter(Boolean) : [],
            url: p.github_url || (p.live_url || '#'), author_name: p.author_name || '', created_at: p.created_at || '',
          }))
        : [];
      if (projects.length === 0) {
        try { projects = await fetch('data/projects.json').then(r => r.json()); } catch {}
      }

      let musicList = musicRes.status === 'fulfilled' ? (musicRes.value.musicList || []) : [];
      if (musicList.length === 0) {
        try { musicList = await fetch('data/music.json').then(r => r.json()); } catch {}
      }

      this.articles = articles;
      this.projects = projects;
      this.musicList = musicList;
      this._loaded = true;

      console.log('[Store] 数据加载完成', {
        articles: this.articles.length,
        projects: this.projects.length,
        musicList: this.musicList.length,
      });

      this.emit('dataLoaded', { articles: this.articles, projects: this.projects, musicList: this.musicList });
    } catch (err) {
      console.error('[Store] 数据加载失败:', err);
      this._loaded = true;
      this.emit('dataLoaded', { articles: [], projects: [], musicList: [] });
    }
  },

  /** 删除文章 */
  removeArticle(id) {
    this.articles = this.articles.filter((a) => a.id !== id);
    this._persistArticles();
  },

  /** 删除项目（通过 API） */
  async removeProject(id) {
    const token = localStorage.getItem('blog-auth-token');
    if (token) {
      try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      } catch (err) { console.warn('[Store] 删除项目 API 失败:', err); }
    }
    this.projects = this.projects.filter((p) => p.id !== id);
  },

  /** 持久化文章到 localStorage */
  _persistArticles() {
    const local = this._loadLocal();
    // 只保留 localStorage 中创建的（非内置）文章，加上当前新增的
    const builtInIds = new Set();
    // 标记内置 ID：来自 JSON 的 ID 较小（数字字符串）
    local.articles = this.articles.filter((a) => {
      return isNaN(Number(a.id)) || a.id.length > 4;
    });
    this._saveLocal(local);
  },

  /** 持久化项目到 localStorage */
  _persistProjects() {
    const local = this._loadLocal();
    local.projects = this.projects;
    this._saveLocal(local);
  },

  // -- localStorage helpers --
  _loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { articles: [], projects: [] };
    } catch {
      return { articles: [], projects: [] };
    }
  },

  _saveLocal(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  /** 按 id 合并，本地数据优先插入最前 */
  _mergeById(jsonData, localData) {
    const seen = new Set(localData.map((a) => a.id));
    const merged = [...localData];
    for (const item of jsonData) {
      if (!seen.has(item.id)) {
        merged.push(item);
      }
    }
    return merged;
  },
};

export { store };
