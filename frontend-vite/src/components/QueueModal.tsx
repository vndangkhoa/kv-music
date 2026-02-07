import { X, Play, Pause } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import CoverImage from './CoverImage';
import { Track } from '../types';

interface QueueModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function QueueModal({ isOpen, onClose }: QueueModalProps) {
    const { queue, currentTrack, playTrack, isPlaying, togglePlay } = usePlayer();

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
                                if (track.id === currentTrack?.id) return null;

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
                            <div className="w-[2px] bg-[#1DB954] rounded-full animate-soundwave-1" />
                            <div className="w-[2px] bg-[#1DB954] rounded-full animate-soundwave-2" />
                            <div className="w-[2px] bg-[#1DB954] rounded-full animate-soundwave-3" />
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
                <p className={`font-medium truncate text-sm ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</p>
                <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
            </div>
        </div>
    );
}
