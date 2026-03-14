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
        // Fetch dynamic preloaded content from backend
        try {
            const data = await apiFetch('/browse');
            if (data && Object.keys(data).length > 0) {
                return data;
            }
        } catch (e) {
            console.error("Failed to load dynamic browse content", e);
        }

        // Fallback to mock data if discover returns empty (e.g. backend offline or still loading)
        const playlists = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Playlist');
        const albums = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Album');
        const artists = Object.values(GENERATED_CONTENT).filter(p => p.type === 'Artist');
        return {
            'Top Playlists': playlists.slice(0, 50),
            'Top Albums': albums.slice(0, 50),
            'Popular Artists': artists.slice(0, 50)
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
        const found = Object.values(GENERATED_CONTENT).find(p => p.id === id);

        if (found) {
            if (found.tracks.length === 0) {
                const queries = [
                    found.title,
                    `${found.title} songs`,
                    `${found.title} playlist`,
                    "Vietnam Top Hits"
                ];

                for (const q of queries) {
                    try {
                        const tracks = await this.search(q);
                        if (tracks.length > 0) {
                            found.tracks = tracks;
                            return { ...found, tracks };
                        }
                    } catch (e) {
                    }
                }
            }
            return found;
        }

        // 2. Try to find in dynamic backend browse cache
        try {
            const browseData = await apiFetch('/browse');
            for (const category in browseData) {
                const plist = browseData[category].find((p: any) => p.id === id);
                if (plist) {
                    if (!plist.tracks || plist.tracks.length === 0) {
                        try {
                            const tracks = await this.search(`${plist.title} playlist`);
                            plist.tracks = tracks.length > 0 ? tracks : await this.search(plist.title);
                            return { ...plist, tracks: plist.tracks };
                        } catch (e) { }
                    }
                    return plist;
                }
            }
        } catch (e) {
            console.error("Browse cache lookup failed", e);
        }

        // 3. Fallback: Search by ID string parsing (Slow/Legacy)
        const cleanId = id.replace(/^discovery-(playlist|album|artist)-/, '');
        const query = cleanId.replace(/-/g, ' ');
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

        try {
            const browseData = await apiFetch('/browse');
            for (const category in browseData) {
                const plist = browseData[category].find((p: any) => p.id === id);
                if (plist) {
                    if (!plist.tracks || plist.tracks.length === 0) {
                        try {
                            const tracks = await this.search(`${plist.title} album`);
                            plist.tracks = tracks.length > 0 ? tracks : await this.search(plist.title);
                            return { ...plist, tracks: plist.tracks };
                        } catch (e) { }
                    }
                    return plist;
                }
            }
        } catch (e) { }

        const cleanId = id.replace(/^discovery-(playlist|album|artist)-/, '');
        const query = cleanId.replace(/-/g, ' ');
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
            const res = await apiFetch(`/artist/info?q=${encodeURIComponent(artistName)}`);
            if (res && res.image) {
                return { photo: res.image };
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
                            id: `discovery-album-${t.album.replace(/\s+/g, '-')}`,
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
                            id: `discovery-artist-${t.artist.replace(/\s+/g, '-')}`,
                            title: t.artist,
                            creator: 'Artist',
                            cover_url: t.cover_url,
                            type: 'Artist'
                        });
                    }
                });
            }

            if (type === 'playlists' || type === 'all') {
                if (tracks.length > 5) {
                    results.push({
                        id: `discovery-playlist-${randomQuery.replace(/\s+/g, '-')}-Mix`,
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

// Dynamic Placeholders for artists/covers without an image
function getUnsplashImage(seed: string): string {
    const initials = seed.substring(0, 2).toUpperCase();
    const colors = ["1DB954", "FF6B6B", "4ECDC4", "45B7D1", "6C5CE7", "FDCB6E"];

    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];

    return `https://placehold.co/400x400/${color}/FFFFFF?text=${encodeURIComponent(initials)}`;
}
