import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbService, Playlist } from '../services/db';
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
      createdAt: Date.now(),
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
          // Prepend newly followed artist to top of array (index 0)
          updatedArtists = [artistName, ...followedArtists.filter(a => a !== artistName)];
          
          // Dynamically fetch artist top tracks to populate user's account with artist's songs, albums, and playlists!
          const songs = await libraryService.search(artistName).catch(() => []);
          const cover = coverPhoto || (songs.length > 0 ? songs[0].cover_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=ff5500&color=fff`);

          if (cover) {
            setArtistCoverUrl(artistName, cover);
          }

          // Create artist album entry
          const newAlbum: SavedAlbum = {
            id: `album-${artistName.replace(/\s+/g, '-')}`,
            title: `${artistName} Essentials`,
            artist: artistName,
            cover_url: cover,
          };

          // Create artist playlist entry
          const newPlaylist: Playlist = {
            id: `playlist-${artistName.replace(/\s+/g, '-')}`,
            title: `${artistName} Best Hits`,
            description: `Curated top songs and discography from ${artistName}`,
            cover_url: cover,
            tracks: songs.slice(0, 15),
            createdAt: Date.now(),
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
          const dbPlaylists = await dbService.getPlaylists() || [];
          const storedFollowed = JSON.parse(safeStorage.getItem('sc_followed_artists') || '[]') as string[];
          const seedPlaylists = buildSeedPlaylists();
          const seedArtists = buildSeedArtists();
          const { userPlaylists: currentPlaylists } = get();
          
          const mergedPlaylists = [...seedPlaylists.map(sp => {
            const existing = currentPlaylists.find(p => p.id === sp.id);
            return existing && existing.tracks.length > 0 ? { ...sp, tracks: existing.tracks } : sp;
          }), ...dbPlaylists.filter(p => !seedPlaylists.some(s => s.id === p.id))];

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
        const BATCH_SIZE = 4;
        for (let i = 0; i < userPlaylists.length; i += BATCH_SIZE) {
          const batch = userPlaylists.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(async (p) => {
              const full = await libraryService.getPlaylist(p.id);
              return { id: p.id, tracks: full?.tracks ?? [] };
            })
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
                updated.has(p.id) ? { ...p, tracks: updated.get(p.id)! } : p
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
          get().hydrateSeedTracks();
        };

        const intervalId = setInterval(handleSync, 6000);

        const onFocus = () => handleSync();
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onFocus);
        window.addEventListener('storage', onFocus);

        return () => {
          clearInterval(intervalId);
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onFocus);
          window.removeEventListener('storage', onFocus);
        };
      },
    }),
    {
      name: 'library-storage',
      partialize: (state) => ({
        followedArtists: state.followedArtists,
        userPlaylists: state.userPlaylists,
        savedAlbums: state.savedAlbums,
      }),
    }
  )
);
