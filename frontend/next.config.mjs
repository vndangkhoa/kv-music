/** @type {import('next').NextConfig} */
const nextConfig = {
    // strict mode true is default but good to be explicit
    // strict mode true is default but good to be explicit
    reactStrictMode: true,
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    async rewrites() {
        return [
            // Backend API Proxies (Specific, so we don't block NextAuth at /api/auth)
            { source: '/api/browse/:path*', destination: 'http://127.0.0.1:8000/api/browse/:path*' },
            { source: '/api/playlists/:path*', destination: 'http://127.0.0.1:8000/api/playlists/:path*' },
            { source: '/api/search', destination: 'http://127.0.0.1:8000/api/search' },
            { source: '/api/search/:path*', destination: 'http://127.0.0.1:8000/api/search/:path*' },
            { source: '/api/artist/:path*', destination: 'http://127.0.0.1:8000/api/artist/:path*' },
            { source: '/api/stream/:path*', destination: 'http://127.0.0.1:8000/api/stream/:path*' },
            { source: '/api/download/:path*', destination: 'http://127.0.0.1:8000/api/download/:path*' },
            { source: '/api/download-status/:path*', destination: 'http://127.0.0.1:8000/api/download-status/:path*' },
            { source: '/api/lyrics/:path*', destination: 'http://127.0.0.1:8000/api/lyrics/:path*' },
            { source: '/api/trending/:path*', destination: 'http://127.0.0.1:8000/api/trending/:path*' },
            { source: '/api/recommendations/:path*', destination: 'http://127.0.0.1:8000/api/recommendations/:path*' },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.ytimg.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'misc.scdn.co',
            },
        ],
    },
};

export default nextConfig;
