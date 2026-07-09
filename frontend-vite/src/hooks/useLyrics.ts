import { useState, useEffect, useMemo, useRef } from 'react';
import { libraryService } from '../services/library';

export interface LyricLine {
    time: number;
    text: string;
}

// Cache for lyrics to avoid repeated API calls
const lyricsCache = new Map<string, { plainLyrics?: string; syncedLyrics?: string }>();

export function useLyrics(trackTitle: string, artistName: string, currentTime: number, enabled: boolean = true, videoId?: string) {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const lastFetchTime = useRef<number>(0);
    const currentTrackRef = useRef<string>('');

    useEffect(() => {
        // Only fetch if we have track info and it's enabled
        if (!trackTitle || !artistName || !enabled) {
            return;
        }

        const trackKey = `${artistName}:${trackTitle}:${videoId || ''}`.toLowerCase();
        
        // Check cache first
        const cached = lyricsCache.get(trackKey);
        if (cached && (cached.syncedLyrics || cached.plainLyrics)) {
            if (cached.syncedLyrics) {
                setSyncedLines(parseSyncedLyrics(cached.syncedLyrics));
                setLyrics(null);
            } else if (cached.plainLyrics) {
                setLyrics(cached.plainLyrics);
                setSyncedLines([]);
            } else {
                setLyrics(null);
                setSyncedLines([]);
            }
            setLoading(false);
            return;
        }

        // Avoid rapid successive calls
        const now = Date.now();
        if (now - lastFetchTime.current < 500 && currentTrackRef.current === trackKey) {
            return;
        }

        lastFetchTime.current = now;
        currentTrackRef.current = trackKey;
        setLoading(true);
        setLyrics(null);
        setSyncedLines([]);

        // Add timeout to prevent hanging requests
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 20000);

libraryService.getLyrics(trackTitle, artistName, videoId)
                .then(data => {
                    clearTimeout(timeoutId);
                    
                    if (data) {
                        // Cache the result
                        lyricsCache.set(trackKey, data);
                        
                        if (data.syncedLyrics) {
                            setSyncedLines(parseSyncedLyrics(data.syncedLyrics));
                            setLyrics(null);
                        } else if (data.plainLyrics) {
                            setLyrics(data.plainLyrics);
                            setSyncedLines([]);
                        } else {
                            setLyrics(null);
                            setSyncedLines([]);
                        }
                    } else {
                        setLyrics(null);
                        setSyncedLines([]);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    clearTimeout(timeoutId);
                    setLoading(false);
                });

        // Cleanup timeout on unmount
        return () => clearTimeout(timeoutId);
    }, [trackTitle, artistName, enabled, videoId]);

    // Clear cache when track changes to prevent stale data
    useEffect(() => {
        const trackKey = `${artistName}:${trackTitle}`.toLowerCase();
        if (!lyricsCache.has(trackKey)) {
            // Clear old cache entries if cache gets too large
            if (lyricsCache.size > 50) {
                const firstKey = lyricsCache.keys().next().value;
                if (firstKey) {
                    lyricsCache.delete(firstKey);
                }
            }
        }
    }, [trackTitle, artistName]);

    const activeIndex = useMemo(() => {
        return syncedLines.findIndex((line, i) => {
            const nextLine = syncedLines[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });
    }, [syncedLines, currentTime]);

    const currentLine = activeIndex !== -1 ? syncedLines[activeIndex] : null;
    const nextLine = activeIndex !== -1 && activeIndex + 1 < syncedLines.length ? syncedLines[activeIndex + 1] : null;

    return {
        lyrics,
        syncedLines,
        loading,
        activeIndex,
        currentLine,
        nextLine
    };
}

function parseSyncedLyrics(lrc: string): LyricLine[] {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]); // Normalize ms
            const time = min * 60 + sec + ms / 1000;
            const text = match[4].trim();
            if (text) result.push({ time, text });
        }
    }
    return result;
}
