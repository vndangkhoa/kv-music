import { X, Play, Pause } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useEffect, useState } from 'react';
import { libraryService } from '../services/library';
import CoverImage from './CoverImage';
import { Track } from '../types';

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function QueueModal({ isOpen, onClose }: QueueModalProps) {
    const { queue, currentTrack, playTrack, isPlaying, togglePlay } = usePlayer();
    const [recommendations, setRecommendations] = useState<Track[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);

    // Fetch recommendations when current track changes
    useEffect(() => {
        if (!currentTrack || !isOpen) return;

        const fetchRecommendations = async () => {
            setLoadingRecs(true);
            try {
                const result = await libraryService.getRelatedContent(currentTrack.artist || currentTrack.title, 'track', 5);
                // Filter out current track
                const filtered = result.tracks.filter(t => t.id !== currentTrack.id);
                setRecommendations(filtered.slice(0, 5));
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
                setRecommendations([]);
            } finally {
                setLoadingRecs(false);
            }
        };

        fetchRecommendations();
    }, [currentTrack, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex justify-end animate-in slide-in-from-right duration-300">
            <div className="w-full max-w-md h-full bg-[#121212] border-l border-white/10 flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Queue</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2 px-2">Now Playing</h3>
                        {currentTrack && (
                            <QueueItem
                                track={currentTrack}
                                isCurrent={true}
                                isPlaying={isPlaying}
                                onClick={() => togglePlay()} // Toggle play for current
                            />
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2 px-2">Next Up</h3>
                        {queue.length === 0 ? (
                            <div className="text-neutral-500 text-sm px-2">Queue is empty</div>
                        ) : (
                            queue.map((track, i) => {
                                // Skip current track in "Next Up" visual if it's the one playing?
                                // Actually queue usually contains the current track. 
                                // Let's filter out current track visually or just show whole queue?
                                // Spotify shows "Next In Queue".
                                return (
                                    <QueueItem
                                        key={`${track.id}-${i}`}
                                        track={track}
                                        isCurrent={false}
                                        onClick={() => playTrack(track, queue)} // Jump to track
                                    />
                                );
                            })
                        )}
                    </div>

                    {/* Recommendations Section */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-4 px-2">Recommended for You</h3>
                        {loadingRecs ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                        <div className="w-10 h-10 bg-white/10 rounded" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-white/10 rounded w-3/4" />
                                            <div className="h-3 bg-white/10 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recommendations.length === 0 ? (
                            <div className="text-neutral-500 text-sm px-2">No recommendations available</div>
                        ) : (
                            <div className="space-y-1">
                                {recommendations.map((track) => (
                                    <div
                                        key={track.id}
                                        onClick={() => playTrack(track, [...queue, ...recommendations])}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition cursor-pointer group"
                                    >
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full rounded object-cover" fallbackText="♪" />
                                            <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                                                <Play size={16} className="text-white fill-white" />
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium truncate text-sm text-white">{track.title}</p>
                                            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function QueueItem({ track, isCurrent, isPlaying, onClick }: { track: Track, isCurrent: boolean, isPlaying?: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-2 rounded-md transition cursor-pointer group ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
            <div className="relative w-10 h-10 flex-shrink-0">
                <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full rounded object-cover" fallbackText="♪" />
                {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3">
                            <div className="w-[2px] bg-[#FF0000] rounded-full animate-soundwave-1" />
                            <div className="w-[2px] bg-[#FF0000] rounded-full animate-soundwave-2" />
                            <div className="w-[2px] bg-[#FF0000] rounded-full animate-soundwave-3" />
                        </div>
                    </div>
                )}
                {!isCurrent && (
                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center">
                        <Play size={16} className="text-white fill-white" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`font-medium truncate text-sm ${isCurrent ? 'text-[#FF0000]' : 'text-white'}`}>{track.title}</p>
                <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            </div>
        </div>
    );
}
