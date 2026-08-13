import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
    ChevronDown, Heart, Share2, ListMusic, ListPlus, Download, Check,
    Shuffle, Repeat, SkipBack, SkipForward, Play, Pause, Mic2
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useSwipe } from '../../hooks/useSwipe';
import { haptic } from '../../utils/haptic';
import { toast } from '../../stores/toastStore';
import { downloadTrack } from '../../services/download';
import CoverImage from '../CoverImage';
import Waveform from '../Waveform';
import Lyrics from '../Lyrics';
import BottomSheet from '../BottomSheet';
import AddToPlaylistModal from '../AddToPlaylistModal';

function formatTime(t: number) {
    if (isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileFullPlayer() {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const isBuffering = usePlayerStore(s => s.isBuffering);
    const isFullScreenOpen = usePlayerStore(s => s.isFullScreenOpen);
    const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
    const progress = usePlayerStore(s => s.progress);
    const duration = usePlayerStore(s => s.duration);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const nextTrack = usePlayerStore(s => s.nextTrack);
    const prevTrack = usePlayerStore(s => s.prevTrack);
    const playTrack = usePlayerStore(s => s.playTrack);
    const seekTo = usePlayerStore(s => s.seekTo);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const repeatMode = usePlayerStore(s => s.repeatMode);
    const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const queue = usePlayerStore(s => s.queue);

    const [showUpNext, setShowUpNext] = useState(false);
    const [showSheet, setShowSheet] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');

    const playedFraction = duration > 0 ? Math.min(1, progress / duration) : 0;

    const handleDragEnd = useCallback((_e: unknown, info: PanInfo) => {
        if (info.offset.y > 110 || info.velocity.y > 900) {
            haptic(10);
            setIsFullScreenOpen(false);
        }
    }, [setIsFullScreenOpen]);

    const artworkSwipe = useSwipe({
        onSwipeLeft: () => { haptic(8); nextTrack(); },
        onSwipeRight: () => { haptic(8); prevTrack(); },
        threshold: 45,
    });

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
            try { await navigator.clipboard.writeText(url); toast('Copied link'); } catch { /* noop */ }
        }
    }, [currentTrack]);

    const handleDownload = useCallback(async () => {
        if (!currentTrack) return;
        setDownloadStatus('downloading');
        try {
            await downloadTrack(currentTrack, 'audio');
            setDownloadStatus('done');
            toast('Downloaded');
            setTimeout(() => setDownloadStatus('idle'), 2000);
        } catch {
            setDownloadStatus('idle');
            toast('Download failed');
        }
    }, [currentTrack]);

    if (!currentTrack || !isFullScreenOpen) return null;

    const isLiked = likedTracks.has(currentTrack.id);

    return (
        <AnimatePresence>
            <motion.div
                key="sc-full-player"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.25}
                onDragEnd={handleDragEnd}
                className="fixed inset-0 z-[70] flex flex-col bg-[#121212] touch-pan-y"
            >
                {/* Blurred background cover */}
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        key={`bg-${currentTrack.cover_url}`}
                        src={currentTrack.cover_url}
                        alt=""
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] object-cover blur-3xl opacity-25"
                        draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/60" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col px-5 pt-4 pb-6">
                    {/* Header bar */}
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <button
                            onClick={() => setIsFullScreenOpen(false)}
                            className="p-2 rounded-full text-white/80 hover:text-white transition"
                            aria-label="Collapse player"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </button>
                        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest truncate px-2">
                            SoundCloud Playing
                        </p>
                        <button
                            onClick={() => setShowSheet(true)}
                            className="p-2 rounded-full text-white/80 hover:text-white transition"
                            aria-label="More options"
                        >
                            <ListMusic className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Artwork */}
                    <div {...artworkSwipe} className="flex-1 flex items-center justify-center min-h-0 py-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                                key={currentTrack.id}
                                initial={{ x: 80, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -80, opacity: 0 }}
                                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                                className="w-full max-w-[320px]"
                            >
                                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                    <img
                                        src={currentTrack.cover_url}
                                        alt={currentTrack.title}
                                        className="w-full aspect-square object-cover pointer-events-none"
                                        draggable={false}
                                    />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Track Titles */}
                    <div className="text-center mb-3 shrink-0">
                        <h2 className="text-xl font-extrabold text-white truncate">{currentTrack.title}</h2>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{currentTrack.artist}</p>
                    </div>

                    {/* Waveform Scrubber */}
                    <div className="shrink-0">
                        <Waveform
                            trackId={currentTrack.id}
                            played={playedFraction}
                            interactive
                            onSeek={(ratio) => seekTo(ratio * duration)}
                            height={48}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Social Actions */}
                    <div className="flex items-center justify-center gap-6 py-3 shrink-0">
                        <button onClick={handleLike} className={`p-2 transition ${isLiked ? 'text-[#ff5500]' : 'text-white/60 hover:text-white'}`} aria-label="Like">
                            <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        <button onClick={() => setShowAddToPlaylist(true)} className="p-2 text-white/60 hover:text-white transition" aria-label="Add to playlist">
                            <ListPlus className="w-5 h-5" />
                        </button>
                        <button onClick={handleShare} className="p-2 text-white/60 hover:text-white transition" aria-label="Share">
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button onClick={handleDownload} className="p-2 text-white/60 hover:text-white transition" aria-label="Download" disabled={downloadStatus === 'downloading'}>
                            {downloadStatus === 'downloading' ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : downloadStatus === 'done' ? (
                                <Check className="w-5 h-5 text-green-400" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                        </button>
                        <button onClick={() => setShowLyrics(true)} className="p-2 text-white/60 hover:text-white transition" aria-label="Lyrics">
                            <Mic2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Player Controls */}
                    <div className="flex items-center justify-center gap-7 shrink-0">
                        <button onClick={toggleShuffle} className={`p-2 transition ${shuffle ? 'text-[#ff5500]' : 'text-white/50 hover:text-white'}`} aria-label="Shuffle">
                            <Shuffle className="w-4 h-4" />
                        </button>
                        <button onClick={prevTrack} className="p-2 text-white hover:scale-110 active:scale-95 transition" aria-label="Previous">
                            <SkipBack className="w-7 h-7 fill-current" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 rounded-full bg-[#ff5500] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isBuffering ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-7 h-7 fill-current" />
                            ) : (
                                <Play className="w-7 h-7 fill-current ml-0.5" />
                            )}
                        </button>
                        <button onClick={nextTrack} className="p-2 text-white hover:scale-110 active:scale-95 transition" aria-label="Next">
                            <SkipForward className="w-7 h-7 fill-current" />
                        </button>
                        <button onClick={toggleRepeat} className={`p-2 transition ${repeatMode !== 'none' ? 'text-[#ff5500]' : 'text-white/50 hover:text-white'}`} aria-label="Repeat">
                            <Repeat className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Up Next Accordion */}
                    <button
                        onClick={() => setShowUpNext(v => !v)}
                        className="mt-3 shrink-0 flex items-center justify-center gap-2 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white/50 hover:text-white transition"
                    >
                        <ListMusic className="w-3.5 h-3.5" />
                        Up Next {showUpNext ? '▾' : '▸'}
                    </button>

                    <AnimatePresence>
                        {showUpNext && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden shrink-0"
                            >
                                <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1 pb-2">
                                    {queue.length === 0 ? (
                                        <p className="text-xs text-white/40 text-center py-3">Queue is empty</p>
                                    ) : (
                                        queue.map((track, i) => {
                                            const isCurrent = track.id === currentTrack.id;
                                            return (
                                                <button
                                                    key={`${track.id}-${i}`}
                                                    onClick={() => playTrack(track, queue)}
                                                    className={`w-full flex items-center gap-3 p-1.5 rounded-lg transition ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                >
                                                    <CoverImage src={track.cover_url} alt={track.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#ff5500]' : 'text-white'}`}>{track.title}</p>
                                                        <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <BottomSheet isOpen={showSheet} onClose={() => setShowSheet(false)} title={currentTrack.title}>
                <div className="flex flex-col gap-1 pb-4">
                    <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10 mb-1">
                        <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-12 h-12 rounded object-cover" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                            <p className="text-xs text-neutral-400 truncate">{currentTrack.artist}</p>
                        </div>
                    </div>
                    <button onClick={() => { setShowSheet(false); handleLike(); }} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-xs font-semibold text-white">
                        <Heart className={`w-4 h-4 ${isLiked ? 'text-[#ff5500]' : 'text-neutral-400'}`} fill={isLiked ? 'currentColor' : 'none'} />
                        {isLiked ? 'Remove from Likes' : 'Like'}
                    </button>
                    <button onClick={() => { setShowSheet(false); setShowAddToPlaylist(true); }} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-xs font-semibold text-white">
                        <ListPlus className="w-4 h-4 text-neutral-400" />
                        Add to playlist
                    </button>
                    <button onClick={() => { setShowSheet(false); handleShare(); }} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-xs font-semibold text-white">
                        <Share2 className="w-4 h-4 text-neutral-400" />
                        Share track
                    </button>
                </div>
            </BottomSheet>

            <Lyrics
                trackTitle={currentTrack.title}
                artistName={currentTrack.artist || ''}
                currentTime={progress}
                isOpen={showLyrics}
                onClose={() => setShowLyrics(false)}
                videoId={currentTrack.id}
            />

            {showAddToPlaylist && (
                <AddToPlaylistModal track={currentTrack} isOpen onClose={() => setShowAddToPlaylist(false)} />
            )}
        </AnimatePresence>
    );
}
