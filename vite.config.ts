import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // server: {
  //   https: {
  //     key: fs.readFileSync('./localhost+3-key.pem'),
  //     cert: fs.readFileSync('./localhost+3.pem'),
  //   },
  //   host: '0.0.0.0',  // 允许局域网访问
  //   port: 5173,
  // },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
