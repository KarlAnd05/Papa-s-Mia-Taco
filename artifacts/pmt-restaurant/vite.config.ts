import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: true,
    // Local development: forward API calls to the API server (on Replit the router does this)
    proxy: {
      '/api': `http://localhost:${process.env.API_PORT ?? 8080}`,
    },
  },
  build: {
    outDir: 'dist/public',
  },
})
