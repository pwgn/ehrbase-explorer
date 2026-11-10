import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// EHRbase from cdr/compose.yaml. Proxying keeps the browser on one
// origin, so EHRbase needs no CORS config.
const ehrbaseUrl = process.env.EHRBASE_URL ?? 'http://localhost:8081'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/ehrbase': { target: ehrbaseUrl, changeOrigin: true },
    },
  },
})
