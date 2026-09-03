import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/users':    { target: 'http://localhost:8081', changeOrigin: true, rewrite: p => p.replace(/^\/api\/users/, '/api/users') },
      '/api/products': { target: 'http://localhost:8082', changeOrigin: true },
      '/api/orders':   { target: 'http://localhost:8083', changeOrigin: true },
      '/api/cart':     { target: 'http://localhost:8083', changeOrigin: true },
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
