import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shuffle, Repeat, SkipBack, SkipForward, Play, Pause, Heart,
    ListMusic, Mic2, Sparkles, Share2, Volume2, X, Eye,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { toast } from '../../stores/toastStore';
import { haptic } from '../../utils/haptic';
import { formatCount } from '../../utils/format';
import CoverImage from '../CoverImage';
import Waveform from '../Waveform';
import Lyrics from '../Lyrics';
import DownloadMenu from '../DownloadMenu';

type DrawerTab = 'queue' | 'lyrics' | 'related' | null;

export default function PlayerBar() {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const isBuffering = usePlayerStore(s => s.isBuffering);
    const progress = usePlayerStore(s => s.progress);
    const duration = usePlayerStore(s => s.duration);
    const volume = usePlayerStore(s => s.volume);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const nextTrack = usePlayerStore(s => s.nextTrack);
    const prevTrack = usePlayerStore(s => s.prevTrack);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const repeatMode = usePlayerStore(s => s.repeatMode);
    const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
    const seekTo = usePlayerStore(s => s.seekTo);
    const setVolume = usePlayerStore(s => s.setVolume);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const queue = usePlayerStore(s => s.queue);
    const playTrack = usePlayerStore(s => s.playTrack);

    const [drawer, setDrawer] = useState<DrawerTab>(null);
    const [showVolume, setShowVolume] = useState(false);

    const playedFraction = duration > 0 ? Math.min(1, progress / duration) : 0;

    const handleLike = useCallback(async () => {
        if (!currentTrack) return;
        await toggleLike(currentTrack);
        toast(likedTracks.has(currentTrack.id) ? 'Removed from Likes' : 'Added to Likes');
        haptic(8);
    }, [currentTrack, toggleLike, likedTracks]);

    const handleShare = useCallback(async () => {
        if (!currentTrack) return;
        const url = `${window.location.origin}/track/${encodeURIComponent(currentTrack.id)}`;
        if (navigator.share) {
            try { await navigator.share({ title: currentTrack.title, text: `${currentTrack.title} - ${currentTrack.artist}`, url }); } catch { /* noop */ }
        } else {
            try { await navigator.clipboard.writeText(url); toast('Copied track link'); } catch { /* noop */ }
        }
    }, [currentTrack]);

    const handleSeek = useCallback((ratio: number) => {
        if (!duration) return;
        seekTo(ratio * duration);
    }, [duration, seekTo]);

    useKeyboardShortcuts({
        onSpace: () => currentTrack && togglePlay(),
        onSeekBack: () => seekTo(Math.max(0, progress - 10)),
        onSeekForward: () => seekTo(Math.min(duration || 0, progress + 10)),
        onVolumeDown: () => setVolume(Math.max(0, volume - 0.1)),
        onVolumeUp: () => setVolume(Math.min(1, volume + 0.1)),
        onEscape: () => setDrawer(null),
    });

    if (!currentTrack) return null;

    return (
        <>
            <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-[55] bg-[#121212] border-t border-white/10 px-4 py-2 items-center gap-4 select-none h-14">
                {/* Left: Playback Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={prevTrack} className="p-1.5 rounded text-neutral-300 hover:text-white transition" aria-label="Previous">
                        <SkipBack className="w-4 h-4 fill-current" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-full bg-[#ff5500] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isBuffering ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                        ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                    </button>
                    <button onClick={nextTrack} className="p-1.5 rounded text-neutral-300 hover:text-white transition" aria-label="Next">
                        <SkipForward className="w-4 h-4 fill-current" />
                    </button>
                    <button onClick={toggleShuffle} className={`p-1.5 rounded transition ${shuffle ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-white'}`} aria-label="Shuffle">
                        <Shuffle className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={toggleRepeat} className={`p-1.5 rounded transition ${repeatMode !== 'none' ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-white'}`} aria-label="Repeat">
                        <Repeat className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Center: Track Details & Waveform Progress */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <CoverImage
                        src={currentTrack.cover_url}
                        alt={currentTrack.title}
                        className="w-9 h-9 rounded flex-shrink-0 object-cover"
                        fallbackText="♪"
                    />
                    <div className="w-36 flex-shrink-0 min-w-0">
                        <p className="text-xs font-bold text-white truncate hover:text-[#ff5500] cursor-pointer transition">{currentTrack.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{currentTrack.artist}</p>
                    </div>

                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 font-mono w-8 text-right">
                            {Math.floor(progress / 60)}:{Math.floor(progress % 60).toString().padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                            <Waveform
                                trackId={currentTrack.id}
                                played={playedFraction}
                                interactive
                                onSeek={handleSeek}
                                height={32}
                                className="w-full"
                            />
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono w-8">
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Right: Social & Output Controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={handleLike}
                        className={`p-1.5 rounded transition ${likedTracks.has(currentTrack.id) ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-white'}`}
                        aria-label="Like"
                    >
                        <Heart className="w-4 h-4" fill={likedTracks.has(currentTrack.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={handleShare} className="p-1.5 rounded text-neutral-400 hover:text-white transition" aria-label="Share">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <DownloadMenu
                        tracks={[currentTrack]}
                        className="p-1.5 rounded text-neutral-400 hover:text-white transition"
                        iconClassName="w-4 h-4"
                    />

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    <button onClick={() => setDrawer(drawer === 'queue' ? null : 'queue')} className={`p-1.5 rounded transition ${drawer === 'queue' ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-white'}`} aria-label="Queue">
                        <ListMusic className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDrawer(drawer === 'lyrics' ? null : 'lyrics')} className={`p-1.5 rounded transition ${drawer === 'lyrics' ? 'text-[#ff5500]' : 'text-neutral-400 hover:text-white'}`} aria-label="Lyrics">
                        <Mic2 className="w-4 h-4" />
                    </button>

                    {/* Volume Hover Slider */}
                    <div
                        className="flex items-center"
                        onMouseEnter={() => setShowVolume(true)}
                        onMouseLeave={() => setShowVolume(false)}
                    >
                        <button className="p-1.5 rounded text-neutral-400 hover:text-white transition" aria-label="Volume">
                            <Volume2 className="w-4 h-4" />
                        </button>
                        <motion.div
                            initial={false}
                            animate={{ width: showVolume ? 70 : 0, opacity: showVolume ? 1 : 0 }}
                            className="overflow-hidden"
                        >
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-[70px] h-1 accent-[#ff5500]"
                            />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Slide-over Drawer (Next Up / Lyrics / Related) */}
            <AnimatePresence>
                {drawer && (
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="hidden md:flex fixed top-12 right-0 bottom-14 z-[58] w-80 bg-[#181818] border-l border-white/10 flex-col shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                            <div className="flex items-center gap-1">
                                {(['queue', 'lyrics', 'related'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setDrawer(tab)}
                                        className={`px-2.5 py-1 rounded text-xs font-bold capitalize transition ${
                                            drawer === tab ? 'bg-[#ff5500] text-white' : 'text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {tab === 'queue' ? 'Next Up' : tab}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setDrawer(null)} className="p-1 text-neutral-400 hover:text-white transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar p-3">
                            {drawer === 'queue' && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1">Next up</p>
                                    {queue.length === 0 ? (
                                        <p className="text-xs text-neutral-500 text-center py-8">Queue is empty</p>
                                    ) : (
                                        queue.map((track, idx) => {
                                            const isCurrent = track.id === currentTrack.id;
                                            return (
                                                <button
                                                    key={`${track.id}-${idx}`}
                                                    onClick={() => playTrack(track, queue)}
                                                    className={`w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition text-left ${isCurrent ? 'bg-white/10' : ''}`}
                                                >
                                                    <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#ff5500]' : 'text-white'}`}>{track.title}</p>
                                                        <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {drawer === 'lyrics' && (
                                <Lyrics
                                    trackTitle={currentTrack.title}
                                    artistName={currentTrack.artist || ''}
                                    currentTime={progress}
                                    isOpen
                                    onClose={() => setDrawer(null)}
                                    videoId={currentTrack.id}
                                    variant="panel"
                                />
                            )}

                            {drawer === 'related' && <RelatedPanel onPlay={(t, list) => playTrack(t, list)} />}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}

function RelatedPanel({ onPlay }: { onPlay: (t: any, list: any[]) => void }) {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentTrack) return;
        setLoading(true);
        import('../../services/library').then(({ libraryService }) =>
            libraryService.getRelatedContent(currentTrack.artist || currentTrack.title, 'track', 12)
                .then((data: any) => setTracks(data.tracks || []))
                .catch(() => setTracks([]))
                .finally(() => setLoading(false))
        );
    }, [currentTrack]);

    if (loading) {
        return (
            <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-10 bg-white/5 rounded" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#ff5500]" /> Related tracks
            </p>
            {tracks.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-8">No related tracks found</p>
            ) : (
                tracks.map((track, idx) => (
                    <button
                        key={`${track.id}-${idx}`}
                        onClick={() => onPlay(track, tracks)}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/5 transition text-left"
                    >
                        <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{track.title}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                        </div>
                    </button>
                ))
            )}
        </div>
    );
}
