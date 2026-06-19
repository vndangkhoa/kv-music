import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { dbService } from "../services/db";
import { Track, AudioQuality } from "../types";

interface PlayerContextType {
    currentTrack: Track | null;
    isPlaying: boolean;
    isBuffering: boolean;
    likedTracks: Set<string>;
    likedTracksData: Track[];
    shuffle: boolean;
    repeatMode: 'none' | 'all' | 'one';
    playTrack: (track: Track, queue?: Track[]) => void;
    togglePlay: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    setBuffering: (state: boolean) => void;
    toggleLike: (track: Track) => void;
    playHistory: Track[];
    audioQuality: AudioQuality | null;
    qualityPreference: 'auto' | 'high' | 'normal' | 'low';
    setQualityPreference: (quality: 'auto' | 'high' | 'normal' | 'low') => void;
    isLyricsOpen: boolean;
    toggleLyrics: () => void;
    closeLyrics: () => void;
    openLyrics: () => void;
    isFullScreenOpen: boolean;
    setIsFullScreenOpen: (open: boolean) => void;
    queue: Track[];
    isRightPanelOpen: boolean;
    rightPanelTab: 'queue' | 'related';
    setRightPanelTab: (tab: 'queue' | 'related') => void;
    toggleRightPanel: (tab: 'queue' | 'related') => void;
    closeRightPanel: () => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;
    addToQueue: (tracks: Track | Track[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
    const [likedTracksData, setLikedTracksData] = useState<Track[]>([]);

    // Audio Engine State
    const [audioQuality, setAudioQuality] = useState<AudioQuality | null>(null);
    const [qualityPreference, setQualityPreference] = useState<'auto' | 'high' | 'normal' | 'low'>(() => {
        return (localStorage.getItem('audio_quality_pref') as any) || 'auto';
    });

    useEffect(() => {
        localStorage.setItem('audio_quality_pref', qualityPreference);
    }, [qualityPreference]);

    // Queue State
    const [queue, setQueue] = useState<Track[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');

    // History State
    const [playHistory, setPlayHistory] = useState<Track[]>([]);

    // Right Side Panel State
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<'queue' | 'related'>('queue');

    const toggleRightPanel = (tab: 'queue' | 'related') => {
        if (isRightPanelOpen && rightPanelTab === tab) {
            setIsRightPanelOpen(false);
        } else {
            setRightPanelTab(tab);
            setIsRightPanelOpen(true);
        }
    };

    const closeRightPanel = () => setIsRightPanelOpen(false);

    // Lyrics Panel State (independent overlay)
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);
    const toggleLyrics = () => setIsLyricsOpen(prev => !prev);
    const closeLyrics = () => setIsLyricsOpen(false);
    const openLyrics = () => setIsLyricsOpen(true);

    // Full Screen Player State
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Add to Queue helper
    const addToQueue = (newTracks: Track | Track[]) => {
        setQueue(prev => {
            const tracksToAdd = Array.isArray(newTracks) ? newTracks : [newTracks];
            const filtered = tracksToAdd.filter(t => !prev.some(existing => existing.id === t.id));
            return [...prev, ...filtered];
        });
    };

    // Load Likes from DB
    useEffect(() => {
        dbService.getLikedSongs().then(tracks => {
            setLikedTracks(new Set(tracks.map(t => t.id)));
            setLikedTracksData(tracks);
        });
    }, []);

    // Load History from LocalStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('playHistory');
            if (saved) {
                setPlayHistory(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    }, []);

    // Save History
    useEffect(() => {
        localStorage.setItem('playHistory', JSON.stringify(playHistory));
    }, [playHistory]);

    // Set default audio quality for streams
    useEffect(() => {
        if (!currentTrack) return;
        setAudioQuality(null);

        // Default quality for YouTube streams
        if (currentTrack.url && (currentTrack.url.includes('/api/stream') || currentTrack.url.startsWith('http'))) {
            setAudioQuality({
                format: 'WEBM/OPUS',
                sampleRate: 48000,
                bitrate: 128000,
                channels: 2,
                codec: 'Opus'
            });
        }
    }, [currentTrack]);

    const playTrack = (track: Track, newQueue?: Track[]) => {
        if (currentTrack?.id !== track.id) {
            setIsBuffering(true);

            // Add to History (prevent duplicates at top)
            setPlayHistory(prev => {
                const filtered = prev.filter(t => t.id !== track.id);
                return [track, ...filtered].slice(0, 20);
            });
        }
        setCurrentTrack(track);
        setIsPlaying(true);

        if (newQueue) {
            setQueue(newQueue);
            const index = newQueue.findIndex(t => t.id === track.id);
            setCurrentIndex(index);
        }
    };

    const togglePlay = () => {
        setIsPlaying((prev) => !prev);
    };

    const nextTrack = () => {
        if (queue.length === 0) return;

        let nextIndex = currentIndex + 1;
        if (shuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
        } else if (nextIndex >= queue.length) {
            if (repeatMode === 'all') nextIndex = 0;
            else return;
        }

        playTrack(queue[nextIndex]);
        setCurrentIndex(nextIndex);
    };

    const prevTrack = () => {
        if (queue.length === 0) return;
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = 0;
        playTrack(queue[prevIndex]);
        setCurrentIndex(prevIndex);
    };

    const toggleShuffle = () => setShuffle(prev => !prev);

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'none') return 'all';
            if (prev === 'all') return 'one';
            return 'none';
        });
    };

    const setBufferingState = (state: boolean) => setIsBuffering(state);

    const toggleLike = async (track: Track) => {
        const isNowLiked = await dbService.toggleLike(track);

        setLikedTracks(prev => {
            const next = new Set(prev);
            if (isNowLiked) next.add(track.id);
            else next.delete(track.id);
            return next;
        });

        setLikedTracksData(prev => {
            if (!isNowLiked) {
                return prev.filter(t => t.id !== track.id);
            } else {
                return [...prev, track];
            }
        });
    };

    const effectiveCurrentTrack = currentTrack ? {
        ...currentTrack,
        url: currentTrack.url && (currentTrack.url.startsWith('/') || currentTrack.url.startsWith('http'))
            ? currentTrack.url
            : `/api/stream/${currentTrack.id}`
    } : null;

    return (
        <PlayerContext.Provider value={{
            currentTrack: effectiveCurrentTrack,
            isPlaying,
            isBuffering,
            likedTracks,
            likedTracksData,
            shuffle,
            repeatMode,
            playTrack,
            togglePlay,
            nextTrack,
            prevTrack,
            toggleShuffle,
            toggleRepeat,
            setBuffering: setBufferingState,
            toggleLike,
            playHistory,
            audioQuality,
            qualityPreference,
            setQualityPreference,
            isLyricsOpen,
            toggleLyrics,
            closeLyrics,
            openLyrics,
            isFullScreenOpen,
            setIsFullScreenOpen,
            queue,
            isRightPanelOpen,
            rightPanelTab,
            setRightPanelTab,
            toggleRightPanel,
            closeRightPanel,
            isSettingsOpen,
            setIsSettingsOpen,
            addToQueue
        }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}
