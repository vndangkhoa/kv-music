import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track, AudioQuality } from '../types';
import { dbService } from '../services/db';
import { streamUrl } from '../services/library';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  likedTracks: Set<string>;
  likedTracksData: Track[];
  shuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  queue: Track[];
  currentIndex: number;
  playHistory: Track[];
  audioQuality: AudioQuality | null;
  qualityPreference: 'auto' | 'high' | 'normal' | 'low';
  isLyricsOpen: boolean;
  isFullScreenOpen: boolean;
  isSettingsOpen: boolean;
  isRightPanelOpen: boolean;
  rightPanelTab: 'queue' | 'related';
  progress: number;
  duration: number;
  volume: number;
  pendingSeek: number | null;
  recentSearches: string[];
  isVideoMode: boolean;

  // Actions
  playTrack: (track: Track, queue?: Track[], openFullPlayer?: boolean) => void;
  loadTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setBuffering: (state: boolean) => void;
  toggleLike: (track: Track) => Promise<void>;
  setQualityPreference: (quality: 'auto' | 'high' | 'normal' | 'low') => void;
  toggleLyrics: () => void;
  closeLyrics: () => void;
  openLyrics: () => void;
  setIsFullScreenOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setRightPanelTab: (tab: 'queue' | 'related') => void;
  toggleRightPanel: (tab: 'queue' | 'related') => void;
  closeRightPanel: () => void;
  addToQueue: (tracks: Track | Track[]) => void;
  setProgress: (time: number) => void;
  setDuration: (dur: number) => void;
  setVolume: (vol: number) => void;
  seekTo: (time: number | null) => void;
  addRecentSearch: (query: string) => void;
  setIsVideoMode: (mode: boolean) => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      likedTracks: new Set<string>(),
      likedTracksData: [],
      shuffle: false,
      repeatMode: 'none' as const,
      queue: [],
      currentIndex: -1,
      playHistory: [],
      audioQuality: null,
      qualityPreference: 'auto',
      isLyricsOpen: false,
      isFullScreenOpen: false,
      isSettingsOpen: false,
      isRightPanelOpen: false,
      rightPanelTab: 'queue' as const,
      progress: 0,
      duration: 0,
      volume: 1,
      pendingSeek: null,
      recentSearches: [],
      isVideoMode: false,

      playTrack: (track, newQueue, openFullPlayer = false) => {
        const state = get();
        const isNewTrack = state.currentTrack?.id !== track.id;
        if (isNewTrack) {
          set({ isBuffering: true });
          const filtered = state.playHistory.filter(t => t.id !== track.id);
          const playHistory = [track, ...filtered].slice(0, 20);
          set({ playHistory });
        }
        const updates: Partial<PlayerState> = {
          currentTrack: {
            ...track,
            url: track.url && (track.url.startsWith('/') || track.url.startsWith('http'))
              ? track.url
              : `${streamUrl(track.id)}`
          },
          isPlaying: true,
          isRightPanelOpen: true,
          isFullScreenOpen: openFullPlayer ? true : state.isFullScreenOpen,
        };
        if (isNewTrack) {
          // A new song must always start from 0:00 — never carry over the
          // previous track's position (progress/duration/pending seek).
          updates.progress = 0;
          updates.duration = 0;
          updates.pendingSeek = null;
        }
        if (newQueue) {
          const index = newQueue.findIndex(t => t.id === track.id);
          updates.queue = newQueue;
          updates.currentIndex = index;
        }
        set(updates as PlayerState);
      },

      loadTrack: (track, newQueue) => {
        const state = get();
        const isNewTrack = state.currentTrack?.id !== track.id;
        if (isNewTrack) {
          const filtered = state.playHistory.filter(t => t.id !== track.id);
          const playHistory = [track, ...filtered].slice(0, 20);
          set({ playHistory });
        }
        const updates: Partial<PlayerState> = {
          currentTrack: {
            ...track,
            url: track.url && (track.url.startsWith('/') || track.url.startsWith('http'))
              ? track.url
              : `${streamUrl(track.id)}`
          },
          isPlaying: false,
          isRightPanelOpen: true,
        };
        if (isNewTrack) {
          updates.progress = 0;
          updates.duration = 0;
          updates.pendingSeek = null;
        }
        if (newQueue) {
          const index = newQueue.findIndex(t => t.id === track.id);
          updates.queue = newQueue;
          updates.currentIndex = index;
        }
        set(updates as PlayerState);
      },

      togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

      nextTrack: () => {
        const { queue, currentIndex, shuffle, repeatMode } = get();
        if (queue.length === 0) return;
        let nextIndex = currentIndex + 1;
        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
          if (repeatMode === 'all') nextIndex = 0;
          else return;
        }
        const next = queue[nextIndex];
        get().playTrack(next);
        set({ currentIndex: nextIndex });
      },

      prevTrack: () => {
        const { queue, currentIndex } = get();
        if (queue.length === 0) return;
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = 0;
        get().playTrack(queue[prevIndex], undefined, false);
        set({ currentIndex: prevIndex });
      },

      toggleShuffle: () => set(state => ({ shuffle: !state.shuffle })),

      toggleRepeat: () => set(state => {
        const next = state.repeatMode === 'none' ? 'all' : state.repeatMode === 'all' ? 'one' : 'none';
        return { repeatMode: next };
      }),

      setBuffering: (state) => set({ isBuffering: state }),

      toggleLike: async (track) => {
        const isNowLiked = await dbService.toggleLike(track);
        set(state => {
          const next = new Set(state.likedTracks);
          if (isNowLiked) next.add(track.id);
          else next.delete(track.id);
          return {
            likedTracks: next,
            likedTracksData: isNowLiked
              ? [...state.likedTracksData, track]
              : state.likedTracksData.filter(t => t.id !== track.id)
          };
        });
      },

      setQualityPreference: (quality) => set({ qualityPreference: quality }),

      toggleLyrics: () => set(state => ({ isLyricsOpen: !state.isLyricsOpen })),
      closeLyrics: () => set({ isLyricsOpen: false }),
      openLyrics: () => set({ isLyricsOpen: true }),

      setIsFullScreenOpen: (open) => set({ isFullScreenOpen: open }),
      setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),

      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

      toggleRightPanel: (tab) => set(state => {
        if (state.isRightPanelOpen && state.rightPanelTab === tab) {
          return { isRightPanelOpen: false };
        }
        return { rightPanelTab: tab, isRightPanelOpen: true };
      }),

      closeRightPanel: () => set({ isRightPanelOpen: false }),

      addToQueue: (newTracks) => set(state => {
        const tracksToAdd = Array.isArray(newTracks) ? newTracks : [newTracks];
        const filtered = tracksToAdd.filter(t => !state.queue.some(existing => existing.id === t.id));
        return { queue: [...state.queue, ...filtered] };
      }),

      setProgress: (time) => set({ progress: time }),
      setDuration: (dur) => set({ duration: dur }),
      setVolume: (vol) => set({ volume: vol }),
      seekTo: (time) => set({ pendingSeek: time }),
      addRecentSearch: (query) => set(state => {
        const filtered = state.recentSearches.filter(q => q !== query);
        return { recentSearches: [query, ...filtered].slice(0, 10) };
      }),
      setIsVideoMode: (mode) => set({ isVideoMode: mode }),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({
        playHistory: state.playHistory,
        qualityPreference: state.qualityPreference,
        likedTracksData: state.likedTracksData,
        likedTracks: Array.from(state.likedTracks),
        recentSearches: state.recentSearches,
        volume: state.volume,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        ...persisted,
        likedTracks: new Set(persisted?.likedTracks || []),
      }),
    }
  )
);
