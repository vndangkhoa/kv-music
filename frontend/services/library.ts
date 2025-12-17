import { Track } from "./db";

export interface StaticPlaylist {
    id: string;
    title: string;
    description: string;
    cover_url: string;
    tracks: Track[];
    type: 'Album' | 'Artist' | 'Playlist';
    creator?: string;
}

// Helper to fetch from backend
const apiFetch = async (endpoint: string) => {
    const res = await fetch(`/api${endpoint}`);
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
};

export const libraryService = {
    async getLibrary(): Promise<StaticPlaylist> {
        // Fetch "Liked Songs" or main library from backend
        // Assuming backend has an endpoint or we treat "Trending" as default
        return await apiFetch('/browse'); // Simplified fallback
    },

    async _generateMockContent(): Promise<void> {
        // No-op in API mode
    },

    async getBrowseContent(): Promise<Record<string, StaticPlaylist[]>> {
        return await apiFetch('/browse');
    },

    async getPlaylist(id: string): Promise<StaticPlaylist | null> {
        try {
            return await apiFetch(`/playlists/${id}`);
        } catch (e) {
            console.error("Failed to fetch playlist", id, e);
            return null;
        }
    },

    async getRecommendations(seedTrackId?: string): Promise<Track[]> {
        // Use trending as recommendations for now
        const data = await apiFetch('/trending');
        return data.tracks || [];
    },

    async getRecommendedAlbums(seedArtist?: string): Promise<StaticPlaylist[]> {
        const data = await apiFetch('/browse');
        // Flatten all albums from categories
        const albums: StaticPlaylist[] = [];
        Object.values(data).forEach((list: any) => {
            if (Array.isArray(list)) albums.push(...list);
        });
        return albums.slice(0, 8);
    },

    async search(query: string): Promise<Track[]> {
        try {
            return await apiFetch(`/search?q=${encodeURIComponent(query)}`);
        } catch (e) {
            return [];
        }
    },

    // UTILITIES FOR DYNAMIC UPDATES
    updateTrackCover(trackId: string, newUrl: string) {
        console.log("Dynamic updates not implemented in Backend Mode");
    },

    updateAlbumCover(albumId: string, newUrl: string) {
        console.log("Dynamic updates not implemented in Backend Mode");
    }
};
