import React, { useEffect, useState, useRef } from 'react';

interface Metric {
    time: number;
    text: string;
}

interface LyricsDetailProps {
    track: any;
    currentTime: number;
    onClose: () => void;
    onSeek?: (time: number) => void;
    isInSidebar?: boolean;
}

const LyricsDetail: React.FC<LyricsDetailProps> = ({ track, currentTime, onClose, onSeek, isInSidebar = false }) => {
    const [lyrics, setLyrics] = useState<Metric[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);

    // Fetch Lyrics on Track Change
    useEffect(() => {
        const fetchLyrics = async () => {
            if (!track) return;

            setIsLoading(true);
            try {
                // Pass title and artist for LRCLIB fallback
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                const url = `${apiUrl}/api/lyrics?id=${track.id}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
                const res = await fetch(url);
                const data = await res.json();
                setLyrics(data || []);
            } catch (error) {
                console.error("Error fetching lyrics:", error);
                setLyrics([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLyrics();
    }, [track?.id]);

    // Find active line index
    const activeIndex = lyrics.findIndex((line, index) => {
        const nextLine = lyrics[index + 1];
        // Removing large offset to match music exactly. 
        // using small buffer (0.05) just for rounding safety
        const timeWithOffset = currentTime + 0.05;
        return timeWithOffset >= line.time && (!nextLine || timeWithOffset < nextLine.time);
    });

    // Auto-scroll to active line
    // Auto-scroll to active line
    useEffect(() => {
        if (activeLineRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const activeLine = activeLineRef.current;

            // Calculate position to center (or offset) the active line
            // Reverted to center (50%) as requested
            const containerHeight = container.clientHeight;
            const lineTop = activeLine.offsetTop;
            const lineHeight = activeLine.offsetHeight;

            // Target scroll position:
            // Line Top - (Screen Height * 0.50) + (Half Line Height)
            const targetScrollTop = lineTop - (containerHeight * 0.50) + (lineHeight / 2);

            container.scrollTo({
                top: targetScrollTop,
                behavior: 'smooth'
            });
        }
    }, [activeIndex]);

    if (!track) return null;

    return (
        <div className={`${isInSidebar ? 'relative h-full' : 'absolute inset-0'} flex flex-col bg-transparent text-white`}>
            {/* Header - only show when NOT in sidebar */}
            {!isInSidebar && (
                <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent z-10">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold truncate">Lyrics</h2>
                        <p className="text-white/60 text-xs truncate uppercase tracking-widest">
                            {track.artist}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Lyrics Container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-6 text-center space-y-6 no-scrollbar mask-linear-gradient"
            >
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                    </div>
                ) : lyrics.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/50 text-base">
                        <p className="font-bold mb-2 text-xl">Looks like we don't have lyrics for this song.</p>
                        <p>Enjoy the vibe!</p>
                    </div>
                ) : (
                    <div className="pt-[50vh] pb-[50vh] max-w-4xl mx-auto"> {/* Reverted to center padding, added max-width */}
                        {lyrics.map((line, index) => {
                            const isActive = index === activeIndex;
                            const isPast = index < activeIndex;

                            return (
                                <div
                                    key={index}
                                    ref={isActive ? activeLineRef : null}
                                    className={`
                                        transition-all duration-500 ease-out origin-center
                                        ${isActive
                                            ? "text-3xl md:text-4xl font-bold text-white scale-100 opacity-100 drop-shadow-lg py-4"
                                            : "text-xl md:text-2xl font-medium text-white/30 hover:text-white/60 blur-[0px] scale-95 py-2"
                                        }
                                        cursor-pointer
                                    `}
                                    onClick={() => {
                                        if (onSeek) onSeek(line.time);
                                    }}
                                >
                                    {line.text}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LyricsDetail;
