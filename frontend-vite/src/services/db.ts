import { openDB, DBSchema } from 'idb';
import { Track, Playlist } from '../types';

export type { Track, Playlist };

interface MyDB extends DBSchema {
    playlists: {
        key: string;
        value: Playlist;
    };
    likedSongs: {
        key: string;
        value: Track;
    };
}

const DB_NAME = 'audiophile-db';
const DB_VERSION = 2;

export const initDB = async () => {
    return openDB<MyDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
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

        // Force re-seed if system playlist is empty (bad cache)
        const systemPlaylist = playlists.find(p => p.id === 'playlist-system-rotations');
        if (playlists.length === 0 || (systemPlaylist && systemPlaylist.tracks.length === 0)) {
            if (systemPlaylist) {
                await db.delete('playlists', 'playlist-system-rotations');
                await db.delete('playlists', 'playlist-system-weekend');
                await db.delete('playlists', 'playlist-system-tiktok');
            }
            return this.seedInitialData();
        }

        // Migration: create TikTok playlist if missing
        if (!playlists.some(p => p.id === 'playlist-system-tiktok')) {
            try {
                const res = await fetch('/api/search?q=TikTok Viral');
                const tracks: Track[] = res.ok ? (await res.json()).tracks || [] : [];
                const fallbackTracks: Track[] = tracks.length > 0 ? tracks : [
                    {
                        id: "fb-1",
                        title: "Shape of You (Demo)",
                        artist: "Ed Sheeran",
                        album: "Divide",
                        duration: 233,
                        cover_url: "https://placehold.co/800x800/1DB954/191414?text=Shape+of+You",
                        url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=twilight-120000.mp3"
                    },
                    {
                        id: "fb-2",
                        title: "Blinding Lights (Demo)",
                        artist: "The Weeknd",
                        album: "After Hours",
                        duration: 200,
                        cover_url: "https://placehold.co/800x800/ff0000/ffffff?text=Blinding+Lights",
                        url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_1669466e3b.mp3?filename=relaxed-vlog-131746.mp3"
                    },
                    {
                        id: "fb-3",
                        title: "Levitating (Demo)",
                        artist: "Dua Lipa",
                        album: "Future Nostalgia",
                        duration: 203,
                        cover_url: "https://placehold.co/800x800/ff00ff/ffffff?text=Levitating",
                        url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sexy-fashion-beats-11176.mp3"
                    },
                    {
                        id: 'fb-4',
                        title: 'Stay (Demo)',
                        artist: 'The Kid LAROI',
                        album: 'F*CK LOVE 3',
                        duration: 141,
                        cover_url: "https://placehold.co/800x800/800080/ffffff?text=Stay",
                        url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5145a278d6.mp3?filename=summer-party-12461.mp3'
                    },
                    {
                        id: 'fb-5',
                        title: 'Montero (Demo)',
                        artist: 'Lil Nas X',
                        album: 'Montero',
                        duration: 137,
                        cover_url: "https://placehold.co/800x800/ffa500/ffffff?text=Montero",
                        url: 'https://cdn.pixabay.com/download/audio/2023/04/12/audio_496677f54c.mp3?filename=hip-hop-trap-145638.mp3'
                    }
                ];
                const p3: Playlist = {
                    id: "playlist-system-tiktok",
                    title: "TikTok Hits",
                    tracks: fallbackTracks,
                    createdAt: Date.now(),
                    cover_url: fallbackTracks[2].cover_url,
                    type: 'Playlist'
                };
                await db.put('playlists', p3);
                playlists.push(p3);
            } catch (e) {
                console.error("Failed to migrate TikTok playlist", e);
            }
        }

        return playlists;
    },

    async seedInitialData() {
        try {
            let allTracks: Track[] = [];

            try {
                const res = await fetch('/api/search?q=Top Hits Vietnam');
                if (res.ok) {
                    const data = await res.json();
                    allTracks = data.tracks || [];
                }
            } catch (e) {
                console.warn("API seeding failed, using fallback data");
            }

            // Fallback data if API failed or returned emptiness
            // ALWAYS use fallback if API returned 0 tracks
            if (allTracks.length === 0) {
                console.log("Using Mock Data for DB Seeding");
                allTracks = [
                    {
                        id: "fb-1",
                        title: "Shape of You (Demo)",
                        artist: "Ed Sheeran",
                        album: "Divide",
                        duration: 233,
                        cover_url: "https://placehold.co/800x800/1DB954/191414?text=Shape+of+You",
                        url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=twilight-120000.mp3"
                    },
                    {
                        id: "fb-2",
                        title: "Blinding Lights (Demo)",
                        artist: "The Weeknd",
                        album: "After Hours",
                        duration: 200,
                        cover_url: "https://placehold.co/800x800/ff0000/ffffff?text=Blinding+Lights",
                        url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_1669466e3b.mp3?filename=relaxed-vlog-131746.mp3"
                    },
                    {
                        id: "fb-3",
                        title: "Levitating (Demo)",
                        artist: "Dua Lipa",
                        album: "Future Nostalgia",
                        duration: 203,
                        cover_url: "https://placehold.co/800x800/ff00ff/ffffff?text=Levitating",
                        url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sexy-fashion-beats-11176.mp3"
                    },
                    {
                        id: 'fb-4',
                        title: 'Stay (Demo)',
                        artist: 'The Kid LAROI',
                        album: 'F*CK LOVE 3',
                        duration: 141,
                        cover_url: "https://placehold.co/800x800/800080/ffffff?text=Stay",
                        url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_5145a278d6.mp3?filename=summer-party-12461.mp3'
                    },
                    {
                        id: 'fb-5',
                        title: 'Montero (Demo)',
                        artist: 'Lil Nas X',
                        album: 'Montero',
                        duration: 137,
                        cover_url: "https://placehold.co/800x800/ffa500/ffffff?text=Montero",
                        url: 'https://cdn.pixabay.com/download/audio/2023/04/12/audio_496677f54c.mp3?filename=hip-hop-trap-145638.mp3'
                    }
                ];

                // Force update tracks

                // Note: The tracks are embedded in the playlists, so we just need to update the playlists.
                // We'll just overwrite the initial ones if they exist or creating new ones.

                const p1ID = "playlist-system-rotations";
                const p2ID = "playlist-system-weekend";
                const p3ID = "playlist-system-tiktok";

                const p1: Playlist = {
                    id: p1ID,
                    title: "My Rotations",
                    tracks: allTracks,
                    createdAt: Date.now(),
                    cover_url: allTracks[0].cover_url,
                    type: 'Playlist'
                };

                const p2: Playlist = {
                    id: p2ID,
                    title: "Weekend Vibes",
                    tracks: allTracks.slice(0, 3),
                    createdAt: Date.now(),
                    cover_url: allTracks[1].cover_url,
                    type: 'Playlist'
                };

                const p3: Playlist = {
                    id: p3ID,
                    title: "TikTok Hits",
                    tracks: allTracks.slice(0, 5),
                    createdAt: Date.now(),
                    cover_url: allTracks[2].cover_url,
                    type: 'Playlist'
                };

                const db = await initDB();
                await db.put('playlists', p1);
                await db.put('playlists', p2);
                await db.put('playlists', p3);

                return [p1, p2, p3];
            }
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
            cover_url: `https://placehold.co/300/222/fff?text=${encodeURIComponent(name)}`
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
            return false;
        } else {
            await db.put('likedSongs', track);
            return true;
        }
    },

    async isLiked(trackId: string) {
        const db = await initDB();
        const existing = await db.get('likedSongs', trackId);
        return !!existing;
    }
};
