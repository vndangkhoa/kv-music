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
            // Normalize track IDs - extract YouTube video ID from discovery-* IDs
            return data.tracks.map((track: Track) => {
                let videoId = track.id;
                if (track.id.includes('discovery-') || track.id.includes('artist-') || track.id.includes('album-')) {
                    const parts = track.id.split('-');
                    for (const part of parts) {
                        if (part.length === 11 && /^[a-zA-Z0-9_-]+$/.test(part)) {
                            videoId = part;
                            break;
                        }
                    }
                }
                return { ...track, id: videoId, url: `/api/stream/${videoId}` };
            });
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

    async getRelatedContent(seed: string, seedType: string = 'track', limit: number = 10): Promise<{
        tracks: Track[],
        albums: Array<{ id: string, title: string, artist: string, cover_url: string }>,
        playlists: Array<{ id: string, title: string, cover_url: string, track_count: number }>,
        artists: Array<{ id: string, name: string, photo_url: string }>
    }> {
        try {
            const data = await apiFetch(`/recommendations?seed=${encodeURIComponent(seed)}&seed_type=${seedType}&limit=${limit}`);
            if (data) {
                return {
                    tracks: data.tracks || [],
                    albums: data.albums || [],
                    playlists: data.playlists || [],
                    artists: data.artists || []
                };
            }
        } catch (e) {
            console.error('Failed to get related content:', e);
        }

        // Fallback to search-based recommendations
        const fallbackTracks = await this.search(seed);
        return {
            tracks: fallbackTracks.slice(0, limit),
            albums: [],
            playlists: [],
            artists: []
        };
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
        // Method 1: Try backend API for real YouTube channel photo
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const res = await fetch(`/api/artist/info?q=${encodeURIComponent(artistName)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                console.log(`[ArtistInfo] ${artistName}:`, data);
                if (data.image) {
                    return { photo: data.image };
                }
            }
        } catch (e) {
            console.error(`[ArtistInfo] Error for ${artistName}:`, e);
            // Fall through to next method
        }

        // Method 2: Use UI-Avatars API (instant, always works)
        // Using smaller size (128) for faster loading
        const encodedName = encodeURIComponent(artistName);
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128&rounded=true&bold=true&font-size=0.33`;
        return { photo: avatarUrl };
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
