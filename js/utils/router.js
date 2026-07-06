/**
 * 前端路由封装模块
 * @file 基于 Navigo v9 的 hash 模式路由，定义全站路由映射并按需懒加载页面组件
 * @module js/utils/router
 */

const router = new Navigo('/', { hash: true });

// 获取 app 容器
const app = document.getElementById('app');

// ---------- 渲染辅助函数 ----------

/**
 * 将 HTML 内容渲染到 app 容器
 * @param {string} content - HTML 字符串
 */
function render(content) {
  app.innerHTML = content;
}

/**
 * 渲染占位页面（页面尚未实现时使用）
 * @param {string} title - 页面标题
 */
function renderPlaceholder(title) {
  removeNewArticleBtn();
  render(`<div class="placeholder-page"><h2>${title}</h2><p>此页面正在施工中...</p></div>`);
  // 插入返回按钮
  import('../components/backButton.js').then(({ createBackButton }) => {
    app.prepend(createBackButton());
  });
}

/**
 * 移除右下角新建文章按钮，避免在非文章列表页残留
 */
function removeNewArticleBtn() {
  const btn = document.getElementById('new-article-btn');
  if (btn) btn.remove();
}

// 定义路由映射表：路径 -> 懒加载页面组件
router.on({
  '/': () => {
    removeNewArticleBtn();
    import('../pages/homePage.js').then(({ renderHomePage }) => {
      renderHomePage();
    });
  },
  '/articles': () => {
    import('../pages/articleListPage.js').then(({ renderArticleListPage }) => {
      renderArticleListPage();
    });
  },
  '/article/:id': ({ data }) => {
    import('../pages/articleDetailPage.js').then(({ renderArticleDetailPage }) => {
      renderArticleDetailPage(data.id);
    });
  },
  '/projects': () => {
    import('../pages/projectPage.js').then(({ renderProjectPage }) => {
      renderProjectPage();
    });
  },
  '/music': () => {
    import('../pages/musicPage.js').then(({ renderMusicPage }) => {
      renderMusicPage();
    });
  },
  '/background': () => {
    import('../pages/backgroundPage.js').then(({ renderBackgroundPage }) => {
      renderBackgroundPage();
    });
  },
  '/about': () => {
    import('../pages/aboutPage.js').then(({ renderAboutPage }) => {
      renderAboutPage();
    });
  },
  '/editor': () => {
    import('../pages/editorPage.js').then(({ renderEditorPage }) => {
      renderEditorPage();
    });
  },
  '/auth': () => {
    import('../pages/authPage.js').then(({ renderAuthPage }) => {
      renderAuthPage();
    });
  },
  '/account': () => {
    import('../pages/accountPage.js').then(({ renderAccountPage }) => {
      renderAccountPage();
    });
  },
  '/admin': () => {
    import('../pages/adminPage.js').then(({ renderAdminPage }) => {
      renderAdminPage();
    });
  },
});

// 启动路由解析
router.resolve();

// 如果当前无 hash（首次加载），强制跳转到 #/
if (!window.location.hash) {
  router.navigate('/');
}

export { router };
