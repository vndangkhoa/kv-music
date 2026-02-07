import { useState, useEffect, useMemo } from 'react';
import { libraryService } from '../services/library';

export interface LyricLine {
    time: number;
    text: string;
}

export function useLyrics(trackTitle: string, artistName: string, currentTime: number, enabled: boolean = true) {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (trackTitle && artistName && enabled) {
            setLoading(true);
            setLyrics(null);
            setSyncedLines([]);

            libraryService.getLyrics(trackTitle, artistName)
                .then(data => {
                    if (data) {
                        if (data.syncedLyrics) {
                            setSyncedLines(parseSyncedLyrics(data.syncedLyrics));
                        } else {
                            setLyrics(data.plainLyrics || "No lyrics available.");
                        }
                    } else {
                        setLyrics(null);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
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
