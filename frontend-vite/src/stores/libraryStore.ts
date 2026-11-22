import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbService, isUserOwnedPlaylist, Playlist } from '../services/db';
import { Track, StaticPlaylist } from '../types';
import { GENERATED_CONTENT } from '../data/seed_data';
import { libraryService, setArtistCoverUrl } from '../services/library';
import { safeStorage } from '../utils/safeStorage';

type FilterType = 'all' | 'playlists' | 'artists' | 'albums' | 'liked';

interface SavedAlbum {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
}

interface LibraryState {
  userPlaylists: Playlist[];
  followedArtists: string[];
  savedAlbums: SavedAlbum[];
  activeFilter: FilterType;
  lastSyncedAt: number;
  isSyncing: boolean;
  setActiveFilter: (filter: FilterType) => void;
  toggleFollowArtist: (artistName: string, coverPhoto?: string) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  hydrateSeedTracks: () => Promise<void>;
  deriveSavedAlbums: (playHistory: Track[]) => void;
  startAutoSync: () => () => void;
  createPlaylist: (name: string, description?: string, initialTracks?: Track[]) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: { title?: string; description?: string }) => Promise<Playlist | undefined>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  saveExternalPlaylist: (source: {
    id?: string;
    title: string;
    description?: string;
    cover_url?: string;
    tracks: Track[];
  }) => Promise<Playlist>;
  syncPlaylistsFromServer: (token: string) => Promise<void>;
  pushPlaylistsToServer: (tokenOverride?: string | null) => Promise<void>;
}

function buildSeedPlaylists(): Playlist[] {
  return Object.values(GENERATED_CONTENT)
    .filter((p): p is StaticPlaylist & { type: 'Playlist' } => p.type === 'Playlist')
    .map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      cover_url: p.cover_url,
      tracks: [],
      createdAt: 0,
      isUserCreated: false,
    }));
}

function buildSeedAlbums(): SavedAlbum[] {
  return Object.values(GENERATED_CONTENT)
    .filter((p): p is StaticPlaylist & { type: 'Album' } => p.type === 'Album')
    .map(p => ({
      id: p.id,
      title: p.title,
      artist: p.creator || 'Various Artists',
      cover_url: p.cover_url,
    }));
}

function buildSeedArtists(): string[] {
  return Object.values(GENERATED_CONTENT)
    .filter((p): p is StaticPlaylist & { type: 'Artist' } => p.type === 'Artist')
    .map(p => p.title);
}

function readStoredAuthToken(): string | null {
  try {
    const raw = safeStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

function mergeOwnedAndSeedPlaylists(
  owned: Playlist[],
  currentPlaylists: Playlist[],
  seedPlaylists: Playlist[],
): Playlist[] {
  const cleanOwned = [...owned]
    .filter(p => isUserOwnedPlaylist(p))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const ownedIds = new Set(cleanOwned.map(p => p.id));

  // Preserve custom followed-artist playlists (`playlist-<Artist>`) already added in state
  const artistCreatedIds = new Set(seedPlaylists.map(s => s.id));
  const customNonSeed = currentPlaylists.filter(
    p => !isUserOwnedPlaylist(p) && !artistCreatedIds.has(p.id) && !ownedIds.has(p.id),
  );

  const hydratedSeeds = seedPlaylists
    .filter(sp => !ownedIds.has(sp.id))
    .map(sp => {
      const existing = currentPlaylists.find(p => p.id === sp.id);
      return existing && existing.tracks.length > 0 ? { ...sp, tracks: existing.tracks } : sp;
    });

  return [...cleanOwned, ...customNonSeed, ...hydratedSeeds];
}

function serializeServerPlaylist(p: Playlist) {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    cover_url: p.cover_url ?? null,
    tracks: (p.tracks || []).map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist || '',
      album: t.album || '',
      cover_url: t.cover_url || '',
      url: t.url ?? null,
      duration: typeof t.duration === 'number' ? Math.max(0, Math.round(t.duration)) : null,
    })),
    created_at: p.createdAt || Date.now(),
    updated_at: p.updatedAt || p.createdAt || Date.now(),
  };
}

function deserializeServerPlaylist(raw: any): Playlist | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const createdAt = Number(raw.created_at ?? raw.createdAt ?? Date.now()) || Date.now();
  const updatedAt = Number(raw.updated_at ?? raw.updatedAt ?? createdAt) || createdAt;
  const tracks: Track[] = Array.isArray(raw.tracks)
    ? raw.tracks
        .filter((t: any) => t && typeof t.id === 'string' && typeof t.title === 'string')
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: typeof t.artist === 'string' ? t.artist : '',
          album: typeof t.album === 'string' ? t.album : '',
          cover_url: typeof t.cover_url === 'string' ? t.cover_url : (t.coverUrl || ''),
          ...(typeof t.url === 'string' && t.url ? { url: t.url } : {}),
          ...(typeof t.duration === 'number' ? { duration: t.duration } : {}),
        }))
    : [];
  return {
    id: raw.id,
    title: raw.title,
    ...(typeof raw.description === 'string' && raw.description ? { description: raw.description } : {}),
    cover_url: typeof raw.cover_url === 'string' ? raw.cover_url : (tracks[0]?.cover_url || ''),
    tracks,
    createdAt,
    updatedAt,
    type: 'Playlist',
    isUserCreated: true,
  };
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      userPlaylists: buildSeedPlaylists(),
      followedArtists: buildSeedArtists(),
      savedAlbums: buildSeedAlbums(),
      activeFilter: 'all' as FilterType,
      lastSyncedAt: Date.now(),
      isSyncing: false,

      setActiveFilter: (filter) => set({ activeFilter: filter }),

      toggleFollowArtist: async (artistName: string, coverPhoto?: string) => {
        const { followedArtists, savedAlbums, userPlaylists } = get();
        const isFollowing = followedArtists.includes(artistName);
        let updatedArtists: string[];

        if (isFollowing) {
          updatedArtists = followedArtists.filter(a => a !== artistName);
          set({ followedArtists: updatedArtists });
        } else {
          updatedArtists = [artistName, ...followedArtists.filter(a => a !== artistName)];

          const songs = await libraryService.search(artistName).catch(() => []);
          const cover = coverPhoto || (songs.length > 0 ? songs[0].cover_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=ff5500&color=fff`);

          if (cover) {
            setArtistCoverUrl(artistName, cover);
          }

          const newAlbum: SavedAlbum = {
            id: `album-${artistName.replace(/\s+/g, '-')}`,
            title: `${artistName} Essentials`,
            artist: artistName,
            cover_url: cover,
          };

          const newPlaylist: Playlist = {
            id: `playlist-${artistName.replace(/\s+/g, '-')}`,
            title: `${artistName} Best Hits`,
            description: `Curated top songs and discography from ${artistName}`,
            cover_url: cover,
            tracks: songs.slice(0, 15),
            createdAt: 0,
            isUserCreated: false,
          };

          const mergedAlbums = [newAlbum, ...savedAlbums.filter(a => a.id !== newAlbum.id)];
          const mergedPlaylists = [newPlaylist, ...userPlaylists.filter(p => p.id !== newPlaylist.id)];

          set({
            followedArtists: updatedArtists,
            savedAlbums: mergedAlbums,
            userPlaylists: mergedPlaylists,
          });
        }

        safeStorage.setItem('sc_followed_artists', JSON.stringify(updatedArtists));
      },

      refreshLibrary: async () => {
        set({ isSyncing: true });
        try {
          const dbPlaylists = (await dbService.getPlaylists()) || [];
          const storedFollowed = JSON.parse(safeStorage.getItem('sc_followed_artists') || '[]') as string[];
          const seedPlaylists = buildSeedPlaylists();
          const seedArtists = buildSeedArtists();
          const { userPlaylists: currentPlaylists } = get();

          const mergedPlaylists = mergeOwnedAndSeedPlaylists(
            dbPlaylists,
            currentPlaylists,
            seedPlaylists,
          );

          const mergedArtists = [...new Set([...storedFollowed, ...seedArtists])];

          set({
            userPlaylists: mergedPlaylists,
            followedArtists: mergedArtists,
            lastSyncedAt: Date.now(),
            isSyncing: false,
          });
        } catch (err) {
          console.error(err);
          set({ isSyncing: false });
        }
      },

      hydrateSeedTracks: async () => {
        const { userPlaylists } = get();
        const seedsToHydrate = userPlaylists.filter(
          p => !isUserOwnedPlaylist(p) && (!p.tracks || p.tracks.length === 0),
        );
        const BATCH_SIZE = 4;
        for (let i = 0; i < seedsToHydrate.length; i += BATCH_SIZE) {
          const batch = seedsToHydrate.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(async (p) => {
              const full = await libraryService.getPlaylist(p.id);
              return { id: p.id, tracks: full?.tracks ?? [] };
            }),
          );

          const updated = new Map<string, Track[]>();
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value.tracks.length > 0) {
              updated.set(r.value.id, r.value.tracks);
            }
          });

          if (updated.size > 0) {
            set((state) => ({
              userPlaylists: state.userPlaylists.map(p =>
                !isUserOwnedPlaylist(p) && updated.has(p.id) ? { ...p, tracks: updated.get(p.id)! } : p,
              ),
              lastSyncedAt: Date.now(),
            }));
          }
        }
      },

      deriveSavedAlbums: (playHistory) => {
        const seedAlbums = buildSeedAlbums();
        const { savedAlbums: currentAlbums } = get();
        const seen = new Map<string, SavedAlbum>();
        seedAlbums.forEach(a => seen.set(a.id, a));
        currentAlbums.forEach(a => seen.set(a.id, a));
        for (const track of playHistory) {
          if (track.album && !seen.has(track.album.replace(/\s+/g, '-').toLowerCase())) {
            seen.set(track.album.replace(/\s+/g, '-').toLowerCase(), {
              id: track.album.replace(/\s+/g, '-').toLowerCase(),
              title: track.album,
              artist: track.artist,
              cover_url: track.cover_url,
            });
          }
        }
        set({ savedAlbums: Array.from(seen.values()) });
      },

      startAutoSync: () => {
        const handleSync = () => {
          get().refreshLibrary();
        };

        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            handleSync();
          }
        };

        window.addEventListener('focus', handleSync);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('storage', handleSync);

        return () => {
          window.removeEventListener('focus', handleSync);
          document.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('storage', handleSync);
        };
      },

      createPlaylist: async (name, description, initialTracks) => {
        const created = await dbService.createPlaylist(name, description, initialTracks);
        await get().refreshLibrary();
        void get().pushPlaylistsToServer();
        return created;
      },

      updatePlaylist: async (id, updates) => {
        const updated = await dbService.updatePlaylist(id, updates);
        await get().refreshLibrary();
        void get().pushPlaylistsToServer();
        return updated;
      },

      deletePlaylist: async (id) => {
        await dbService.deletePlaylist(id);
        await get().refreshLibrary();
        void get().pushPlaylistsToServer();
      },

      addTrackToPlaylist: async (playlistId, track) => {
        const before = await dbService.getPlaylist(playlistId);
        const alreadyIn = before?.tracks.some(t => t.id === track.id) ?? false;
        const updated = await dbService.addToPlaylist(playlistId, track);
        if (!updated) return false;
        await get().refreshLibrary();
        if (!alreadyIn) {
          void get().pushPlaylistsToServer();
        }
        return !alreadyIn;
      },

      removeTrackFromPlaylist: async (playlistId, trackId) => {
        await dbService.removeFromPlaylist(playlistId, trackId);
        await get().refreshLibrary();
        void get().pushPlaylistsToServer();
      },

      saveExternalPlaylist: async (source) => {
        const saved = await dbService.saveExternalPlaylist(source);
        await get().refreshLibrary();
        void get().pushPlaylistsToServer();
        return saved;
      },

      pushPlaylistsToServer: async (tokenOverride) => {
        const token = tokenOverride !== undefined ? tokenOverride : readStoredAuthToken();
        if (!token) return;
        try {
          const owned = await dbService.getPlaylists();
          await fetch('/api/user/playlists', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              playlists: owned.map(serializeServerPlaylist),
            }),
          });
        } catch {
          // Best-effort cloud sync
        }
      },

      syncPlaylistsFromServer: async (token) => {
        if (!token) return;
        try {
          const localOwned = await dbService.getPlaylists();
          const res = await fetch('/api/user/playlists', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          const serverList: Playlist[] = Array.isArray(data?.playlists)
            ? data.playlists.map(deserializeServerPlaylist).filter((p: Playlist | null): p is Playlist => Boolean(p))
            : [];

          const mergedMap = new Map<string, Playlist>();
          for (const sp of serverList) {
            mergedMap.set(sp.id, sp);
          }

          let needsPush = false;
          for (const lp of localOwned) {
            const existing = mergedMap.get(lp.id);
            if (!existing) {
              mergedMap.set(lp.id, lp);
              needsPush = true;
            } else {
              const lTs = lp.updatedAt ?? lp.createdAt ?? 0;
              const sTs = existing.updatedAt ?? existing.createdAt ?? 0;
              if (lTs > sTs) {
                mergedMap.set(lp.id, lp);
                needsPush = true;
              }
            }
          }

          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
          );

          await dbService.replaceAllPlaylists(merged);
          await get().refreshLibrary();

          if (needsPush) {
            await get().pushPlaylistsToServer(token);
          }
        } catch {
          // Best-effort sync
        }
      },
    }),
    {
      name: 'library-storage',
      partialize: (state) => ({
        followedArtists: state.followedArtists,
        userPlaylists: state.userPlaylists,
        savedAlbums: state.savedAlbums,
      }),
    },
  ),
);
