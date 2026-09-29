# jol

个人博客 — Vue 3 + Go (Vercel Serverless) 同源部署。

## Tech Stack

- **Frontend**: Vue 3 (Composition API) · TypeScript · Vite · TailwindCSS · GSAP · Canvas
- **Backend**: Go Serverless Functions (`backend/api`)
- **Database**: MySQL（文章读写；未配置时 GET 回退 mock）
- **Deploy**: Vercel

## 仓库结构

```
jol/
├── frontend/          # Vue 前端
│   ├── src/
│   ├── public/
│   ├── scripts/
│   └── package.json
├── backend/           # Go 后端
│   ├── api/           # Vercel Serverless 入口
│   ├── sql/           # MySQL schema
│   └── go.mod
├── docs/              # 文档
│   ├── README.md
│   ├── jol_博客数据表.xlsx      # 数据表设计（对齐 AgentScope 格式）
│   └── jol_Chen_ER.drawio      # 陈氏 E-R 图（实体·属性·联系）
├── api -> backend/api # 符号链接，供 Vercel 识别 /api
├── package.json       # 根脚本转发到 frontend
└── vercel.json
```

## 开发

```bash
# 在仓库根目录
npm run install:frontend
npm run dev
```

前端默认运行在 `http://localhost:5173`。Go API 可通过 `/api/health`、`/api/posts`、`/api/poetry` 访问（本地需在根目录执行 `vercel dev`）。

## MySQL 文章库

1. 安装 MySQL，导入结构与种子数据：

```bash
mysql -u root -p < backend/sql/schema.sql
```

2. 在根目录 `.env` / Vercel Environment Variables 配置：

```bash
MYSQL_DSN=user:password@tcp(127.0.0.1:3306)/jol?parseTime=true&charset=utf8mb4&loc=UTC
ADMIN_TOKEN=换成足够长的随机口令
```

3. 发文后台：打开 `/blog/admin`，填入与 `ADMIN_TOKEN` 相同的口令即可发布。

API：

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/posts` | 有感列表 |
| GET | `/api/posts?id=` | 单篇 |
| POST | `/api/posts` | 新建（Bearer） |
| PUT | `/api/posts?id=` | 更新（Bearer） |
| DELETE | `/api/posts?id=` | 删除（Bearer） |

未配置 `MYSQL_DSN` 时，列表/详情仍返回内置 mock，写接口返回 503。

## 部署

项目支持**双目标部署**，共用同一份代码，由构建期环境变量 `VITE_BASE` 区分基线路径。

### Vercel（完整功能：前端 + Go API）

```bash
vercel
```

在 Vercel 项目 Settings → Environment Variables 填入 `MYSQL_DSN` 与 `ADMIN_TOKEN`。云服务器上的 MySQL 需允许 Vercel 出口 IP 访问，或改用可公网访问的托管 MySQL。

Root Directory 保持仓库根目录（不要设成 `frontend/`），以便同时识别 `api` 符号链接与 `frontend/dist`。

Vercel 为根路径部署，无需设置 `VITE_BASE`（默认 `/`）。

### GitHub Pages（纯前端静态站）

访问地址：<https://jolaaa999.github.io/jol/>

工作流 `.github/workflows/deploy-pages.yml` 在 `main` 分支推送 `frontend/**` 时自动构建发布，构建期注入 `VITE_BASE=/<repo>/`。

**首次启用需手动操作一次**：仓库 Settings → Pages → Source 选择 **GitHub Actions**。

#### Pages 功能边界（重要）

GitHub Pages 只托管静态文件，**不提供任何服务端运行时**，因此以下依赖 Go API 的功能在该部署中不可用：

| 功能 | Pages 表现 | 原因 |
|------|-----------|------|
| 博客文章正文 | 回退到内置本地数据 | 文章存于 MySQL，经 Go Serverless 读取 |
| `/blog/admin` 后台发文 | 不可用 | 无后端，写接口返回 503 |
| `/api/rss` | 不可用 | 无后端 |
| Newsletter 订阅 | 不可用 | 无后端 |
| 作品集 Works | 正常 | 浏览器直连 `api.github.com` 公开接口 |
| 诗词解锁 / 动效 / 主题 | 正常 | 纯前端 |

前端已内置降级处理（`useBlogEntries` 捕获异常后回退 `FALLBACK_ENTRIES`），因此 Pages 上页面不会报错，只是文章列表为本地兜底内容。**如需完整博客功能，请使用 Vercel 部署。**

### 子路径适配

`vite.config.ts` 读取 `process.env.VITE_BASE`（默认 `'/'`）作为 `base`，该值同时被 Vite 注入为 `import.meta.env.BASE_URL`，供路由与资源引用复用：

- `src/router/index.ts` 使用 `createWebHistory(import.meta.env.BASE_URL)`
- `index.html` 中静态资源通过 `%BASE_URL%` 占位符引用
- `public/404.html` 提供 SPA 深链兜底（Pages 对未知路径返回真实 404，不像 Vercel 有 `rewrites`），按自身脚本 URL 推断前缀，仅在 Pages 生效

本地验证子路径构建：

```bash
cd frontend
VITE_BASE=/jol/ npm run build   # Windows PowerShell: $env:VITE_BASE='/jol/'; npm run build
```
