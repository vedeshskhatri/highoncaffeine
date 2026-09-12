import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname || '.', './src'),
    },
  },
  server: {
    // Allow /tokens route to resolve — SPA fallback
    historyApiFallback: true,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/simulate': 'http://127.0.0.1:8000',
      '/optimize': 'http://127.0.0.1:8000',
      '/what-if': 'http://127.0.0.1:8000',
      '/compare': 'http://127.0.0.1:8000',
      '/annual_scan': 'http://127.0.0.1:8000',
      '/forecast_watch': 'http://127.0.0.1:8000',
      '/materials': 'http://127.0.0.1:8000',
      '/validation': 'http://127.0.0.1:8000',
      '/datasets': 'http://127.0.0.1:8000',
      '/provenance': 'http://127.0.0.1:8000',
      '/engineering_report': 'http://127.0.0.1:8000',
      '/estate': 'http://127.0.0.1:8000',
      '/sites': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/programme': 'http://127.0.0.1:8000',
      '/forecast': 'http://127.0.0.1:8000',
      '/designs': 'http://127.0.0.1:8000',
      '/suggest-materials': 'http://127.0.0.1:8000',
      '/location': 'http://127.0.0.1:8000',
      '/surrogate': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/docs': 'http://127.0.0.1:8000',
      '/openapi.json': 'http://127.0.0.1:8000',
    },
  },
  optimizeDeps: {
    include: ['ogl', 'three'],
  },
})
