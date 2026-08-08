import { Track, StaticPlaylist } from '../types';
import { GENERATED_CONTENT } from '../data/seed_data';

const artistCoverMap = new Map<string, string>();
for (const entry of Object.values(GENERATED_CONTENT)) {
  if (entry.type === 'Artist' && entry.cover_url) {
    artistCoverMap.set(entry.title.toLowerCase(), entry.cover_url);
  }
}

export function getArtistCoverUrl(name: string): string | undefined {
  return artistCoverMap.get(name.toLowerCase()) || artistCoverMap.get(decodeURIComponent(name).toLowerCase());
}

function getUserCountry(): string {
    const cached = localStorage.getItem('user_country');
    if (cached && cached.length === 2) {
        return cached;
    }

    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) {
            if (tz.includes('Ho_Chi_Minh') || tz.includes('Saigon') || tz.includes('Hanoi')) {
                localStorage.setItem('user_country', 'VN');
                return 'VN';
            }
            if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Denver')) {
                localStorage.setItem('user_country', 'US');
                return 'US';
            }
            if (tz.includes('London') || tz.includes('Belfast') || tz.includes('Dublin')) {
                localStorage.setItem('user_country', 'GB');
                return 'GB';
            }
        }
    } catch (e) {}

    try {
        const lang = navigator.language || '';
        if (lang) {
            const parts = lang.split('-');
            const code = parts[parts.length - 1].toUpperCase();
            if (code.length === 2) {
                localStorage.setItem('user_country', code);
                return code;
            }
            if (parts[0] === 'vi') return 'VN';
            if (parts[0] === 'en') return 'US';
        }
    } catch (e) {}

    return 'VN';
}

// Extract YouTube video ID from a discovery-{type}-{slug}-{video_id} ID
function extractVideoIdFromDiscoveryId(id: string): string | null {
    const match = id.match(/discovery-(?:playlist|album|artist)-.*?-([a-zA-Z0-9_-]{11})$/);
    return match ? match[1] : null;
}

// Background geo-resolver
setTimeout(async () => {
    if (!localStorage.getItem('user_country_resolved')) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data && data.country_code) {
                localStorage.setItem('user_country', data.country_code);
                localStorage.setItem('user_country_resolved', 'true');
            }
        } catch (e) {}
    }
}, 4000);

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

const CACHE_KEY_INITIAL = 'initial_tracks_cache_v1';

async function preFetchAudio(tracks: Track[]) {
    for (const track of tracks.slice(0, 3)) {
        try {
            const audio = new Audio(`/api/stream/${track.id}`);
            audio.preload = 'auto';
        } catch {}
    }
}

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

    async getInitialTrendingTracks(): Promise<Track[]> {
        const cached = localStorage.getItem(CACHE_KEY_INITIAL);
        const cacheTime = localStorage.getItem(`${CACHE_KEY_INITIAL}_time`);
        
        // Use cache if less than 30 minutes old
        if (cached && cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age < 30 * 60 * 1000) {
                try {
                    const tracks = JSON.parse(cached) as Track[];
                    if (tracks.length > 0) {
                        return [...tracks].sort(() => Math.random() - 0.5);
                    }
                } catch {}
            }
        }

        const queries = [
            'vietnamese trending music',
            'V-Pop top hits',
            'Son Tung trending',
            'V-pop hits 2024',
            'Rap Viet trending',
            'Lofi Chill hits'
        ];
        // Pick 2-3 random queries for more variety
        const shuffledQueries = queries.sort(() => Math.random() - 0.5);
        const selectedQueries = shuffledQueries.slice(0, 2 + Math.floor(Math.random() * 2));
        
        let allTracks: Track[] = [];
        for (const query of selectedQueries) {
            const tracks = await this.search(query);
            allTracks = [...allTracks, ...tracks];
        }
        
        // Deduplicate by id
        const seen = new Set<string>();
        allTracks = allTracks.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });
        
        // Shuffle the combined results
        allTracks.sort(() => Math.random() - 0.5);

        if (allTracks.length > 0) {
            localStorage.setItem(CACHE_KEY_INITIAL, JSON.stringify(allTracks.slice(0, 30)));
            localStorage.setItem(`${CACHE_KEY_INITIAL}_time`, Date.now().toString());
            preFetchAudio(allTracks);
        }

        return allTracks;
    },

    async getBrowseContent(): Promise<Record<string, StaticPlaylist[]>> {
        // Fetch dynamic preloaded content from backend
        try {
            const country = getUserCountry();
            const data = await apiFetch(`/browse?country=${country}`);
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
            const country = getUserCountry();
            const browseData = await apiFetch(`/browse?country=${country}`);
            for (const category in browseData) {
                const plist = browseData[category].find((p: any) => p.id === id);
                if (plist) {
                    if (!plist.tracks || plist.tracks.length === 0) {
                        try {
                            const videoId = extractVideoIdFromDiscoveryId(id);
                            if (videoId) {
                                const tracks = await this.search(videoId);
                                if (tracks.length > 0) {
                                    plist.tracks = tracks;
                                    return { ...plist, tracks };
                                }
                            }
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
        // Try to extract video ID first
        const videoId = extractVideoIdFromDiscoveryId(id);
        if (videoId) {
            const tracks = await this.search(videoId);
            if (tracks.length > 0) {
                return {
                    id,
                    title: cleanId.replace(/-/g, ' ').replace(/(.{40}).*/, '$1...'),
                    description: `${tracks.length} songs`,
                    cover_url: tracks[0]?.cover_url,
                    tracks,
                    type: 'Playlist'
                };
            }
        }
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
            const country = getUserCountry();
            const browseData = await apiFetch(`/browse?country=${country}`);
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

    async getArtistInfo(artistName: string): Promise<{ bio?: string; photo?: string; isPlaceholder?: boolean }> {
        // Method 1: Try backend API for real YouTube channel photo (with short timeout)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout to allow yt-dlp to run
            
            const res = await fetch(`/api/artist/info?q=${encodeURIComponent(artistName)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                if (data.image && data.image !== '' && !data.image.includes('ui-avatars.com') && !data.image.includes('placehold.co')) {
                    console.log(`[ArtistInfo] Found real image for ${artistName}`);
                    return { photo: data.image, isPlaceholder: false };
                }
            }
        } catch (e) {
            // Silently fall through to fallback - this is expected behavior
            // console.log(`[ArtistInfo] Using fallback for ${artistName}`);
        }

        // Method 2: Use UI-Avatars API (instant, always works)
        // This is the primary fallback since the backend is often slow
        const encodedName = encodeURIComponent(artistName);
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128&rounded=true&bold=true&font-size=0.33`;
        return { photo: avatarUrl, isPlaceholder: true };
    },

async getLyrics(track: string, artist: string, videoId?: string): Promise<{ plainLyrics?: string; syncedLyrics?: string; } | null> {
        try {
            // More aggressive track name cleaning for better search results
            let cleanTrack = track
                .replace(/\(.*?\)/g, '') // Remove parentheses content
                .replace(/\[.*?\]/g, '') // Remove brackets content
                .replace(/ feat\..*/gi, '') // Remove "feat." and everything after
                .replace(/ ft\..*/gi, '') // Remove "ft." and everything after
                .replace(/ - lyrics video/gi, '') // Remove "lyrics video" suffix
                .replace(/ - official video/gi, '') // Remove "official video" suffix
                .replace(/ - official audio/gi, '') // Remove "official audio" suffix
                .replace(/ - mv/gi, '') // Remove "mv" suffix
                .replace(/ - audio/gi, '') // Remove "audio" suffix
                .replace(/ - video/gi, '') // Remove "video" suffix
                .replace(/ - lyric/gi, '') // Remove "lyric" suffix
                .replace(/ - live/gi, '') // Remove "live" suffix
                .replace(/ - acoustic/gi, '') // Remove "acoustic" suffix
                .replace(/ - cover/gi, '') // Remove "cover" suffix
                .replace(/ - remix/gi, '') // Remove "remix" suffix
                .replace(/ - ver\./gi, '') // Remove "ver." suffix
                .replace(/ - version/gi, '') // Remove "version" suffix
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
            // Split on | and take the first meaningful part (handles "TITLE | OFFICIAL VIDEO | ARTIST")
            const pipeParts = cleanTrack.split('|').map(s => s.trim()).filter(Boolean);
            if (pipeParts.length > 1) {
                cleanTrack = pipeParts[0];
            }
            
            const cleanArtist = artist
                .replace(/ \(.*?\)/g, '') // Remove parentheses content
                .replace(/ \[.*?\]/g, '') // Remove brackets content
                .replace(/ - official/gi, '') // Remove "official" suffix
                .replace(/ - topic/gi, '') // Remove "topic" suffix
                .replace(/\s+Official\s*$/gi, '') // Remove trailing " Official"
                .replace(/\s+VEVO\s*$/gi, '') // Remove trailing " VEVO"
                .replace(/\s+Topic\s*$/gi, '') // Remove trailing " Topic"
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            console.log(`Searching lyrics for: "${cleanTrack}" by "${cleanArtist}"`);

            // Helper function to try fetching lyrics from a URL with shorter timeout
            const tryFetch = async (url: string, parser: (data: any) => { plainLyrics?: string; syncedLyrics?: string } | null): Promise<{ plainLyrics?: string; syncedLyrics?: string } | null> => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per API
                    
                    const response = await fetch(url, { 
                        signal: controller.signal,
                        headers: { 'Accept': 'application/json' }
                    });
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        return parser(data);
                    }
                } catch (e) {
                    console.log(`API error for ${url}:`, e);
                }
                return null;
            };

            // 1. Try SimpMusic with video ID first (YouTube-based, best for Vietnamese)
            if (videoId) {
                console.log('Trying SimpMusic with video ID:', videoId);
                const simpmusicVideoResult = await tryFetch(
                    `https://api-lyrics.simpmusic.org/v1/${videoId}`,
                    (data) => {
                        if (data && data.type === 'success' && Array.isArray(data.data) && data.data.length > 0) {
                            const lyricsData = data.data[0];
                            const synced = lyricsData.syncedLyrics;
                            const plain = lyricsData.lyrics;
                            if (synced || plain) {
                                return { plainLyrics: plain || undefined, syncedLyrics: synced || undefined };
                            }
                        }
                        return null;
                    }
                );
                if (simpmusicVideoResult) {
                    console.log('Found lyrics from SimpMusic (video ID)');
                    return simpmusicVideoResult;
                }
            }

            // 2. Try LRCLIB for synced lyrics
            const lrclibResult = await tryFetch(
                `https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTrack)}`,
                (data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        const first = data[0];
                        return {
                            plainLyrics: first.plainLyrics || undefined,
                            syncedLyrics: first.syncedLyrics || undefined
                        };
                    }
                    return null;
                }
            );
            if (lrclibResult) {
                console.log('Found lyrics from LRCLIB');
                return lrclibResult;
            }

            // 3. Try SimpMusic search by title
            console.log('Trying SimpMusic search by title...');
            const simpmusicSearchResult = await tryFetch(
                `https://api-lyrics.simpmusic.org/v1/search/title?title=${encodeURIComponent(cleanTrack)}`,
                (data) => {
                    if (data && data.type === 'success' && Array.isArray(data.data) && data.data.length > 0) {
                        const first = data.data[0];
                        const synced = first.syncedLyrics;
                        const plain = first.lyrics;
                        if (synced || plain) {
                            return { plainLyrics: plain || undefined, syncedLyrics: synced || undefined };
                        }
                    }
                    return null;
                }
            );
            if (simpmusicSearchResult) {
                console.log('Found lyrics from SimpMusic search');
                return simpmusicSearchResult;
            }

            // 4. Try lyrics.ovh (plain lyrics, good for English)
            const lyricsOvhResult = await tryFetch(
                `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`,
                (data) => data.lyrics ? { plainLyrics: data.lyrics } : null
            );
            if (lyricsOvhResult) {
                console.log('Found lyrics from lyrics.ovh');
                return lyricsOvhResult;
            }

            // 5. Try LRCLIB get by name (alternative endpoint)
            console.log('Trying LRCLIB get-by-name...');
            const lrclibGetResult = await tryFetch(
                `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTrack)}`,
                (data) => {
                    if (data && (data.plainLyrics || data.syncedLyrics)) {
                        return { plainLyrics: data.plainLyrics || undefined, syncedLyrics: data.syncedLyrics || undefined };
                    }
                    return null;
                }
            );
            if (lrclibGetResult) {
                console.log('Found lyrics from LRCLIB get-by-name');
                return lrclibGetResult;
            }

            // 6. Try backend API (has ZingMP3 and other sources)
            if (videoId) {
                console.log('Trying backend /api/lyrics...');
                const backendResult = await tryFetch(
                    `/api/lyrics?track=${encodeURIComponent(cleanTrack)}&artist=${encodeURIComponent(cleanArtist)}&video_id=${videoId}`,
                    (data) => {
                        if (data && (data.plainLyrics || data.syncedLyrics)) {
                            return { plainLyrics: data.plainLyrics || undefined, syncedLyrics: data.syncedLyrics || undefined };
                        }
                        return null;
                    }
                );
                if (backendResult) {
                    console.log('Found lyrics from backend API');
                    return backendResult;
                }
            }

            console.log('No lyrics found from any API');
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
                        creator: 'KV Music',
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
    },

    async getCharts(chartType: string): Promise<Track[]> {
        const res = await apiFetch(`/charts?chart_type=${encodeURIComponent(chartType)}`);
        if (!res) return [];
        const data = res as { tracks?: Track[] };
        return (data.tracks || []).map(t => ({
            ...t,
            url: t.url && t.url.startsWith('/') ? t.url : `/api/stream/${t.id}`
        }));
    },

    async getNewReleases(region: 'vn' | 'us' = 'vn'): Promise<Track[]> {
        const res = await apiFetch(`/new-releases?region=${region}`);
        if (!res) return [];
        const data = res as { tracks?: Track[] };
        return (data.tracks || []).map(t => ({
            ...t,
            url: t.url && t.url.startsWith('/') ? t.url : `/api/stream/${t.id}`
        }));
    },

    async getArtists(region: 'vn' | 'us' | 'kr' | 'cn' = 'vn'): Promise<Array<{ id: string; name: string; photo?: string; region: string; rank: number; followers: string; topTrack: string }>> {
        const res = await apiFetch(`/artists?region=${region}`);
        const data = res as { artists?: Array<{ name: string; photo: string; followers: string }> } | null;
        const list = data?.artists || [];
        return list.map((art, index) => {
            const avatarUrl = art.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(art.name)}&background=00a8ff&color=fff&size=128&rounded=true&bold=true`;
            return {
                id: `artist-${art.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}`,
                name: art.name,
                photo: avatarUrl,
                region,
                rank: index + 1,
                followers: art.followers.replace(/\s*subscribers?/i, '').trim(),
                topTrack: ''
            };
        });
    },

    async getSmartSuggestions(history: Track[] = [], likedTracks: Track[] = []): Promise<{ tracks: Track[]; reason: string }> {
        const userArtists = new Set<string>();
        [...history, ...likedTracks].forEach(t => {
            if (t.artist) userArtists.add(t.artist);
        });

        let seedQueries = ['V-Pop 2024 hits', 'Son Tung M-TP', 'HIEUTHUHAI', 'MONO', 'Wren Evans', 'tlinh', 'Den Vau'];
        let reason = 'Gợi Ý Phát Nhạc Đa Dạng Dành Cho Bạn';

        if (userArtists.size > 0) {
            const arr = Array.from(userArtists);
            const topSeed = arr[0];
            seedQueries = [topSeed, 'Son Tung M-TP', 'HIEUTHUHAI', 'Wren Evans', 'MONO', 'Den Vau'];
            reason = `Gợi ý phát nhạc thông minh dựa trên: ${topSeed}`;
        }

        // Fetch tracks across multiple diverse query targets
        const searchResults = await Promise.all(
            seedQueries.slice(0, 6).map(q => this.search(q))
        );

        const combined: Track[] = [];
        const seenIds = new Set<string>();
        const seenArtistsCount: Record<string, number> = {};

        // Round-robin pick max 2 songs per artist for high singer diversity
        for (let i = 0; i < 4; i++) {
            for (const list of searchResults) {
                if (list[i]) {
                    const track = list[i];
                    const artistKey = (track.artist || 'unknown').toLowerCase();
                    const count = seenArtistsCount[artistKey] || 0;
                    
                    const titleLower = track.title.toLowerCase();
                    const isCompilation = titleLower.includes('megamix') || titleLower.includes('top 100') || titleLower.includes('top 50');

                    if (!isCompilation && !seenIds.has(track.id) && count < 2) {
                        seenIds.add(track.id);
                        seenArtistsCount[artistKey] = count + 1;
                        combined.push(track);
                    }
                }
            }
        }

        return {
            tracks: combined.slice(0, 20),
            reason
        };
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
