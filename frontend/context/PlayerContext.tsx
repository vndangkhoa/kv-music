"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { dbService } from "@/services/db";

interface Track {
    title: string;
    artist: string;
    album: string;
    cover_url: string;
    id: string;
    url?: string;
}

import * as mm from 'music-metadata-browser';

interface AudioQuality {
    format: string;
    sampleRate: number;
    bitDepth?: number;
    bitrate: number;
    channels: number;
    codec?: string;
}

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
    const [preloadedBlobs, setPreloadedBlobs] = useState<Map<string, string>>(new Map());

    // Queue State
    const [queue, setQueue] = useState<Track[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [shuffle, setShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');

    // History State
    const [playHistory, setPlayHistory] = useState<Track[]>([]);

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

    // Metadata & Preloading Effect
    useEffect(() => {
        if (!currentTrack) return;

        // 1. Reset Quality
        setAudioQuality(null);

        // 2. Parse Metadata for Current Track
        const parseMetadata = async () => {
            try {
                // Skip metadata parsing for backend streams AND external URLs (YouTube) to avoid CORS/Double-fetch
                if (currentTrack.url && (currentTrack.url.includes('/api/stream') || currentTrack.url.startsWith('http'))) {
                    setAudioQuality({
                        format: 'WEBM/OPUS', // YT Music typically
                        sampleRate: 48000,
                        bitrate: 128000,
                        channels: 2,
                        codec: 'Opus'
                    });
                    return;
                }

                if (currentTrack.url) {
                    // Note: In a real scenario, we might need a proxy or CORS-enabled server.
                    // music-metadata-browser fetches the file.
                    const metadata = await mm.fetchFromUrl(currentTrack.url);
                    setAudioQuality({
                        format: metadata.format.container || 'Unknown',
                        sampleRate: metadata.format.sampleRate || 44100,
                        bitDepth: metadata.format.bitsPerSample,
                        bitrate: metadata.format.bitrate || 0,
                        channels: metadata.format.numberOfChannels || 2,
                        codec: metadata.format.codec
                    });
                }
            } catch (e) {
                console.warn("Failed to parse metadata", e);
                // Fallback mock if parsing fails (likely due to CORS on sample URL)
                setAudioQuality({
                    format: 'MP3',
                    sampleRate: 44100,
                    bitrate: 320000,
                    channels: 2,
                    codec: 'MPEG-1 Layer 3'
                });
            }
        };
        parseMetadata();

        // 3. Smart Buffering (Preload Next 2 Tracks)
        const preloadNext = async () => {
            if (queue.length === 0) return;
            const index = queue.findIndex(t => t.id === currentTrack.id);
            if (index === -1) return;

            const nextTracks = queue.slice(index + 1, index + 3);
            nextTracks.forEach(async (track) => {
                if (!preloadedBlobs.has(track.id) && track.url) {
                    try {
                        // Construct the correct stream URL for preloading if it's external
                        const fetchUrl = track.url.startsWith('http') ? `/api/stream?id=${track.id}` : track.url;

                        const res = await fetch(fetchUrl);
                        if (!res.ok) throw new Error("Fetch failed");
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        setPreloadedBlobs(prev => new Map(prev).set(track.id, blobUrl));
                        console.log(`Buffered ${track.title}`);
                    } catch (e) {
                        // console.warn(`Failed to buffer ${track.title}`);
                    }
                }
            });
        };
        preloadNext();

    }, [currentTrack, queue, preloadedBlobs]);


    const playTrack = (track: Track, newQueue?: Track[]) => {
        if (currentTrack?.id !== track.id) {
            setIsBuffering(true);

            // Add to History (prevent duplicates at top)
            setPlayHistory(prev => {
                const filtered = prev.filter(t => t.id !== track.id);
                return [track, ...filtered].slice(0, 20); // Keep last 20
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
            else return; // Stop if end of queue and no repeat
        }

        playTrack(queue[nextIndex]);
        setCurrentIndex(nextIndex);
    };

    const prevTrack = () => {
        if (queue.length === 0) return;
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = 0; // Or wrap around if desired
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

    const setBuffering = (state: boolean) => setIsBuffering(state);

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
        // improved URL logic: usage of backend API if no local blob
        url: preloadedBlobs.get(currentTrack.id) ||
            (currentTrack.url && currentTrack.url.startsWith('/') ? currentTrack.url : `/api/stream?id=${currentTrack.id}`)
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
            setBuffering,
            toggleLike,
            playHistory,
            audioQuality
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
