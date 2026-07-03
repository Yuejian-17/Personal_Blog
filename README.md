# 书月舍 · 清歌

一个轻量、美观的个人博客系统，采用纯前端 + Node.js 后端架构。

## 项目结构

```shell
Personal_Blog/
├── index.html              # 前端入口页面
├── css/                    # 样式文件
├── js/                     # 前端脚本（路由、页面组件、工具类）
├── data/                   # 本地静态数据（文章、项目、音乐）
├── assets/                 # 静态资源（图片、音乐、头像）
├── fonts/                  # 自定义字体
├── server/                 # Node.js + Express + MySQL 后端 API
│   ├── routes/             # 业务路由
│   ├── middleware/         # 认证/权限中间件
│   ├── db.js               # 数据库连接池
│   ├── app.js              # 服务入口
│   └── seed.js             # 初始化管理员账号
├── scripts/                # 构建脚本
├── feed.xml                # RSS 订阅源
└── package.json            # 项目配置
```

## 功能特性

- **首页**：个人简介、文章推荐轮播、当前播放音乐、运行时间时钟
- **文章系统**：Markdown 渲染、标签、评论、搜索
- **项目展示**：链接到 GitHub，支持登录用户管理
- **音乐播放**：背景音乐、导入/管理音乐列表
- **背景管理**：背景图片自动轮播/手动切换
- **用户系统**：邮箱验证码注册、JWT 登录、个人资料修改
- **管理后台**：管理员管理用户、文章、项目

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | HTML5 / CSS3 / 原生 JavaScript（ES Modules） |
| 路由 | Navigo |
| 渲染 | Marked.js + DOMPurify |
| 后端 | Node.js + Express |
| 数据库 | MySQL 8.x（mysql2） |
| 认证 | JWT + bcrypt |
| 部署 | 静态文件由 Express 托管 |

## 快速开始

### 1. 环境要求

- Node.js 18+
- MySQL 8.x

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置环境变量

复制 `server/.env` 并修改为你的本地配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=MyBlog

# JWT 密钥
JWT_SECRET=your_random_jwt_secret

# QQ 邮箱 SMTP
SMTP_USER=your_qq@qq.com
SMTP_PASS=your_smtp_auth_code

# 管理员初始账号
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=YourAdminPass123
ADMIN_AVATAR=assets/images/Profile_Picture/Initial_0.jpg
ADMIN_BIO=博客管理员

# 服务端口
PORT=3000
```

### 4. 初始化数据库

在 MySQL 中执行 `server/init.sql` 创建数据库和表结构，然后执行：

```bash
cd server
node seed.js
```

用于初始化管理员账号。

### 5. 启动服务

```bash
cd server
npm start
```

前端默认通过 Express 静态托管访问：`http://localhost:3000`

## 开发说明

- 前端路由使用 hash 模式（`#/articles`、`#/project/1`）
- 文章、项目、音乐、评论、媒体均通过后端 API 持久化到 MySQL
- 登录用户才能看到编辑、删除、导入等管理入口
- 管理员拥有最高权限，可管理所有用户、文章、项目

## 安全提示

- `server/.env` 已加入 `.gitignore`，请勿将真实凭据提交到版本控制
- 生产环境请使用强密码和随机 JWT 密钥
- 建议开启 HTTPS 并配置合理的 CORS 白名单

## 许可证

本项目仅供个人学习与交流使用。
