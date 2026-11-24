import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track, Playlist } from '../types';
import { safeStorage } from '../utils/safeStorage';
import { streamUrl } from './library';

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
const USER_PLAYLISTS_STORAGE_KEY = 'kv_music_user_playlists_v1';
const LIKED_SONGS_STORAGE_KEY = 'kv_music_liked_songs_v1';

export function generateUserPlaylistId(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `user-pl-${crypto.randomUUID()}`;
        }
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            return `user-pl-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
    } catch {
        // Fallback when crypto APIs are restricted or unavailable
    }
    return `user-pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isUserOwnedPlaylist(playlist: { id?: string; isUserCreated?: boolean } | null | undefined): boolean {
    if (!playlist) return false;
    if (playlist.isUserCreated === true) return true;
    const id = playlist.id || '';
    if (!id) return false;
    return (
        !id.startsWith('playlist-') &&
        !id.startsWith('discovery-') &&
        !id.startsWith('VLPL') &&
        !id.startsWith('PL')
    );
}

export function isLegacySystemPlaylistId(id?: string): boolean {
    return Boolean(id && id.startsWith('playlist-system-'));
}

export function isDemoTrack(track?: Track | null): boolean {
    if (!track) return false;
    return /^fb-\d+$/.test(track.id || '') || /\(Demo\)\s*$/i.test(track.title || '');
}

function isLegacySystemSeed(p: Playlist): boolean {
    return isLegacySystemPlaylistId(p.id);
}

function normalizeTrackForPlaylist(t: Track): Track {
    const id = (t.id || '').trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return { ...t, id, url: streamUrl(id) };
    }
    return t;
}

function normalizeUserPlaylist(p: Playlist): Playlist {
    const now = Date.now();
    const createdAt = typeof p.createdAt === 'number' && p.createdAt > 0 ? p.createdAt : now;
    const updatedAt = typeof p.updatedAt === 'number' && p.updatedAt > 0 ? p.updatedAt : createdAt;
    const cleanTracks = Array.isArray(p.tracks)
        ? p.tracks.filter(t => t && t.id && !isDemoTrack(t)).map(normalizeTrackForPlaylist)
        : [];
    return {
        ...p,
        title: (p.title || 'Untitled Playlist').trim() || 'Untitled Playlist',
        tracks: cleanTracks,
        createdAt,
        updatedAt,
        type: 'Playlist',
        isUserCreated: true,
    };
}

function readMirrorPlaylists(): Playlist[] {
    try {
        const raw = safeStorage.getItem(USER_PLAYLISTS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((p): p is Playlist => Boolean(p && typeof p.id === 'string' && typeof p.title === 'string'))
            .filter(p => !isLegacySystemSeed(p) && isUserOwnedPlaylist(p))
            .map(normalizeUserPlaylist);
    } catch {
        return [];
    }
}

function writeMirrorPlaylists(playlists: Playlist[]): void {
    try {
        const clean = playlists
            .filter(p => !isLegacySystemSeed(p) && isUserOwnedPlaylist(p))
            .map(normalizeUserPlaylist)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        safeStorage.setItem(USER_PLAYLISTS_STORAGE_KEY, JSON.stringify(clean));
    } catch {
        // Ignore storage quota errors
    }
}

function readMirrorLikedSongs(): Track[] {
    try {
        const raw = safeStorage.getItem(LIKED_SONGS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeMirrorLikedSongs(tracks: Track[]): void {
    try {
        safeStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(tracks));
    } catch {
        // Ignore storage errors
    }
}

export const initDB = async () => {
    return openDB<MyDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('likedSongs')) {
                db.createObjectStore('likedSongs', { keyPath: 'id' });
            }
        },
    });
};

async function openDatabaseSafe(): Promise<IDBPDatabase<MyDB> | null> {
    try {
        if (typeof indexedDB === 'undefined') return null;
        return await initDB();
    } catch {
        return null;
    }
}

function mergePlaylistLists(primary: Playlist[], secondary: Playlist[]): Playlist[] {
    const map = new Map<string, Playlist>();
    for (const raw of [...primary, ...secondary]) {
        if (!raw || !raw.id || isLegacySystemSeed(raw) || !isUserOwnedPlaylist(raw)) continue;
        const p = normalizeUserPlaylist(raw);
        const existing = map.get(p.id);
        if (!existing) {
            map.set(p.id, p);
            continue;
        }
        const existingTs = existing.updatedAt ?? existing.createdAt ?? 0;
        const incomingTs = p.updatedAt ?? p.createdAt ?? 0;
        if (incomingTs > existingTs || (incomingTs === existingTs && p.tracks.length > existing.tracks.length)) {
            map.set(p.id, p);
        }
    }
    return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export const dbService = {
    async getPlaylists(): Promise<Playlist[]> {
        const mirrorPlaylists = readMirrorPlaylists();
        const db = await openDatabaseSafe();
        let idbPlaylists: Playlist[] = [];

        if (db) {
            try {
                const all = await db.getAll('playlists');
                for (const p of all) {
                    if (isLegacySystemPlaylistId(p.id)) {
                        try {
                            await db.delete('playlists', p.id);
                        } catch {
                            // ignore delete error
                        }
                    }
                }
                idbPlaylists = all
                    .filter(p => !isLegacySystemSeed(p) && isUserOwnedPlaylist(p))
                    .map(normalizeUserPlaylist);
            } catch {
                idbPlaylists = [];
            }
        }

        const merged = mergePlaylistLists(idbPlaylists, mirrorPlaylists);
        writeMirrorPlaylists(merged);

        if (db && mirrorPlaylists.length > 0) {
            const idbIds = new Set(idbPlaylists.map(p => p.id));
            for (const p of merged) {
                if (!idbIds.has(p.id)) {
                    try {
                        await db.put('playlists', p);
                    } catch {
                        // Ignore IDB backfill errors
                    }
                }
            }
        }

        return merged;
    },

    async getPlaylist(id: string): Promise<Playlist | undefined> {
        const db = await openDatabaseSafe();
        if (db) {
            try {
                const found = await db.get('playlists', id);
                if (found && !isLegacySystemSeed(found)) {
                    return normalizeUserPlaylist(found);
                }
            } catch {
                // Fall back to mirror
            }
        }
        const mirror = readMirrorPlaylists();
        return mirror.find(p => p.id === id);
    },

    async createPlaylist(name: string, description?: string, initialTracks: Track[] = []): Promise<Playlist> {
        const title = name.trim();
        if (!title) {
            throw new Error('Playlist title is required');
        }
        const now = Date.now();
        const dedupedTracks: Track[] = [];
        const seen = new Set<string>();
        for (const t of initialTracks) {
            if (t?.id && !seen.has(t.id)) {
                seen.add(t.id);
                dedupedTracks.push(t);
            }
        }

        const trimmedDesc = description?.trim();
        const newPlaylist: Playlist = {
            id: generateUserPlaylistId(),
            title,
            ...(trimmedDesc ? { description: trimmedDesc } : {}),
            tracks: dedupedTracks,
            createdAt: now,
            updatedAt: now,
            cover_url: dedupedTracks[0]?.cover_url || '',
            type: 'Playlist',
            isUserCreated: true,
        };

        const db = await openDatabaseSafe();
        if (db) {
            try {
                await db.put('playlists', newPlaylist);
            } catch {
                // safeStorage mirror persists below
            }
        }

        const existing = readMirrorPlaylists().filter(p => p.id !== newPlaylist.id);
        writeMirrorPlaylists([newPlaylist, ...existing]);
        return newPlaylist;
    },

    async updatePlaylist(
        id: string,
        updates: { title?: string; description?: string },
    ): Promise<Playlist | undefined> {
        const existing = await this.getPlaylist(id);
        if (!existing) return undefined;

        const nextTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
        if (!nextTitle) return existing;
        const nextDesc = updates.description !== undefined ? updates.description.trim() : existing.description;

        const updated: Playlist = {
            ...normalizeUserPlaylist(existing),
            title: nextTitle,
            ...(nextDesc ? { description: nextDesc } : { description: undefined }),
            updatedAt: Date.now(),
        };

        const db = await openDatabaseSafe();
        if (db) {
            try {
                await db.put('playlists', updated);
            } catch {
                // mirror fallback below
            }
        }

        const list = readMirrorPlaylists().map(p => (p.id === id ? updated : p));
        if (!list.some(p => p.id === id)) list.unshift(updated);
        writeMirrorPlaylists(list);
        return updated;
    },

    async saveExternalPlaylist(source: {
        id?: string;
        title: string;
        description?: string;
        cover_url?: string;
        tracks: Track[];
    }): Promise<Playlist> {
        const created = await this.createPlaylist(
            source.title,
            source.description,
            source.tracks || [],
        );
        if (!created.cover_url && source.cover_url && !source.cover_url.includes('placehold')) {
            const withCover: Playlist = {
                ...created,
                cover_url: source.cover_url,
                updatedAt: Date.now(),
            };
            const db = await openDatabaseSafe();
            if (db) {
                try {
                    await db.put('playlists', withCover);
                } catch {
                    // ignore
                }
            }
            const list = readMirrorPlaylists().map(p => (p.id === withCover.id ? withCover : p));
            writeMirrorPlaylists(list);
            return withCover;
        }
        return created;
    },

    async deletePlaylist(id: string): Promise<void> {
        const db = await openDatabaseSafe();
        if (db) {
            try {
                await db.delete('playlists', id);
            } catch {
                // ignore
            }
        }
        const remaining = readMirrorPlaylists().filter(p => p.id !== id);
        writeMirrorPlaylists(remaining);
    },

    async addToPlaylist(playlistId: string, track: Track): Promise<Playlist | undefined> {
        const playlist = await this.getPlaylist(playlistId);
        if (!playlist) return undefined;

        const normalized = normalizeUserPlaylist(playlist);
        const alreadyPresent = normalized.tracks.some(t => t.id === track.id);
        if (alreadyPresent) {
            return normalized;
        }

        const shouldUpdateCover =
            !normalized.cover_url ||
            normalized.cover_url.includes('placehold') ||
            normalized.tracks.length === 0;

        const updated: Playlist = {
            ...normalized,
            cover_url: shouldUpdateCover ? (track.cover_url || normalized.cover_url || '') : normalized.cover_url,
            tracks: [...normalized.tracks, track],
            updatedAt: Date.now(),
        };

        const db = await openDatabaseSafe();
        if (db) {
            try {
                await db.put('playlists', updated);
            } catch {
                // ignore
            }
        }
        const list = readMirrorPlaylists().map(p => (p.id === playlistId ? updated : p));
        if (!list.some(p => p.id === playlistId)) list.unshift(updated);
        writeMirrorPlaylists(list);
        return updated;
    },

    async removeFromPlaylist(playlistId: string, trackId: string): Promise<Playlist | undefined> {
        const playlist = await this.getPlaylist(playlistId);
        if (!playlist) return undefined;

        const normalized = normalizeUserPlaylist(playlist);
        const removedTrack = normalized.tracks.find(t => t.id === trackId);
        const updatedTracks = normalized.tracks.filter(t => t.id !== trackId);
        const nextCover =
            updatedTracks.length === 0 || (removedTrack?.cover_url && removedTrack.cover_url === normalized.cover_url)
                ? (updatedTracks[0]?.cover_url || '')
                : normalized.cover_url;
        const updated: Playlist = {
            ...normalized,
            cover_url: nextCover,
            tracks: updatedTracks,
            updatedAt: Date.now(),
        };

        const db = await openDatabaseSafe();
        if (db) {
            try {
                await db.put('playlists', updated);
            } catch {
                // ignore
            }
        }
        const list = readMirrorPlaylists().map(p => (p.id === playlistId ? updated : p));
        if (!list.some(p => p.id === playlistId)) list.unshift(updated);
        writeMirrorPlaylists(list);
        return updated;
    },

    async replaceAllPlaylists(playlists: Playlist[]): Promise<void> {
        const clean = playlists
            .filter(p => p && p.id && !isLegacySystemSeed(p) && isUserOwnedPlaylist(p))
            .map(normalizeUserPlaylist)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        writeMirrorPlaylists(clean);

        const db = await openDatabaseSafe();
        if (db) {
            try {
                const existing = await db.getAll('playlists');
                for (const item of existing) {
                    if (isUserOwnedPlaylist(item) || isLegacySystemSeed(item)) {
                        await db.delete('playlists', item.id);
                    }
                }
                for (const item of clean) {
                    await db.put('playlists', item);
                }
            } catch {
                // ignore
            }
        }
    },

    async getLikedSongs(): Promise<Track[]> {
        const mirror = readMirrorLikedSongs();
        const db = await openDatabaseSafe();
        if (!db) return mirror;
        try {
            const list = await db.getAll('likedSongs');
            if (list.length > 0) {
                writeMirrorLikedSongs(list);
                return list;
            }
            return mirror;
        } catch {
            return mirror;
        }
    },

    async toggleLike(track: Track): Promise<boolean> {
        const db = await openDatabaseSafe();
        const mirror = readMirrorLikedSongs();
        let exists = mirror.some(t => t.id === track.id);

        if (db) {
            try {
                const existing = await db.get('likedSongs', track.id);
                exists = Boolean(existing);
                if (exists) {
                    await db.delete('likedSongs', track.id);
                } else {
                    await db.put('likedSongs', track);
                }
            } catch {
                // fall through to mirror update
            }
        }

        if (exists) {
            writeMirrorLikedSongs(mirror.filter(t => t.id !== track.id));
            return false;
        } else {
            writeMirrorLikedSongs([track, ...mirror.filter(t => t.id !== track.id)]);
            return true;
        }
    },

    async isLiked(trackId: string): Promise<boolean> {
        const db = await openDatabaseSafe();
        if (db) {
            try {
                const existing = await db.get('likedSongs', trackId);
                if (existing) return true;
            } catch {
                // fallback
            }
        }
        return readMirrorLikedSongs().some(t => t.id === trackId);
    },
};
