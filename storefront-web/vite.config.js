import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite's `base` must match the reverse-proxy mount point (/store/).
// Stripe publishable key is injected at build time via VITE_STRIPE_PUBLISHABLE_KEY.
export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '')
  return {
    base: '/store/',
    plugins: [react()],
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  }
})
