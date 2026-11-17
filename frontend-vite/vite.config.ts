import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            // 'prompt' shows the in-app "update available" banner so users
            // always reach the latest build (a cache-first SW otherwise keeps
            // serving the old bundle and the app looks "stuck on an old
            // version" after every release).
            registerType: 'prompt',
            includeAssets: [
                'favicon.ico',
                'favicon.svg',
                'icon.svg',
                'icon-maskable.svg',
                'apple-touch-icon.png',
                'mask-icon.svg',
                'og-image.png',
            ],
            workbox: {
                navigateFallbackDenylist: [/^\/api\//],
            },
            manifest: {
                id: '/',
                name: 'KV Music — Hi-Res Music Streaming & Synced Lyrics',
                short_name: 'KV Music',
                description: 'Self-hosted Hi-Res music streaming, Top 50 charts, synced realtime lyrics, and background lock-screen playback.',
                theme_color: '#121212',
                background_color: '#121212',
                display: 'standalone',
                display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
                scope: '/',
                start_url: '/',
                orientation: 'any',
                categories: ['music', 'entertainment', 'multimedia'],
                prefer_related_applications: false,
                icons: [
                    {
                        src: '/icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/logo.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                    {
                        src: '/icon-maskable.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'maskable',
                    },
                    {
                        src: '/icons/icon-72x72.png',
                        sizes: '72x72',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-96x96.png',
                        sizes: '96x96',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-128x128.png',
                        sizes: '128x128',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-144x144.png',
                        sizes: '144x144',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-152x152.png',
                        sizes: '152x152',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/apple-touch-icon.png',
                        sizes: '180x180',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-maskable-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: '/pwa-maskable-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: '/icons/icon-256x256.png',
                        sizes: '256x256',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-384x384.png',
                        sizes: '384x384',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/icon-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                    {
                        src: '/pwa-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
                shortcuts: [
                    {
                        name: 'Discover',
                        short_name: 'Home',
                        description: 'Discover trending tracks and mixes',
                        url: '/',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
                    },
                    {
                        name: 'Top Charts',
                        short_name: 'Charts',
                        description: 'Stream the Top 50 Weekly Charts',
                        url: '/charts',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
                    },
                    {
                        name: 'Music Feed',
                        short_name: 'Feed',
                        description: 'Browse your personalized music feed',
                        url: '/feed',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
                    },
                    {
                        name: 'Your Library',
                        short_name: 'Library',
                        description: 'Open saved playlists, artists & likes',
                        url: '/library',
                        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: true, // Needed for PWA testing on network
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            }
        },
        allowedHosts: true, // Allow ngrok tunneling
    }
})
