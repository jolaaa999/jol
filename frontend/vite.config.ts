import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 部署基线路径（影响资源 URL 与 vue-router 的 BASE_URL）。
 * - Vercel：根路径部署，保持默认 `'/'`
 * - GitHub Pages：项目页位于子路径，构建期传入 `VITE_BASE=/jol/`
 * 同一份代码由环境变量区分，互不影响。
 */
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/gsap')) return 'gsap'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
