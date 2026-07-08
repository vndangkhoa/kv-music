import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLyrics } from '../hooks/useLyrics';

interface LyricsProps {
    trackTitle: string;
    artistName: string;
    currentTime: number;
    isOpen: boolean;
    onClose: () => void;
    videoId?: string;
    variant?: 'fullscreen' | 'panel';
}

export default function Lyrics({ trackTitle, artistName, currentTime, isOpen, onClose, videoId, variant = 'fullscreen' }: LyricsProps) {
    const activeLineRef = useRef<HTMLParagraphElement>(null);

    const {
        lyrics,
        syncedLines,
        loading,
        activeIndex
    } = useLyrics(trackTitle, artistName, currentTime, isOpen, videoId);

    useEffect(() => {
        if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeIndex]);

    if (!isOpen) return null;

    if (variant === 'panel') {
        return (
            <div className="flex flex-col h-full animate-in slide-in-from-right">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Lyrics</span>
                    <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3 text-center no-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white"></div>
                            <span className="text-neutral-400 text-xs">Searching for lyrics...</span>
                        </div>
                    ) : syncedLines.length > 0 ? (
                        <div className="space-y-4 py-4">
                            {syncedLines.map((line, i) => (
                                <p
                                    key={i}
                                    ref={i === activeIndex ? activeLineRef : null}
                                    className={`text-sm md:text-base font-bold transition-all duration-500 cursor-pointer py-1 ${i === activeIndex
                                        ? 'text-white scale-105 origin-center'
                                        : 'text-neutral-500/60 hover:text-neutral-300'
                                        }`}
                                >
                                    {line.text}
                                </p>
                            ))}
                        </div>
                    ) : lyrics ? (
                        <div className="py-4">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300 px-2 text-center">
                                {lyrics.split('\n').map((line, i) => (
                                    <p key={i} className="mb-2 hover:text-white transition-colors">
                                        {line || '\u00A0'}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3 px-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                                <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-white">No lyrics found</h3>
                            <p className="text-neutral-400 text-center text-xs leading-relaxed">
                                Lyrics for this song are not available from free sources.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

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
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                        <span className="text-neutral-400 text-sm">Searching for lyrics...</span>
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
                ) : lyrics ? (
                    <div className="h-full overflow-y-auto py-8 mask-gradient">
                        <div className="whitespace-pre-wrap text-lg md:text-2xl leading-relaxed text-neutral-300 px-4 text-center">
                            {lyrics.split('\n').map((line, i) => (
                                <p key={i} className="mb-4 hover:text-white transition-colors">
                                    {line || '\u00A0'}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 px-8">
                        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">No lyrics found</h3>
                        <p className="text-neutral-400 text-center text-sm leading-relaxed">
                            Lyrics for this song are not available from free sources.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}