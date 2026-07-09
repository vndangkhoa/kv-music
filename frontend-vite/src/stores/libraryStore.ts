import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dbService, Playlist } from '../services/db';
import { Track, StaticPlaylist } from '../types';
import { GENERATED_CONTENT } from '../data/seed_data';
import { libraryService } from '../services/library';

type FilterType = 'all' | 'playlists' | 'artists' | 'albums';

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
  setActiveFilter: (filter: FilterType) => void;
  refreshLibrary: () => Promise<void>;
  hydrateSeedTracks: () => Promise<void>;
  deriveSavedAlbums: (playHistory: Track[]) => void;
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

      setActiveFilter: (filter) => set({ activeFilter: filter }),

      refreshLibrary: async () => {
        try {
          const userPlaylists = await dbService.getPlaylists() || [];
          const likedArtists = JSON.parse(localStorage.getItem('likedArtists') || '[]') as string[];
          const seedPlaylists = buildSeedPlaylists();
          const seedArtists = buildSeedArtists();
          const { userPlaylists: currentPlaylists } = get();
          const mergedPlaylists = [...seedPlaylists.map(sp => {
            const existing = currentPlaylists.find(p => p.id === sp.id);
            return existing && existing.tracks.length > 0 ? { ...sp, tracks: existing.tracks } : sp;
          }), ...userPlaylists.filter(p => !seedPlaylists.some(s => s.id === p.id))];
          const mergedArtists = [...seedArtists, ...likedArtists.filter((a: string) => !seedArtists.includes(a))];
          set({ userPlaylists: mergedPlaylists, followedArtists: mergedArtists });
        } catch (err) {
          console.error(err);
        }
      },

      hydrateSeedTracks: async () => {
        const { userPlaylists } = get();
        const emptyPlaylists = userPlaylists.filter(p => p.tracks.length === 0);
        if (emptyPlaylists.length === 0) return;

        const BATCH_SIZE = 3;
        for (let i = 0; i < emptyPlaylists.length; i += BATCH_SIZE) {
          const batch = emptyPlaylists.slice(i, i + BATCH_SIZE);
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
            }));
          }
        }
      },

      deriveSavedAlbums: (playHistory) => {
        const seedAlbums = buildSeedAlbums();
        const seen = new Map<string, SavedAlbum>();
        seedAlbums.forEach(a => seen.set(a.id, a));
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
    }),
    {
      name: 'library-storage',
      partialize: (state) => ({
        followedArtists: state.followedArtists,
        userPlaylists: state.userPlaylists,
      }),
    }
  )
);
