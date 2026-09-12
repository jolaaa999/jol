# jol

个人博客 — Vue 3 + Go (Vercel Serverless) 同源部署。

## Tech Stack

- **Frontend**: Vue 3 (Composition API) · TypeScript · Vite · TailwindCSS · GSAP · Canvas
- **Backend**: Go Serverless Functions (`/api`)
- **Database**: MySQL（文章读写；未配置时 GET 回退 mock）
- **Deploy**: Vercel

## 开发

```bash
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。Go API 可通过 `/api/health`、`/api/posts`、`/api/poetry` 访问（本地需 `vercel dev`）。

## MySQL 文章库

1. 安装 MySQL，导入结构与种子数据：

```bash
mysql -u root -p < sql/schema.sql
```

2. 在 `.env` / Vercel Environment Variables 配置：

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

## 项目结构

```
src/
├── composables/       # 逻辑 Hook（物理引擎、风场、GSAP 导航）
├── components/        # UI 组件
├── styles/            # CSS Variables + Tailwind
└── views/             # 页面
api/
├── posts/index.go     # GET/POST/PUT/DELETE /api/posts
├── poetry/index.go    # GET /api/poetry → 诗文
├── health/index.go    # GET /api/health
└── _lib/              # 共享库（MySQL、鉴权、文章仓储）
sql/
└── schema.sql         # MySQL 表结构 + 种子数据
```

## 部署

```bash
vercel
```

在 Vercel 项目 Settings → Environment Variables 填入 `MYSQL_DSN` 与 `ADMIN_TOKEN`。云服务器上的 MySQL 需允许 Vercel 出口 IP 访问，或改用可公网访问的托管 MySQL。
