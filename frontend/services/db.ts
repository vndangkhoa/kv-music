import { openDB, DBSchema } from 'idb';
import { Track, Playlist } from '@/types';

export type { Track, Playlist };

interface MyDB extends DBSchema {
    playlists: {
        key: string;
        value: Playlist;
    };
    likedSongs: {
        key: string; // trackId
        value: Track;
    };
}

const DB_NAME = 'audiophile-db';
const DB_VERSION = 2;

export const initDB = async () => {
    return openDB<MyDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
            // Re-create stores to clear old data
            if (db.objectStoreNames.contains('playlists')) {
                db.deleteObjectStore('playlists');
            }
            if (db.objectStoreNames.contains('likedSongs')) {
                db.deleteObjectStore('likedSongs');
            }
            db.createObjectStore('playlists', { keyPath: 'id' });
            db.createObjectStore('likedSongs', { keyPath: 'id' });
        },
    });
};

export const dbService = {
    async getPlaylists() {
        const db = await initDB();
        const playlists = await db.getAll('playlists');
        if (playlists.length === 0) {
            return this.seedInitialData();
        }
        return playlists;
    },

    async seedInitialData() {
        try {
            // Fetch real data from backend to seed valid playlists
            // We use the 'api' prefix assuming this runs in browser
            const res = await fetch('/api/trending');
            if (!res.ok) return [];

            const data = await res.json();
            const allTracks: Track[] = data.tracks || [];

            if (allTracks.length === 0) return [];

            const db = await initDB();
            const newPlaylists: Playlist[] = [];

            // 1. Starter Playlist
            const favTracks = allTracks.slice(0, 8);
            if (favTracks.length > 0) {
                const p1: Playlist = {
                    id: crypto.randomUUID(),
                    title: "My Rotations",
                    tracks: favTracks,
                    createdAt: Date.now(),
                    cover_url: favTracks[0].cover_url
                };
                await db.put('playlists', p1);
                newPlaylists.push(p1);
            }

            // 2. Vibes
            const vibeTracks = allTracks.slice(8, 15);
            if (vibeTracks.length > 0) {
                const p2: Playlist = {
                    id: crypto.randomUUID(),
                    title: "Weekend Vibes",
                    tracks: vibeTracks,
                    createdAt: Date.now(),
                    cover_url: vibeTracks[0].cover_url
                };
                await db.put('playlists', p2);
                newPlaylists.push(p2);
            }

            return newPlaylists;

        } catch (e) {
            console.error("Seeding failed", e);
            return [];
        }
    },

    async getPlaylist(id: string) {
        const db = await initDB();
        return db.get('playlists', id);
    },
    async createPlaylist(name: string) {
        const db = await initDB();
        const newPlaylist: Playlist = {
            id: crypto.randomUUID(),
            title: name,
            tracks: [],
            createdAt: Date.now(),
            cover_url: "https://placehold.co/300/222/fff?text=" + encodeURIComponent(name)
        };
        await db.put('playlists', newPlaylist);
        return newPlaylist;
    },
    async deletePlaylist(id: string) {
        const db = await initDB();
        await db.delete('playlists', id);
    },
    async addToPlaylist(playlistId: string, track: Track) {
        const db = await initDB();
        const playlist = await db.get('playlists', playlistId);
        if (playlist) {
            // Auto-update cover if it's the default or empty
            if (playlist.tracks.length === 0 || playlist.cover_url?.includes("placehold")) {
                playlist.cover_url = track.cover_url;
            }
            playlist.tracks.push(track);
            await db.put('playlists', playlist);
        }
    },
    async removeFromPlaylist(playlistId: string, trackId: string) {
        const db = await initDB();
        const playlist = await db.get('playlists', playlistId);
        if (playlist) {
            playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
            await db.put('playlists', playlist);
        }
    },
    async getLikedSongs() {
        const db = await initDB();
        return db.getAll('likedSongs');
    },
    async toggleLike(track: Track) {
        const db = await initDB();
        const existing = await db.get('likedSongs', track.id);
        if (existing) {
            await db.delete('likedSongs', track.id);
            return false; // unliked
        } else {
            await db.put('likedSongs', track);
            return true; // liked
        }
    },
    async isLiked(trackId: string) {
        const db = await initDB();
        const existing = await db.get('likedSongs', trackId);
        return !!existing;
    }
};
