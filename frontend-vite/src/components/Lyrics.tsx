import { useEffect, useState, useRef } from 'react';
import { libraryService } from '../services/library';

interface LyricsProps {
    trackTitle: string;
    artistName: string;
    currentTime: number;
    isOpen: boolean;
    onClose: () => void;
}

interface LyricLine {
    time: number;
    text: string;
}

export default function Lyrics({ trackTitle, artistName, currentTime, isOpen, onClose }: LyricsProps) {
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
    const [loading, setLoading] = useState(false);
    const activeLineRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (isOpen && trackTitle) {
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
                        setLyrics("Lyrics not found.");
                    }
                    setLoading(false);
                })
                .catch(() => {
                    setLyrics("Failed to load lyrics.");
                    setLoading(false);
                });
        }
    }, [trackTitle, artistName, isOpen]);

    // Find active line
    const activeIndex = syncedLines.findIndex((line, i) => {
        const nextLine = syncedLines[i + 1];
        return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });

    useEffect(() => {
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeIndex]); // Only scroll when line changes!

    return (
        <div className="fixed inset-0 bg-black/95 z-[80] flex flex-col animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Lyrics</span>
                    <h2 className="text-xl font-bold">{trackTitle}</h2>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition z-[90]"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 text-center no-scrollbar mask-gradient">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                    </div>
                ) : syncedLines.length > 0 ? (
                    <div className="space-y-6 py-[50vh]">
                        {syncedLines.map((line, i) => (
                            <p
                                key={i}
                                ref={i === activeIndex ? activeLineRef : null}
                                className={`text-2xl md:text-4xl font-bold transition-all duration-500 cursor-pointer py-2 ${i === activeIndex
                                    ? 'text-white scale-110 origin-center'
                                    : 'text-neutral-500/60 blur-[1px] hover:text-neutral-300 hover:blur-none'
                                    }`}
                            >
                                {line.text}
                            </p>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center whitespace-pre-wrap text-lg md:text-2xl leading-relaxed text-neutral-300">
                        {lyrics}
                    </div>
                )}
            </div>
        </div>
    );
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
