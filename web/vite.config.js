import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow /tokens route to resolve — SPA fallback
    historyApiFallback: true,
  },
})
