import { Track, StaticPlaylist } from '../types';
import { GENERATED_CONTENT } from '../data/seed_data';

const API_BASE = '/api';

const apiFetch = async (path: string) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for real crawling

        try {
            const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return null;
            return res.json();
        } catch (e) {
            clearTimeout(timeoutId);
            return null;
        }
    } catch {
        return null;
    }

};

export const libraryService = {
    async search(query: string): Promise<Track[]> {
        const data = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
        if (data?.tracks && data.tracks.length > 0) {
            return data.tracks;
        }
        return [];
    },

    async getBrowseContent(): Promise<Record<string, StaticPlaylist[]>> {
        // Return structured content from Seed Data
        // We simulate a "fetch" but it's instant

        const playlists = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Playlist');
        const albums = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Album');
        const artists = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Artist');

        return {
            'Top Playlists': playlists.slice(0, 100),
            'Top Albums': albums.slice(0, 100),
            'Popular Artists': artists.slice(0, 100)
        };
    },

    async getRecommendations(seed?: string): Promise<Track[]> {
        let query = 'Trending Music';

        if (seed) {
            // If a seed (artist or track title) is provided, use it for accurate recommendations
            // We search for the artist to get more tracks by them or similar context
            query = seed;

            // Optional: Mix it up occasionally to find "Radio" style results if the backend supports it,
            // but for accuracy, searching the artist is best.
            // We can also try "${seed} Mix" but that might return playlists, and we want tracks here.
            // Let's stick to the Artist name for high relevance.
        } else {
            // Fallback if no history: Generic Trending
            const qs = ['Global Top Hits', 'Viral Hits', 'Trending Music'];
            query = qs[Math.floor(Math.random() * qs.length)];
        }

        const tracks = await this.search(query);
        // Filter out strict duplicates if the API returns them?
        // For now, just return specific slice.
        return tracks.slice(0, 20);
    },

    async getPlaylist(id: string): Promise<StaticPlaylist | null> {
        // 1. Try to find in GENERATED_CONTENT first (Fast/Instant)
        // Extract base ID if needed or check directly?
        // Our seed data keys are "Name" but values have IDs "playlist-Name" or "album-Name".
        // We need to find by ID.
        const found = Object.values(GENERATED_CONTENT).find(p => p.id === id);

        if (found) {
            // Found metadata! Return it immediately.
            // If tracks are empty, we might want to lazy-load them via search?
            // Yes, let's fire off a search to fill tracks if empty.
            if (found.tracks.length === 0) {
                // Try to fetch tracks in background.
                // We use multiple fallbacks to ensure we get results.
                const queries = [
                    found.title, // Exact title
                    `${found.title} songs`, // Explicit songs
                    `${found.title} playlist`, // Might find mixes
                    "Vietnam Top Hits" // Ultimate fallback
                ];

                for (const q of queries) {
                    try {
                        console.log(`[Hydration] Searching: ${q}`);
                        const tracks = await this.search(q);
                        if (tracks.length > 0) {
                            console.log(`[Hydration] Found ${tracks.length} tracks for ${found.title}`);
                            found.tracks = tracks;
                            return { ...found, tracks };
                        }
                    } catch (e) {
                        console.error("Hydration search failed for", q, e);
                    }
                }
            }
            return found;
        }

        // 2. Fallback: Search by ID string parsing (Slow/Legacy)
        const query = id.replace('playlist-', '').replace(/-/g, ' ');
        const tracks = await this.search(query);
        if (tracks.length > 0) {
            return {
                id,
                title: query.charAt(0).toUpperCase() + query.slice(1),
                description: `${tracks.length} songs`,
                cover_url: tracks[0]?.cover_url,
                tracks,
                type: 'Playlist'
            };
        }
        return null;
    },

    async getAlbum(id: string): Promise<StaticPlaylist | null> {
        // Same logic for Album
        const found = Object.values(GENERATED_CONTENT).find(p => p.id === id);
        if (found) {
            if (found.tracks.length === 0) {
                const query = `${found.title} ${found.creator}`; // Album + Artist
                try {
                    const tracks = await this.search(query);
                    if (tracks.length > 0) {
                        found.tracks = tracks;
                        return { ...found, tracks };
                    }
                } catch (e) { }
            }
            return found;
        }

        const query = id.replace('album-', '').replace(/-/g, ' ');
        const tracks = await this.search(query);
        if (tracks.length > 0) {
            return {
                id,
                title: query,
                description: 'Album',
                cover_url: tracks[0]?.cover_url,
                tracks,
                type: 'Album'
            };
        }
        return null;
    },

    async getArtistInfo(artistName: string): Promise<{ bio?: string; photo?: string }> {
        // Try specific API for image
        try {
            const res = await apiFetch(`/artist-image?q=${encodeURIComponent(artistName)}`);
            if (res && res.url) {
                return { photo: res.url };
            }
        } catch (e) {
            // fall through
        }

        // Fallback to track cover
        try {
            const tracks = await this.search(artistName);
            if (tracks.length > 0 && tracks[0]?.cover_url) {
                return { photo: tracks[0].cover_url };
            }
        } catch (e) { }

        return { photo: getUnsplashImage(artistName) };
    },

    async getLyrics(track: string, artist: string): Promise<{ plainLyrics?: string; syncedLyrics?: string; } | null> {
        try {
            const res = await apiFetch(`/lyrics?track=${encodeURIComponent(track)}&artist=${encodeURIComponent(artist)}`);
            if (res && (res.plainLyrics || res.syncedLyrics)) {
                return res;
            }
            return null;
        } catch (e) {
            console.error("Failed to fetch lyrics", e);
            return null;
        }
    },

    async discoverContent(type: 'playlists' | 'albums' | 'artists' | 'all'): Promise<any[]> {
        // Random discovery queries
        const queries = ['V-Pop', 'Indie Vietnam', 'K-Pop', 'US-UK Top Hits', 'Lofi Chill', 'Rap Viet', 'Son Tung M-TP', 'Den Vau', 'Chillies', 'Ngot'];
        const randomQuery = queries[Math.floor(Math.random() * queries.length)];

        try {
            const tracks = await this.search(randomQuery);
            if (!tracks || tracks.length === 0) return [];

            const results: any[] = [];
            const seen = new Set();

            if (type === 'albums' || type === 'all') {
                tracks.forEach(t => {
                    if (t.album && !seen.has(`album-${t.album}`)) {
                        seen.add(`album-${t.album}`);
                        results.push({
                            id: `discovery-album-${Math.random().toString(36).substr(2, 9)}`,
                            title: t.album,
                            creator: t.artist,
                            cover_url: t.cover_url,
                            type: 'Album'
                        });
                    }
                });
            }

            if (type === 'artists' || type === 'all') {
                tracks.forEach(t => {
                    if (t.artist && !seen.has(`artist-${t.artist}`)) {
                        seen.add(`artist-${t.artist}`);
                        results.push({
                            id: `discovery-artist-${Math.random().toString(36).substr(2, 9)}`,
                            title: t.artist,
                            creator: 'Artist',
                            cover_url: t.cover_url, // Ideally fetch artist image, but track cover is okay fallback
                            type: 'Artist'
                        });
                    }
                });
            }

            if (type === 'playlists' || type === 'all') {
                // Generate some "Mix" playlists from the tracks
                if (tracks.length > 5) {
                    results.push({
                        id: `discovery-playlist-${Math.random().toString(36).substr(2, 9)}`,
                        title: `${randomQuery} Mix`,
                        creator: 'Spotify Clone',
                        cover_url: tracks[0].cover_url,
                        type: 'Playlist'
                    });
                }
            }

            // Shuffle and return
            return results.sort(() => 0.5 - Math.random()).slice(0, 10);

        } catch (e) {
            console.error("Discovery failed", e);
            return [];
        }
    }
};

// Pool of high-quality artist/music abstract images
const ARTIST_IMAGES = [
    "photo-1511671782779-c97d3d27a1d4", // Microphone
    "photo-1493225255756-d9584f8606e9", // Vinyl
    "photo-1514525253440-b393452e8d26", // Neon
    "photo-1470225620780-dba8ba36b745", // DJ
    "photo-1511379938547-c1f69419868d", // Piano
    "photo-1501612780327-45045538702b", // Guitar
    "photo-1459749411177-287ce327a395", // Concert
    "photo-1510915362694-bdddb0292f2d", // Stage
    "photo-1544785135-3ef2b2b1fb28", // Singer
    "photo-1460723237483-7a6dc9d0b212", // Band
];

function getUnsplashImage(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % ARTIST_IMAGES.length;
    return `https://images.unsplash.com/${ARTIST_IMAGES[index]}?w=400&h=400&fit=crop&q=80`;
}
