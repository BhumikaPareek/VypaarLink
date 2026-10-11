import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      // Allows importing with '@/components/...' instead of relative paths
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 5173,
    // Proxy API requests to the backend during development
    // This avoids CORS issues in dev and mirrors the production setup
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
