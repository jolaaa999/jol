# jol

个人博客 — Vue 3 + Go (Vercel Serverless) 同源部署。

## Tech Stack

- **Frontend**: Vue 3 (Composition API) · TypeScript · Vite · TailwindCSS · GSAP · Canvas
- **Backend**: Go Serverless Functions (`/api`)
- **Deploy**: Vercel

## 开发

```bash
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`。Go API 可通过 `/api/health`、`/api/posts`、`/api/poetry` 访问（本地需 `vercel dev`）。

## 项目结构

```
src/
├── composables/       # 逻辑 Hook（物理引擎、风场、GSAP 导航）
├── components/        # UI 组件
├── styles/            # CSS Variables + Tailwind
└── views/             # 页面
api/
├── posts/index.go     # GET /api/posts  → 有感
├── poetry/index.go    # GET /api/poetry → 诗文
├── health/index.go    # GET /api/health
└── _lib/              # 共享类型与 Mock 数据（_ 前缀，非端点）
```

## 部署

```bash
vercel
```
