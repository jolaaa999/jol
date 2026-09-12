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
│   └── jol_博客数据表.xlsx   # 数据表设计（对齐 AgentScope 格式）
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

```bash
vercel
```

在 Vercel 项目 Settings → Environment Variables 填入 `MYSQL_DSN` 与 `ADMIN_TOKEN`。云服务器上的 MySQL 需允许 Vercel 出口 IP 访问，或改用可公网访问的托管 MySQL。

Root Directory 保持仓库根目录（不要设成 `frontend/`），以便同时识别 `api` 符号链接与 `frontend/dist`。
