import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteCSPPlugin } from './scripts/vite-csp-plugin'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    viteCSPPlugin({
      environment: process.env.DEPLOYMENT_ENV || process.env.NODE_ENV || 'development',
      generateReport: true,
      reportPath: 'csp-report.md'
    })
  ],
})
