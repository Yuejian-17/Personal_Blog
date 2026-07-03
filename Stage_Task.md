# 原生 JavaScript 个人博客 - 分阶段开发任务书

---

## 前端开发基础任务

### 阶段一：项目骨架与基础设施

#### 任务 1.1 创建项目目录结构

- 创建以下目录和文件：

  ```shell
  /my-blog
  ├── index.html              # 唯一完整 HTML 页面
  ├── css/
  │   └── style.css           # 全局样式
  ├── js/
  │   ├── app.js              # 主入口：初始化路由、全局配置
  │   ├── store.js            # 全局状态管理（文章、音乐、设置）
  │   ├── components/
  │   │   ├── musicPlayer.js  # 音乐播放器组件
  │   │   ├── themeSwitcher.js # 主题切换组件
  │   │   ├── backButton.js   # 返回按钮组件
  │   │   └── clock.js        # 运行时间显示组件
  │   └── utils/
  │       ├── router.js       # 简单路由封装（或引入 navigo）
  │       └── helpers.js      # 格式化时间、字符串处理等
  ├── data/
  │   ├── articles.json       # 文章元数据（id, title, date, tags, content markdown）
  │   ├── projects.json       # 项目列表
  │   └── music.json          # 音乐列表
  ├── assets/
  │   ├── images/             # 背景图、站点图标
  │   └── music/              # 本地 mp3 文件（如果有）
  └── README.md
  ```

- **验收标准**：目录结构已创建，`index.html` 可被浏览器打开（空白页）。

#### 任务 1.2 搭建主布局 (`index.html`)

- **目标**：构建博客唯一的 HTML 文件，包含所有页面容器和全局元素。
- **子任务**：
  1. 编写 HTML 基础结构，引入 `style.css`。
  2. 定义各页面容器：
     - `<div id="app">` 为主视图切换区域。
     - `<div id="background-layer">` 背景层（固定定位）。
  3. 预留导航栏占位：`<nav id="global-nav">`，内含标题和菜单项（首页、文章等）。
  4. 引入必要的 JS 库：`navigo`（路由）、`marked`（markdown 解析）。建议使用 CDN。
  5. 引入自定义 JS 模块：使用 `type="module"` 标签引入 `app.js`。
- **验收标准**：页面可加载，无控制台错误，导航栏静态可见。

#### 任务 1.3 实现前端路由 (`router.js`)

- **目标**：基于 `navigo` 实现单页面路由，支持 hash 模式。
- **子任务**：
  1. 在 `router.js` 中初始化 `new Navigo('/', { hash: true })`。
  2. 定义路由映射表：`/`, `/articles`, `/article/:id`, `/projects`, `/music`, `/background`, `/about`, `/editor`。
  3. 每个路由绑定对应的渲染函数，这些函数后续在各自页面模块中实现。
  4. 导出 `router` 实例给 `app.js` 使用。
- **验收标准**：直接修改浏览器 hash，控制台打印出对应路由名称（暂时无内容显示）。

#### 任务 1.4 全局状态管理 (`store.js`)

- **目标**：集中管理博客动态数据，提供获取和更新方法。
- **子任务**：
  1. 定义 `store` 对象，包含：
     - `articles: []`（从 `articles.json` 异步加载）
     - `projects: []`
     - `musicList: []`
     - `settings: { theme: 'auto', musicVolume: 1 }` 等。
  2. 提供 `loadData()` 方法，使用 `fetch` 从 `/data/` 目录加载 JSON 文件并填充到 store。
  3. 提供简单的发布/订阅机制（可选），用于数据更新时通知视图重新渲染。
- **验收标准**：调用 `loadData()` 后，可以在控制台看到加载的数据。

---

### 阶段二：全局组件开发

#### 任务 2.1 音乐播放器组件 (`musicPlayer.js`)

- **目标**：创建可复用的音乐播放器，支持播放、暂停、上一曲、下一曲、进度条显示。
- **子任务**：
  1. 导出类 `MusicPlayer`，构造函数接收 `containerSelector` 参数。
  2. 内部创建 `<audio>` 元素和播放器控制 UI（使用模板字符串生成）。
  3. 提供方法：`loadPlaylist(playlist)`、`play(index)`、`pause()`、`next()`、`prev()`。
  4. 监听 `audio` 事件（`timeupdate`, `ended`, `loadedmetadata`）更新进度条和当前时间。
  5. 播放器 UI 固定在左下角，采用最小化样式（圆形按钮），点击可展开详情。
  6. 全局单例：在 `app.js` 中实例化，并挂载到 `window` 或作为模块导出，供其他页面调用。
- **验收标准**：在任意页面调用 `musicPlayer.loadPlaylist(data)` 后，点击播放按钮可正常播放/暂停，进度条移动。

#### 任务 2.2 主题切换组件 (`themeSwitcher.js`)

- **目标**：实现日/夜间模式切换，支持自动切换和手动切换，记住用户偏好。
- **子任务**：
  1. 定义 CSS 变量或两套样式表，通过给 `<body>` 添加 `class="dark"` 切换。
  2. 导出 `ThemeSwitcher` 类，包含方法：
     - `setTheme(mode)`：`mode` 可以是 `'light'`, `'dark'`, `'auto'`。
     - `getCurrentTheme()`。
  3. `auto` 模式根据当地时间（例如 6:00-18:00 为浅色）自动切换，使用 `setInterval` 每小时检查一次。
  4. 使用 `localStorage` 存储用户选择。
  5. 首页的“模式切换板块”调用此组件，并提供一个 UI 按钮（太阳/月亮图标）。
- **验收标准**：点击主题按钮，页面立即切换主题；刷新后偏好保持；自动模式在天亮/天黑时生效。

#### 任务 2.3 返回按钮组件 (`backButton.js`)

- **目标**：生成一个返回上一级的按钮，用于各个子页面。
- **子任务**：
  1. 导出函数 `createBackButton(text = '返回')`，返回一个 DOM 元素，点击后调用 `history.back()` 或直接导航到首页。
  2. 按钮样式为圆角、图标+文字，位于内容区左上方。
- **验收标准**：在文章页等页面调用后，点击可返回上一页。

#### 任务 2.4 运行时间时钟组件 (`clock.js`)

- **目标**：首页左小条显示当前时间，其余部分显示系统稳定运行时间。
- **子任务**：
  1. 导出类 `Clock`，接收容器选择器。
  2. 实现 `start()` 方法：使用 `setInterval` 每秒更新。
  3. 当前时间使用 `Date` 对象格式化显示。
  4. 运行时间基于预设的起始日期（例如博客上线日期 `2025-01-01T00:00:00`），计算差值并格式化为 `XX天 XX时 XX分 XX秒`。
- **验收标准**：数字随时间变化，运行时间累计正确。

---

### 阶段三：页面功能实现

#### 任务 3.1 首页 (`homePage.js`)

- **目标**：按照设计实现首页各板块。
- **子任务**：
  1. **背景切换**：在 `background-layer` 中设置图片数组，用 `setInterval` 定时更换背景，并叠加半透明白色蒙版（CSS 实现）。
  2. **导航栏**：`global-nav` 绑定路由，点击菜单项触发对应路由。
  3. **搜索框**：输入关键字后，路由跳转到文章列表页并传递搜索参数，或在下方动态展示搜索结果列表（简单实现：跳转至文章页，带上 `?q=xxx`，由文章列表页处理过滤）。
  4. **个人介绍板块**：从 `store` 或静态文本渲染。
  5. **文章轮播**：展示3-5篇文章卡片，每10秒自动切换（`setInterval` 改变当前索引，重新渲染）。
  6. **音乐板块**：调用全局 `musicPlayer`，显示当前播放歌曲信息。
  7. **歌词板块**：从当前播放歌曲的元数据中提取歌词（如果有），或显示一句静态文字。
  8. **模式切换板块**：调用 `themeSwitcher` 的 UI，添加手动切换按钮和自动模式复选框。
  9. **时间板块**：左侧显示当前时间，右侧显示系统运行时间（调用 `clock` 组件）。
- **验收标准**：首页所有板块正常显示，背景切换、文章轮播、音乐播放、主题切换等功能均工作。

#### 任务 3.2 文章列表页 (`articleListPage.js`)

- **目标**：显示所有文章的摘要，支持搜索过滤，点击跳转详情。
- **子任务**：
  1. 渲染时从 `store.articles` 获取数据。
  2. 顶部添加搜索输入框，输入时实时过滤列表（基于标题和标签）。
  3. 每篇文章显示为卡片：标题、日期、标签，点击后路由到 `/article/:id`。
  4. 左下角嵌入音乐播放器。
  5. 右下角放置“编辑新文章”按钮（加号图标），点击跳转 `/editor`。
- **验收标准**：文章列表正常显示，搜索过滤生效，可进入详情页。

#### 任务 3.3 文章详情页 (`articleDetailPage.js`)

- **目标**：展示完整文章内容，支持 Markdown 渲染。
- **子任务**：
  1. 从路由参数 `id` 获取文章对象。
  2. 使用 `marked` 库将文章内容的 Markdown 转换为 HTML 并显示。
  3. 显示文章标题、发布时间、作者、标签。
  4. 集成音乐播放器。
  5. 如有需要，显示代码高亮（可引入 highlight.js）。
- **验收标准**：文章显示格式正确，代码块可读，音乐播放正常。

#### 任务 3.4 项目页 (`projectPage.js`)

- **目标**：展示项目列表，点击跳转 GitHub 仓库。
- **子任务**：
  1. 渲染 `store.projects`。
  2. 每个项目卡片包含名称、简介、技术栈标签，点击卡片跳转外部链接（使用 `window.open` 或直接 `a` 标签）。
  3. 集成搜索框过滤项目。
  4. 集成音乐播放器。
- **验收标准**：项目链接可点击，搜索过滤有效，音乐播放正常。

#### 任务 3.5 音乐页 (`musicPage.js`)

- **目标**：展示所有音乐，支持搜索和导入本地 mp3 文件。
- **子任务**：
  1. 渲染 `store.musicList` 为可点击列表，点击即切换播放当前歌曲。
  2. 搜索功能：输入关键字过滤歌曲名。
  3. 导入按钮：使用 `<input type="file" accept=".mp3">` 选择本地文件，通过 `URL.createObjectURL()` 创建临时播放链接，并添加到播放列表。
  4. 集成音乐播放器。
- **验收标准**：点击列表项可切歌，搜索过滤正常，导入本地文件可播放。

#### 任务 3.6 背景页 (`backgroundPage.js`)

- **目标**：管理背景图片，可从本地设置。
- **子任务**：
  1. 功能与音乐页类似，但改为背景图片列表。
  2. 默认展示内置背景图列表，点击可预览并设为当前背景。
  3. 导入按钮支持图片文件，添加到背景列表。
- **验收标准**：可以切换和导入背景图片。

#### 任务 3.7 关于页 (`aboutPage.js`)

- **目标**：展示作者信息。
- **子任务**：
  1. 渲染作者头像、简介、社交链接等静态内容（也可从 JSON 读取）。
  2. 放置音乐播放器组件。
- **验收标准**：信息正确显示。

#### 任务 3.8 文章编辑器页 (`editorPage.js`)

- **目标**：提供 Markdown 编辑和实时预览，保存新文章（暂时保存到 localStorage）。
- **子任务**：
  1. 左边为 `<textarea>` 编辑区，右边为预览区。
  2. 监听 `input` 事件，使用 `marked` 实时渲染预览。
  3. 保存按钮：将标题、内容和当前时间生成一个新的文章对象，存入 `localStorage` 并同步到 `store.articles`。
  4. 成功后跳转到文章列表或详情页。
- **验收标准**：编辑时预览实时更新，保存后可在文章列表中看到新文章。

---

### 阶段四：进阶功能与优化

#### 任务 4.1 本地搜索集成

- 使用 `Pagefind` 工具：在构建时扫描所有静态 HTML 生成索引，然后在搜索框输入时调用 Pagefind API 展示结果。
- 由于你的博客是 SPA，可以预先将文章数据渲染成隐藏的 HTML 以供 Pagefind 索引，或者直接前端基于 JSON 数据实现简单搜索（任务 3.2 已实现），因此可不依赖 Pagefind，视需求决定。
- **验收标准**：搜索功能快速准确。

#### 任务 4.2 评论集成 (`Giscus`)

- 在文章详情页底部插入 Giscus 评论组件（需在 GitHub 上开启 Discussions）。
- 使用提供的代码片段动态插入到详情页容器中。
- **验收标准**：访问文章详情页，可看到评论框，登录 GitHub 后可发表评论。

#### 任务 4.3 RSS 订阅源生成

- 编写一个 Node.js 脚本（`generateRSS.js`），读取 `articles.json`，生成符合标准的 RSS XML 文件。
- 部署时运行该脚本，将生成的 `feed.xml` 放到网站根目录。
- **验收标准**：访问 `/feed.xml` 能获取有效的 RSS。

#### 任务 4.4 性能优化与无障碍访问

- 为图片添加懒加载。
- 确保颜色对比度符合无障碍标准。
- 压缩 CSS/JS（可以使用 esbuild 或 swc）。
- 打包构建脚本（npm scripts）。
- **验收标准**：Lighthouse 性能分数 > 90。

---

### 开发建议与 AI 协作提示

- 每个任务都生成独立的 JS 文件，通过 ES 模块导入导出，保持代码清晰。
- 利用 AI 生成重复性 UI 代码（如卡片模板、列表渲染函数）。
- 遵循“先数据，后视图”原则：先准备 JSON 数据结构，再写渲染函数。
- 及时进行 `router.navigate()` 跳转测试，确保页面切换正常。
- 样式使用 CSS 变量和 Grid/Flexbox 布局，保证响应式。

## 全栈功能开发分阶段任务书

本任务书将**用户系统（注册/登录/权限）、后端 API、数据库集成、邮件验证、安全加固**等需求整合为可执行的开发阶段，基于 **Node.js + Express + MySQL + 原生 JS 前端** 技术栈。

---

### 阶段一：后端项目初始化与数据库搭建

**目标**：搭建 Express 项目骨架，连接 MySQL，创建所有核心数据表。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 1.1 | 初始化后端项目 | 在博客根目录下创建 `/server` 文件夹，使用 `npm init` 初始化，安装依赖：`express`, `mysql2`, `dotenv`, `cors`, `bcrypt`, `jsonwebtoken`, `express-validator`, `nodemailer` | 终端执行 `npm start` 能启动 Express 服务 |
| 1.2 | 配置环境变量 | 创建 `.env` 文件，包含数据库连接信息、JWT 密钥、邮件服务 API 密钥等；创建 `.gitignore` 忽略 `node_modules` 和 `.env` | 敏感信息不会暴露在代码仓库中 |
| 1.3 | 数据库连接池 | 编写 `server/db.js`，使用 `mysql2/promise` 创建连接池并导出 | 可正常执行 SQL 查询 |
| 1.4 | 建表 SQL 脚本 | 执行之前设计的 `users`, `articles`, `projects`, `comments` 四张表的创建语句，并添加索引 | 数据库中存在对应表结构 |

---

### 阶段二：用户注册与登录系统（含邮件验证）

**目标**：实现完整的注册、登录、JWT 鉴权流程，并通过邮件发送验证码。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 2.1 | 注册接口 (`POST /api/auth/register`) | 接收邮箱、密码、昵称；校验格式；密码使用 bcrypt 加密存储；默认角色为 `user`；返回注册成功信息 | 通过 Postman 测试可成功注册 |
| 2.2 | 登录接口 (`POST /api/auth/login`) | 验证邮箱和密码，成功后返回 JWT Token（有效期 7 天）；Token 包含用户 ID 和角色 | 登录成功获得 Token，错误密码被拒绝 |
| 2.3 | 邮件验证码发送 (`POST /api/auth/send-email-code`) | 生成 6 位随机数字，通过 Nodemailer 发送；验证码存入 Redis（或内存 Map，若有可用 Redis）并设置 5 分钟过期；同一邮箱 60 秒内不可重复发送 | 收到验证码邮件，重复点击被限流 |
| 2.4 | 验证码校验 (整合到注册或单独接口) | 注册时要求输入验证码，与后端存储的比对；验证码一次性消费 | 正确的验证码完成注册，错误的被拒绝 |
| 2.5 | JWT 鉴权中间件 | 编写 `authMiddleware.js`，从请求头提取 Token 并解析，挂载 `req.user` | 受保护路由无 Token 返回 401 |
| 2.6 | 权限中间件 | 编写 `roleMiddleware`，根据 `role` 限制操作（如 `admin` 可删除任何内容） | 普通用户尝试删除他人文章返回 403 |
| 2.7 | 获取当前用户信息 (`GET /api/auth/me`) | 返回已登录用户的公开信息（用户名、头像、简介等） | 前端可用于显示登录状态 |

---

### 阶段三：核心内容 API（文章、项目、评论）

**目标**：提供博客所有内容的 CRUD 接口，结合权限控制。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 3.1 | 文章列表 (`GET /api/articles`) | 支持分页查询（`?page=1&limit=10`），只返回 `published` 状态的文章；返回总数方便前端分页 | 可按参数返回指定页文章 |
| 3.2 | 文章详情 (`GET /api/articles/:id`) | 根据 ID 返回单篇文章完整内容；增加 `views` 浏览量自增逻辑 | 能获取文章全文 |
| 3.3 | 创建文章 (`POST /api/articles`) | 需认证；接收标题、内容（Markdown）、状态；作者自动设为当前用户；`admin` 可设置任意状态 | 成功创建后返回文章数据 |
| 3.4 | 更新文章 (`PUT /api/articles/:id`) | 需认证；只能作者或 `admin` 编辑；更新标题、内容、状态 | 越权操作被阻止 |
| 3.5 | 删除文章 (`DELETE /api/articles/:id`) | 需认证；只能作者或 `admin` 删除；级联删除相关评论 | 文章及评论一并删除 |
| 3.6 | 项目 CRUD 接口 | 类似文章，路径 `/api/projects`，字段对应项目表 | 可增删改查个人项目 |
| 3.7 | 评论接口 | `GET /api/articles/:id/comments` 获取某篇文章的评论（树形结构由前端组装）；`POST /api/articles/:id/comments` 创建评论（需登录）；`DELETE /api/comments/:id` 删除评论（仅作者或管理员） | 评论嵌套逻辑正确，权限控制生效 |
| 3.8 | 搜索接口 | `GET /api/search?q=xxx&type=articles,projects`，对标题和内容进行模糊匹配 | 可搜索文章和项目 |

---

## 阶段四：前端账号功能集成

**目标**：在原生 JS 博客中添加登录/注册页面，以及前端鉴权流程。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 4.1 | 登录/注册页面 | 创建 `login.html` / `register.html` 或 SPA 路由页面；包含邮箱、密码、验证码输入框和发送验证码按钮 | 页面渲染正常，表单可用 |
| 4.2 | 前端 API 封装 | 编写 `api.js`，封装 `fetch` 请求（自动携带 Token，处理 401 跳转） | 所有 API 调用通过该模块 |
| 4.3 | 登录状态管理 | 登录后将 Token 存入 `localStorage`；在全局导航中检测登录状态，显示用户头像或登录按钮 | 刷新页面登录状态保持 |
| 4.4 | 文章编辑器页面集成 | 编辑器页提交时调用创建/更新 API；根据是否登录显示编辑入口 | 登录用户可发布文章 |
| 4.5 | 评论功能集成 | 文章详情页底部加载评论树，登录后可发表评论；嵌套回复功能 | 评论发布和显示正确 |
| 4.6 | 权限感知 UI | 作者本人或管理员才能看到编辑、删除按钮 | 普通用户访问他人文章无编辑按钮 |

---

## 阶段五：安全加固与性能优化

**目标**：防御常见 Web 攻击，提升系统健壮性。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 5.1 | 密码强度校验 | 注册时强制密码长度至少 8 位，包含字母和数字 | 弱密码注册被拦截 |
| 5.2 | 登录频率限制 | 使用中间件（如 `express-rate-limit`）限制同一 IP 登录尝试次数，防止暴力破解 | 短时间多次登录被暂时锁定 |
| 5.3 | 输入验证与清理 | 所有用户输入使用 `express-validator` 校验和转义；前端输出时防止 XSS（使用 `textContent` 或库） | 无法注入恶意脚本 |
| 5.4 | CORS 白名单 | 配置 `cors` 中间件只允许博客前端域名 | 外部网站无法盗用 API |
| 5.5 | 安全 HTTP 头 | 使用 `helmet` 中间件设置 `X-Content-Type-Options`, `X-Frame-Options`, `CSP` 等 | 响应头包含安全策略 |
| 5.6 | 数据库查询优化 | 为高频查询字段添加索引；限制分页最大每页数量；文章列表不返回完整内容字段 | 接口响应时间稳定 |
| 5.7 | 静态资源与 API 分离部署 | 前端部署在 Vercel/Netlify，后端单独部署在云服务器；或使用反向代理将 API 挂载在子路径 | 前后端独立可扩展 |
| 5.8 | 错误处理与日志 | 全局错误处理中间件，避免堆栈泄漏；使用 `morgan` 记录请求日志 | 生产环境出错不暴露敏感信息 |

---

## 阶段六：测试与部署

**目标**：进行功能测试，将项目部署到生产环境。

| 任务编号 | 任务名称 | 详细说明 | 验收标准 |
| ------- | ------- | ------- | ------- |
| 6.1 | API 手动测试 | 使用 Postman 测试所有接口，包括权限边界 | 响应符合预期 |
| 6.2 | 前端流程测试 | 注册 → 登录 → 发表文章 → 评论 → 删除，完整跑通 | 无控制台错误，流程闭环 |
| 6.3 | 部署脚本编写 | 使用 `pm2` 管理 Node 进程；编写 `ecosystem.config.js` | 服务器重启后自动启动 |
| 6.4 | 数据库备份策略 | 设置定时任务 `mysqldump` 或使用云数据库自动备份 | 可恢复数据 |
| 6.5 | 域名与 HTTPS | 配置 Nginx 反向代理，申请 Let's Encrypt 免费证书 | 访问时显示安全锁标志 |

---

### 执行顺序建议

- **阶段一** 必须在所有任务之前完成，提供数据基础。
- **阶段二** 和 **阶段三** 可部分并行，但用户 API 必须先于前端集成。
- **阶段四** 依赖阶段二的 Token 鉴权和阶段三的文章 API。
- **阶段五** 可在阶段三之后穿插进行，不影响主流程。
- **阶段六** 作为最后收尾。

### 附录

#### 数据库表创建脚本

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    profile_picture VARCHAR(500) DEFAULT NULL,   -- 头像图片URL
    bio TEXT DEFAULT NULL,                       -- 个人简介
    role ENUM('admin', 'user', 'guest') NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,          -- Markdown 内容
    status ENUM('published', 'draft') NOT NULL DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tech_stack VARCHAR(255) DEFAULT NULL,  -- 逗号分隔的技术栈，如 "React,Node.js"
    github_url VARCHAR(500) DEFAULT NULL,
    live_url VARCHAR(500) DEFAULT NULL,    -- 在线演示地址（可选）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 安全问题

##### 严重 (P0 — 需立即修复)

| 编号 | 漏洞 | 影响 |
| --- | --- | --- |
| CRITICAL-1 | app.js:74 — express.static(..) | 暴露整个项目根目录 .env 、数据库密码、JWT密钥可通过 URL 直接访问 |

##### 高危 (P0-P1)

编号 漏洞 影响
HIGH-1 marked.parse() 输出直接插入 innerHTML ，无 HTML 消毒 存储型 XSS，攻击者可执行任意 JS
HIGH-2 JWT 存储在 localStorage 配合 XSS 可窃取 Token，账户接管
HIGH-3 CSP 含 'unsafe-inline' XSS 防御形同虚设

##### 中危 (P1-P2)

编号 漏洞 影响 MEDIUM-1 文件上传仅校验 MIME+扩展名，未验证魔术字节 可绕过上传恶意文件 MEDIUM-2 验证码用 Math.random() 生成，非密码学安全 可预测验证码绕过注册 MEDIUM-3 JWT 有效期 7 天 + 无吊销机制 Token 泄露后长期有效 MEDIUM-4 CDN 脚本无版本锁定、无 SRI 校验 供应链攻击风险

##### 低危 (P3)

编号 漏洞 LOW-1 评论内容无长度限制（可填 64KB 垃圾） LOW-2 标签数量/长度无限制 LOW-3 Profile 更新 SQL 动态拼接字段名（白名单不严谨）
