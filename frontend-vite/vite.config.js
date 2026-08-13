import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'kv-music',
                short_name: 'kv-music',
                description: 'kv-music - Stream the world\'s music: popular tracks, mixes and charts.',
                theme_color: '#111111',
                background_color: '#111111',
                display: 'standalone',
                scope: '/',
                start_url: '/',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ],
                shortcuts: [
                    {
                        name: 'Tìm kiếm',
                        url: '/search',
                        icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'Thư viện',
                        url: '/library',
                        icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
                    },
                    {
                        name: 'BXH',
                        url: '/charts',
                        icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
                    }
                ]
            }
        })
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
});
