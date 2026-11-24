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
    // Binds 127.0.0.1 by default; `npm run dev:box` binds 0.0.0.0 for the
    // dev box, which serves it at https://ehrbase-explorer.dev.lokalhost.one.
    port: 9001,
    strictPort: true,
    allowedHosts: ['ehrbase-explorer.dev.lokalhost.one'],
    // The dev box (gVisor) gets no file-change events for edits made from the
    // host through the bind mount, so `dev:box` polls instead.
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      '/ehrbase': { target: ehrbaseUrl, changeOrigin: true },
    },
  },
})
