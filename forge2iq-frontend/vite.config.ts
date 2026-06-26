import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const API_TARGET = 'http://localhost:8080'

function spaBypass(req: { headers: Record<string, string | string[] | undefined> }) {
  if (req.headers.accept?.toString().includes('text/html')) return '/index.html'
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Forge2IQ — Manufacturing OS',
        short_name: 'Forge2IQ',
        description: 'Manufacturing Production Intelligence',
        theme_color: '#0F172A',
        background_color: '#F1F5F9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:8080\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api':           { target: API_TARGET, changeOrigin: true },
      '/auth':          { target: API_TARGET, changeOrigin: true },
      '/work-orders':   { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/printing':      { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/shift-entries': { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/dispatch':      { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/production':    { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/shift-reports': { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/downtime':      { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/users':         { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/dashboard':     { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/messages':           { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/sheet-receipts':     { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/customer-orders':    { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/printing-shift-logs':  { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/printing-dispatches':  { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/production-reports':   { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/products':             { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
      '/audit-logs':           { target: API_TARGET, changeOrigin: true, bypass: spaBypass },
    },
  },
})
