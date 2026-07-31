import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Share2, Download, ListMusic, ChevronLeft, ChevronUp, ChevronDown, Check, Music, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { useLyrics } from '../../hooks/useLyrics';
import { libraryService } from '../../services/library';
import CoverImage from '../CoverImage';
import VideoPlayer from '../VideoPlayer';
import type { Track } from '../../types';

function formatTime(t: number) {
    if (isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileFullPlayer() {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const isFullScreenOpen = usePlayerStore(s => s.isFullScreenOpen);
    const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
    const progress = usePlayerStore(s => s.progress);
    const duration = usePlayerStore(s => s.duration);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const nextTrack = usePlayerStore(s => s.nextTrack);
    const prevTrack = usePlayerStore(s => s.prevTrack);
    const playTrack = usePlayerStore(s => s.playTrack);
    const queue = usePlayerStore(s => s.queue);
    const currentIndex = usePlayerStore(s => s.currentIndex);
    const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);
    const seekTo = usePlayerStore(s => s.seekTo);
    const setProgress = usePlayerStore(s => s.setProgress);

    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'foryou' | 'lyrics' | 'similar'>('foryou');
    const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
    const [followingArtists, setFollowingArtists] = useState<Set<string>>(new Set());
    const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(false);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
    const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
    const [showQueue, setShowQueue] = useState(false);

    const activeLyricRef = useRef<HTMLParagraphElement>(null);

    const nextTracks = useMemo(() => {
        if (queue.length === 0 || currentIndex < 0) return [];
        return queue.slice(currentIndex + 1, currentIndex + 11);
    }, [queue, currentIndex]);

    const prevTrackData = useMemo(() => {
        if (queue.length === 0 || currentIndex <= 0) return null;
        return queue[currentIndex - 1];
    }, [queue, currentIndex]);

    const nextTrackData = useMemo(() => {
        if (queue.length === 0 || currentIndex < 0 || currentIndex >= queue.length - 1) return null;
        return queue[currentIndex + 1];
    }, [queue, currentIndex]);

    const {
        lyrics,
        syncedLines,
        activeIndex,
        loading: loadingLyrics
    } = useLyrics(
        currentTrack?.title || '',
        currentTrack?.artist || '',
        progress,
        true,
        currentTrack?.id
    );

    // Auto-scroll lyrics in full lyrics tab
    useEffect(() => {
        if (activeTab === 'lyrics' && activeLyricRef.current) {
            activeLyricRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeIndex, activeTab]);

    const currentLyricLine = activeIndex >= 0 ? syncedLines[activeIndex]?.text : '';
    const nextLyricLine = activeIndex >= 0 && activeIndex + 1 < syncedLines.length
        ? syncedLines[activeIndex + 1]?.text : '';

    const plainLyricLines = useMemo(() => {
        if (lyrics) return lyrics.split('\n').filter(l => l.trim());
        return [];
    }, [lyrics]);

    const currentPlainLine = plainLyricLines.length > 0
        ? plainLyricLines[Math.floor((progress / (duration || 1)) * plainLyricLines.length) % plainLyricLines.length]
        : '';

    const displayLine1 = syncedLines.length > 0 ? currentLyricLine : currentPlainLine;
    const displayLine2 = syncedLines.length > 0 ? nextLyricLine : '';

    // Horizontal Swipe on Cover to change track WITHOUT closing player
    const handleHorizontalSwipeEnd = useCallback((_event: any, info: PanInfo) => {
        const threshold = 40;
        const velocityThreshold = 150;
        if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
            nextTrack();
        } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
            prevTrack();
        }
    }, [nextTrack, prevTrack]);

    const isFollowing = currentTrack ? followingArtists.has(currentTrack.artist) : false;

    const toggleFollow = useCallback(async () => {
        if (!currentTrack) return;
        const artistTrack: Track = {
            id: `artist-${currentTrack.artist}`,
            title: currentTrack.artist,
            artist: currentTrack.artist,
            album: 'Artist',
            cover_url: currentTrack.cover_url,
        };
        usePlayerStore.getState().toggleLike(artistTrack);
        setFollowingArtists(prev => {
            const next = new Set(prev);
            if (next.has(currentTrack.artist)) {
                next.delete(currentTrack.artist);
            } else {
                next.add(currentTrack.artist);
            }
            return next;
        });
    }, [currentTrack]);

    const handleSwipeEnd = useCallback((_event: any, info: PanInfo) => {
        const threshold = 60;
        if (info.offset.y < -threshold) {
            nextTrack();
        } else if (info.offset.y > threshold) {
            prevTrack();
        }
    }, [nextTrack, prevTrack]);

    const handleModeSwitch = useCallback((mode: 'audio' | 'video') => {
        if (mode === 'video') {
            if (isPlaying) togglePlay();
            setIsVideoMode(true);
        } else {
            seekTo(progress);
            if (!isPlaying) togglePlay();
            setIsVideoMode(false);
        }
        setPlayerMode(mode);
    }, [isPlaying, togglePlay, setIsVideoMode, seekTo, progress]);

    useEffect(() => {
        setPlayerMode('audio');
    }, [currentTrack?.id]);

    useEffect(() => {
        if (activeTab === 'similar' && currentTrack) {
            setLoadingRelated(true);
            libraryService.getRelatedContent(currentTrack.artist, 'artist', 20)
                .then(data => {
                    setRelatedTracks(data.tracks || []);
                })
                .catch(() => setRelatedTracks([]))
                .finally(() => setLoadingRelated(false));
        }
    }, [activeTab, currentTrack?.id]);

    const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        usePlayerStore.getState().setProgress(time);
    }, []);

    const handleProgressCommit = useCallback(() => {
        usePlayerStore.getState().seekTo(usePlayerStore.getState().progress);
    }, []);

    const handleShare = useCallback(async () => {
        if (!currentTrack) return;
        const shareData = {
            title: currentTrack.title,
            text: `${currentTrack.title} - ${currentTrack.artist}`,
            url: `https://music.youtube.com/watch?v=${currentTrack.id}`,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch {}
        } else {
            await navigator.clipboard.writeText(shareData.url);
            setShareStatus('copied');
            setTimeout(() => setShareStatus('idle'), 2000);
        }
    }, [currentTrack]);

    const handleDownload = useCallback(async () => {
        if (!currentTrack) return;
        setDownloadStatus('downloading');
        try {
            const response = await fetch(`/api/stream/${currentTrack.id}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentTrack.artist} - ${currentTrack.title}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDownloadStatus('done');
            setTimeout(() => setDownloadStatus('idle'), 2000);
        } catch {
            setDownloadStatus('idle');
        }
    }, [currentTrack]);

    const handleAddToQueue = useCallback(() => {
        setShowQueue(prev => !prev);
    }, []);

    if (!currentTrack || !isFullScreenOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed inset-0 z-[45] flex flex-col"
            >
                {/* Full-screen blurred background - current song cover */}
                <div className="absolute inset-0 overflow-hidden bg-black">
                    <img
                        key={currentTrack.cover_url}
                        src={currentTrack.cover_url}
                        alt=""
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] object-cover blur-3xl opacity-60"
                        draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>

                {/* Previous song ghost (top) - peeks below lyrics - only on For You tab */}
                {activeTab === 'foryou' && playerMode === 'audio' && prevTrackData && (
                    <div 
                        className="absolute top-[120px] left-1/2 -translate-x-1/2 z-[1] pointer-events-none"
                        style={{
                            maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)'
                        }}
                    >
                        <motion.div 
                            className="w-[140px] h-[140px] rounded-xl overflow-hidden opacity-35 blur-[1px]"
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <img
                                key={prevTrackData.cover_url}
                                src={prevTrackData.cover_url}
                                alt=""
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                        </motion.div>
                    </div>
                )}

                {/* Next song ghost (bottom) - peeks above controls - only on For You tab */}
                {activeTab === 'foryou' && playerMode === 'audio' && nextTrackData && (
                    <div 
                        className="absolute bottom-[330px] left-1/2 -translate-x-1/2 z-[1] pointer-events-none"
                        style={{
                            maskImage: 'linear-gradient(to top, transparent 0%, black 50%)',
                            WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 50%)'
                        }}
                    >
                        <motion.div 
                            className="w-[140px] h-[140px] rounded-xl overflow-hidden opacity-35 blur-[1px]"
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                        >
                            <img
                                key={nextTrackData.cover_url}
                                src={nextTrackData.cover_url}
                                alt=""
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                        </motion.div>
                    </div>
                )}

                {/* Content overlay */}
                <div className="relative z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar">
                    {/* Top Navigation */}
                    <div className="flex items-center justify-between px-4 pt-6 pb-1 shrink-0">
                        <button
                            onClick={() => setIsFullScreenOpen(false)}
                            className="p-1 text-white/60 hover:text-white transition"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="flex bg-black/40 backdrop-blur-md rounded-full p-0.5 border border-white/10">
                                <button
                                    onClick={() => handleModeSwitch('audio')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                        playerMode === 'audio' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    <Music className="w-3 h-3" />
                                    Song
                                </button>
                                <button
                                    onClick={() => handleModeSwitch('video')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                        playerMode === 'video' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    <Video className="w-3 h-3" />
                                    Video
                                </button>
                            </div>
                            <button
                                onClick={() => setActiveTab('foryou')}
                                className={`text-sm font-bold transition-colors ${
                                    activeTab === 'foryou' ? 'text-white' : 'text-white/40'
                                }`}
                            >
                                For You
                            </button>
                            <button
                                onClick={() => setActiveTab('lyrics')}
                                className={`text-sm font-bold transition-colors ${
                                    activeTab === 'lyrics' ? 'text-cyan-400' : 'text-white/40'
                                }`}
                            >
                                Lyrics
                            </button>
                            <button
                                onClick={() => setActiveTab('similar')}
                                className={`text-sm font-bold transition-colors ${
                                    activeTab === 'similar' ? 'text-white' : 'text-white/40'
                                }`}
                            >
                                Similar
                            </button>
                        </div>
                        <button
                            onClick={() => { setIsFullScreenOpen(false); navigate('/search'); }}
                            className="p-1 text-white/60 hover:text-white transition"
                        >
                            <Search className="w-5 h-5" />
                        </button>
                    </div>

                    {/* For You Tab */}
                    {activeTab === 'foryou' && (
                        <>
                            {/* Lyrics Display Preview - Tapping opens full Lyrics tab */}
                            <div
                                onClick={() => setActiveTab('lyrics')}
                                className="px-6 py-3 min-h-[64px] flex flex-col justify-center shrink-0 cursor-pointer hover:opacity-90 transition group"
                            >
                                {displayLine1 ? (
                                    <>
                                        <p className="text-base sm:text-lg font-bold text-white mb-0.5 leading-tight line-clamp-1 drop-shadow-lg group-hover:text-cyan-300 transition">
                                            {displayLine1}
                                        </p>
                                        {displayLine2 && (
                                            <p className="text-sm text-white/50 leading-tight line-clamp-1 drop-shadow-lg">
                                                {displayLine2}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-cyan-400/80 text-center drop-shadow-lg font-bold">
                                        🎵 Chạm để xem lời bài hát đầy đủ
                                    </p>
                                )}
                            </div>

                            {/* Horizontal Swipeable cover / Video */}
                            <div className="flex-1 flex items-center justify-center px-6 py-2 min-h-0">
                                {playerMode === 'video' ? (
                                    <div className="w-full max-w-[400px]">
                                        <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black relative">
                                            <VideoPlayer
                                                videoId={currentTrack.id}
                                                isPlaying={isPlaying}
                                                onTimeUpdate={(time) => { if (Math.abs(time - progress) > 2) setProgress(time); }}
                                                onPlay={() => { if (!isPlaying) togglePlay(); }}
                                                onPause={() => { if (isPlaying) togglePlay(); }}
                                                onEnded={nextTrack}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.2}
                                        onDragEnd={handleHorizontalSwipeEnd}
                                        className="w-full max-w-[340px] cursor-grab active:cursor-grabbing select-none"
                                    >
                                        <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 30px 80px rgba(0,0,0,0.5)' }}>
                                            <img
                                                src={currentTrack.cover_url}
                                                alt={currentTrack.title}
                                                className="w-full aspect-square object-cover pointer-events-none"
                                                draggable={false}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Horizontal Swipe Hint - only in audio mode */}
                            {playerMode === 'audio' && (
                                <div className="flex justify-center py-1 shrink-0">
                                    <span className="text-[10px] text-cyan-400/70 font-semibold tracking-wider">
                                        ← Vuốt trái/phải để đổi bài →
                                    </span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Dedicated Full Lyrics Tab */}
                    {activeTab === 'lyrics' && (
                        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 text-center my-auto flex flex-col justify-center max-h-[460px]">
                            {loadingLyrics ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-neutral-400">Đang tải lời bài hát...</p>
                                </div>
                            ) : syncedLines.length > 0 ? (
                                <div className="space-y-6 py-6 max-h-full overflow-y-auto no-scrollbar">
                                    {syncedLines.map((line, idx) => (
                                        <p
                                            key={idx}
                                            ref={idx === activeIndex ? activeLyricRef : null}
                                            onClick={() => seekTo(line.time)}
                                            className={`font-bold transition-all duration-300 cursor-pointer py-1.5 ${
                                                idx === activeIndex
                                                    ? 'text-cyan-300 text-xl sm:text-2xl scale-105 drop-shadow-[0_0_20px_rgba(0,168,255,0.7)] font-black'
                                                    : 'text-neutral-500 hover:text-neutral-300 text-sm sm:text-base'
                                            }`}
                                        >
                                            {line.text}
                                        </p>
                                    ))}
                                </div>
                            ) : lyrics ? (
                                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed text-neutral-300 py-6 max-h-full overflow-y-auto no-scrollbar">
                                    {lyrics}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-500">
                                    <p className="text-sm font-bold text-neutral-400">Chưa có lời bài hát đồng bộ</p>
                                    <p className="text-xs">Thưởng thức âm nhạc chất lượng cao trên kv-music</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Similar Tab */}
                    {activeTab === 'similar' && (
                        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2">
                            {loadingRelated ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : relatedTracks.length > 0 ? (
                                <div className="space-y-2 pb-4">
                                    {relatedTracks.map((track) => (
                                        <button
                                            key={track.id}
                                            onClick={() => playTrack(track, relatedTracks)}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-left"
                                        >
                                            <CoverImage
                                                src={track.cover_url}
                                                alt={track.title}
                                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                                                <p className="text-xs text-white/50 truncate">{track.artist}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-white/30">
                                                {track.view_count != null && (
                                                    <span className="text-[10px]">{(track.view_count / 1000).toFixed(0)}k</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-20">
                                    <p className="text-white/30 text-sm">No related tracks found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Artist Info */}
                    <div className="px-6 pt-3 pb-1 shrink-0">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full mb-2">
                            <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">♪</span>
                            </div>
                            <span className="text-[11px] font-medium text-white/80">{currentTrack.artist}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate drop-shadow-lg">
                                        {currentTrack.title}
                                    </h2>
                                    {currentTrack.bitrate && (
                                        <span className="shrink-0 px-2 py-0.5 bg-white/15 rounded text-[10px] font-bold text-white/70">
                                            {currentTrack.bitrate}kbps
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-sm text-white/50 font-medium truncate">
                                        {currentTrack.artist}
                                    </span>
                                    <button
                                        onClick={toggleFollow}
                                        className={`shrink-0 px-4 py-1 rounded-full text-xs font-bold border transition ${
                                            isFollowing
                                                ? 'bg-white text-black border-white'
                                                : 'text-white/70 border-white/30 hover:border-white/60'
                                        }`}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-2 shrink-0">
                        <div className="flex items-center justify-center gap-8">
                            <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                                {shareStatus === 'copied' ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
                                <span className="text-[9px] font-medium">{shareStatus === 'copied' ? 'Copied' : 'Share'}</span>
                            </button>
                            <button onClick={handleDownload} className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition" disabled={downloadStatus === 'downloading'}>
                                {downloadStatus === 'downloading' ? (
                                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                ) : downloadStatus === 'done' ? (
                                    <Check className="w-5 h-5 text-green-400" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                                <span className="text-[9px] font-medium">{downloadStatus === 'downloading' ? 'Saving' : downloadStatus === 'done' ? 'Saved' : 'Download'}</span>
                            </button>
                            <button onClick={handleAddToQueue} className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition">
                                <ListMusic className="w-5 h-5" />
                                <span className="text-[9px] font-medium">Queue</span>
                            </button>
                        </div>
                    </div>

                    {/* Queue Panel */}
                    <AnimatePresence>
                        {showQueue && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden shrink-0"
                            >
                                <div className="px-6 py-3">
                                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Up Next</p>
                                    {nextTracks.length > 0 ? (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                                            {nextTracks.map((track, i) => (
                                                <button
                                                    key={`${track.id}-${i}`}
                                                    onClick={() => playTrack(track, queue)}
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-left"
                                                >
                                                    <CoverImage
                                                        src={track.cover_url}
                                                        alt={track.title}
                                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white truncate">{track.title}</p>
                                                        <p className="text-[11px] text-white/40 truncate">{track.artist}</p>
                                                    </div>
                                                    <span className="text-[10px] text-white/25 shrink-0">{i + 1}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-white/25 py-4 text-center">No upcoming songs</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Progress Bar */}
                    <div className="px-6 py-1 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-white/40 font-mono tabular-nums">{formatTime(progress)}</span>
                            <span className="text-[10px] text-white/40 font-mono tabular-nums">{formatTime(duration)}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={progress}
                            onChange={handleProgressChange}
                            onMouseUp={handleProgressCommit}
                            onTouchEnd={handleProgressCommit}
                            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                            style={{
                                background: `linear-gradient(to right, white ${duration > 0 ? (progress / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration > 0 ? (progress / duration) * 100 : 0}%)`
                            }}
                        />
                    </div>

                    {/* Bottom Spacer for Nav */}
                    <div className="h-24 shrink-0" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
