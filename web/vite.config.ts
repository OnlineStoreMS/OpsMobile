import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const proxy: Record<string, object> = {
  '/iam': {
    target: 'http://localhost:8091',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/iam/, '/api/v1'),
  },
  '/apps/order/api': {
    target: 'http://localhost:8098',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/order\/api/, '/api'),
  },
  '/apps/self/api': {
    target: 'http://localhost:8103',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/self\/api/, '/api'),
  },
  '/apps/shipping/api': {
    target: 'http://localhost:8096',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/shipping\/api/, '/api'),
  },
  '/apps/warehouse/api': {
    target: 'http://localhost:8095',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/warehouse\/api/, '/api'),
  },
  '/apps/supply/api': {
    target: 'http://localhost:8092',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/supply\/api/, '/api'),
  },
  '/apps/material/api': {
    target: 'http://localhost:8101',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/material\/api/, '/api'),
  },
  '/apps/todo/api': {
    target: 'http://localhost:8102',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/apps\/todo\/api/, '/api'),
  },
}

export default defineConfig({
  base: process.env.VITE_BASE || '/apps/ops-m/',
  plugins: [
    vue(),
    {
      name: 'runtime-config-first',
      transformIndexHtml(html) {
        const baseUrl = process.env.VITE_BASE || '/apps/ops-m/'
        const tag = `<script src="${baseUrl}runtime-config.js"></script>`
        const cleaned = html.replace(/\s*<script src=["'][^"']*runtime-config\.js["']><\/script>/g, '')
        if (cleaned.includes('<head>')) {
          return cleaned.replace('<head>', `<head>\n    ${tag}`)
        }
        return `${tag}\n${cleaned}`
      },
    },
  ],
  server: { port: 5190, proxy },
})
