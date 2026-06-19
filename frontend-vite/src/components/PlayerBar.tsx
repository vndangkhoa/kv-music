import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Download, PlusCircle, Mic2, Heart, Loader2, ListMusic, MonitorSpeaker, Maximize2, MoreHorizontal, Info, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { usePlayer } from "../context/PlayerContext";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TechSpecs from './TechSpecs';
import AddToPlaylistModal from "./AddToPlaylistModal";
import Lyrics from './Lyrics';
import VideoPlayer from './VideoPlayer';
import QueueModal from './QueueModal';
import Recommendations from './Recommendations';
import { useDominantColor } from '../hooks/useDominantColor';
import { useLyrics } from '../hooks/useLyrics';
import CoverImage from './CoverImage';

export default function PlayerBar() {
    const {
        currentTrack, isPlaying, isBuffering, togglePlay, setBuffering,
        likedTracks, toggleLike, nextTrack, prevTrack, shuffle, toggleShuffle,
        repeatMode, toggleRepeat, audioQuality, isLyricsOpen, toggleLyrics, closeLyrics, openLyrics,
        isFullScreenOpen, setIsFullScreenOpen, queue, isRightPanelOpen, rightPanelTab, toggleRightPanel, closeRightPanel
    } = usePlayer();

    const dominantColor = useDominantColor(currentTrack?.cover_url);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const [hasInteractedWithLyrics, setHasInteractedWithLyrics] = useState(false);
    const { currentLine } = useLyrics(
        currentTrack?.title || '',
        currentTrack?.artist || '',
        progress,
        isLyricsOpen || hasInteractedWithLyrics, // Only fetch if opened or previously interacted
        currentTrack?.id || undefined // Pass video ID for better lyrics search
    );

    // Swipe Logic
    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartY.current === null) return;

        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchStartY.current - touchEndY;

        // Swipe Up (positive diff) > 100px (Increased threshold to prevent accidental triggers)
        if (diffY > 100) {
            setHasInteractedWithLyrics(true);
            openLyrics(); // Explicitly Open Lyrics
        }

        touchStartY.current = null;
    };

    const [volume, setVolume] = useState(1);
    const navigate = useNavigate();
    const location = useLocation();

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [isTechSpecsOpen, setIsTechSpecsOpen] = useState(false);

    // Removed isQueueOpen since queue is handled by RightPanel
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
    const [isIdle, setIsIdle] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetIdleTimer = () => {
        setIsIdle(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (playerMode === 'video' && isPlaying) {
            idleTimerRef.current = setTimeout(() => {
                setIsIdle(true);
            }, 3000);
        }
    };

    // Force close lyrics on mount (Defensive fix for "Open on first play")
    useEffect(() => {
        closeLyrics();
    }, []);

    // Auto-close fullscreen player on navigation
    useEffect(() => {
        setPlayerMode('audio');
        setIsFullScreenOpen(false);
    }, [location.pathname]);

    // Reset to audio mode when track changes
    useEffect(() => {
        setPlayerMode('audio');
        setIsIdle(false);
        setIsVideoReady(false);
    }, [currentTrack?.id]);

    // Handle idle timer when playing video
    useEffect(() => {
        resetIdleTimer();
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [isPlaying, playerMode]);

    // Handle audio/video mode switching
    const handleModeSwitch = (mode: 'audio' | 'video') => {
        if (mode === 'video') {
            audioRef.current?.pause();
            setIsVideoReady(false);
            // Video will autoplay via URL parameter
        } else {
            // Switching back to audio - sync audio time with video progress
            if (audioRef.current) {
                audioRef.current.currentTime = progress;
                if (isPlaying) {
                    audioRef.current.play().catch(() => { });
                }
            }
        }
        setPlayerMode(mode);
    };

    // Handle play/pause for video mode - controlled by Artplayer via isPlaying prop
    const handleVideoPlayPause = () => {
        if (playerMode !== 'video') return;
        
        // Toggle play state - Artplayer will respond via the isPlaying prop
        togglePlay();
    };

    // ... (rest of useEffects)

    // ... inside return ...


    const isDragging = useRef(false);

    // Audio source effect
    const streamFailCount = useRef(0);

    useEffect(() => {
        if (currentTrack && audioRef.current && currentTrack.url) {
            const isSameUrl = audioRef.current.src === currentTrack.url ||
                (currentTrack.url.startsWith('/') && audioRef.current.src.endsWith(currentTrack.url)) ||
                (audioRef.current.src.includes(currentTrack.id));

            if (isSameUrl) return;

            audioRef.current.src = currentTrack.url;
            streamFailCount.current = 0;
            if (isPlaying) {
                audioRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Play error:", e);
                });
            }
        }
    }, [currentTrack?.url]);

    // Handle audio stream errors - auto-fallback to YouTube embed
    const handleAudioError = () => {
        if (!currentTrack) return;
        streamFailCount.current += 1;
        if (streamFailCount.current <= 2 && playerMode === 'audio') {
            console.warn(`[PlayerBar] Stream failed for ${currentTrack.id}, falling back to YouTube embed`);
            setPlayerMode('video');
        }
    };

    // Play/Pause effect - skip when in video mode (YouTube controls playback)
    useEffect(() => {
        if (playerMode === 'video') return; // Skip audio control in video mode
        
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Play error:", e);
                });
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
            } else {
                audioRef.current.pause();
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
            }
        }
    }, [isPlaying, playerMode]);

    // Volume Effect
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Note: YouTube iframe play/pause sync is handled via URL autoplay parameter
    // Cross-origin restrictions prevent reliable postMessage control

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            // Only update progress if NOT dragging, to prevent stutter/fighting
            if (!isDragging.current) {
                setProgress(audioRef.current.currentTime);
            }

            if (!isNaN(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
            }
            // Update position state for lock screen
            if ('mediaSession' in navigator && !isNaN(audioRef.current.duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audioRef.current.duration,
                        playbackRate: audioRef.current.playbackRate,
                        position: audioRef.current.currentTime
                    });
                } catch { /* ignore */ }
            }
        }
    };

    // Called while dragging - updates visual slider only
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        isDragging.current = true;
        const time = parseFloat(e.target.value);
        setProgress(time);
    };

    // Called on release - commits the seek to audio engine
    const handleSeekCommit = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = progress;
        }
        // Small delay to prevent onTimeUpdate from jumping back immediately
        setTimeout(() => {
            isDragging.current = false;
        }, 200);
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const handleDownload = () => {
        if (!currentTrack) return;
        const url = `/api/download?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}`;
        window.open(url, '_blank');
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!currentTrack) return null;

    return (
        <>
            <footer
                className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2 right-2 fold:left-0 fold:right-0 fold:bottom-0 h-16 fold:h-[90px] bg-[#0f0f0f] border-t border-white/5 flex items-center justify-between z-[60] rounded-lg fold:rounded-none shadow-xl fold:shadow-none transition-all duration-300 relative select-none"
                onClick={() => {
                    if (window.innerWidth < 1024) {
                        setIsFullScreenOpen(true);
                    }
                }}
            >
                <audio
                    ref={audioRef}
                    preload="auto"
                    onEnded={nextTrack}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => setBuffering(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate}
                    onError={handleAudioError}
                />

                {/* YTM Scrubber / Progress Bar (Full width across top of bottom player bar) */}
                <div 
                    className="absolute top-[-3px] left-0 right-0 h-[6px] group cursor-pointer z-50 select-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Background track */}
                    <div className="absolute inset-0 bg-neutral-800 rounded-full" />
                    {/* Active track progress */}
                    <div 
                        className="absolute top-0 bottom-0 left-0 bg-[#FF0000] rounded-full transition-all duration-100" 
                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                    />
                    {/* Hover thumb */}
                    <div 
                        className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#FF0000] -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" 
                        style={{ left: `${(progress / (duration || 1)) * 100}%` }}
                    />
                    {/* Invisible HTML range input for interactions */}
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={progress}
                        onChange={handleSeek}
                        onMouseUp={handleSeekCommit}
                        onTouchEnd={handleSeekCommit}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                {/* Mobile Layout (Only visible when screen is small) */}
                <div className="flex items-center gap-3 flex-grow fold:hidden min-w-0 pr-4 pl-4 select-none">
                    <CoverImage src={currentTrack.cover_url} alt="Cover" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex flex-col justify-center min-w-0">
                        <span className="text-xs font-bold text-white truncate leading-tight">{currentTrack.title}</span>
                        <span className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{currentTrack.artist}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 pr-4 fold:hidden" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={togglePlay}
                        className="text-white active:scale-90 transition"
                    >
                        {isBuffering ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />)}
                    </button>
                    <button
                        onClick={nextTrack}
                        className="text-neutral-400 hover:text-white transition active:scale-95"
                    >
                        <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] fold:hidden bg-white/10">
                    <div 
                        className="h-full bg-[#FF0000] transition-all duration-100" 
                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                    />
                </div>

                {/* Desktop Layout - Left Section: Playback Controls & Timer */}
                <div className="hidden fold:flex items-center gap-4 fold:w-[30%] text-white pl-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-5">
                        <button onClick={prevTrack} className="text-neutral-400 hover:text-white active:scale-95 transition-all">
                            <SkipBack className="w-5 h-5 fill-current" />
                        </button>
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-md animate-in duration-300"
                        >
                            {isBuffering ? (
                                <Loader2 className="w-4 h-4 animate-spin text-black" />
                            ) : isPlaying ? (
                                <Pause className="w-4 h-4 fill-black text-black" />
                            ) : (
                                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            )}
                        </button>
                        <button onClick={nextTrack} className="text-neutral-400 hover:text-white active:scale-95 transition-all">
                            <SkipForward className="w-5 h-5 fill-current" />
                        </button>
                    </div>

                    <div className="text-xs text-neutral-400 font-bold ml-2">
                        <span>{formatTime(progress)}</span>
                        <span className="mx-1 text-neutral-600">/</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Desktop Layout - Center Section: Album Art & Track Info & Likes */}
                <div className="hidden fold:flex flex-1 min-w-0 items-center justify-center gap-6">
                    <div className="flex items-center gap-4 min-w-0 select-text">
                        <CoverImage
                            src={currentTrack.cover_url}
                            alt="Cover"
                            className="h-11 w-11 rounded-lg object-cover shadow flex-shrink-0 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsFullScreenOpen(true);
                            }}
                        />

                        <div className="flex flex-col justify-center min-w-0 text-left">
                            <span 
                                className="text-sm font-bold truncate text-white hover:underline cursor-pointer leading-normal"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFullScreenOpen(true);
                                }}
                            >
                                {currentTrack.title}
                            </span>
                            <div className="flex items-center gap-2 leading-none mt-0.5">
                                <span className="text-xs text-neutral-400 truncate hover:underline cursor-pointer">{currentTrack.artist}</span>
                                {audioQuality && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsTechSpecsOpen(true); }}
                                        className="text-[9px] bg-white/10 px-1 rounded text-red-500 font-bold hover:bg-white/20 transition border border-red-500/20"
                                    >
                                        HI-RES
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => toggleLike(currentTrack)}
                            className={`p-2 rounded-full hover:bg-white/5 transition active:scale-90 ${
                                likedTracks.has(currentTrack.id) ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                            }`}
                            title={likedTracks.has(currentTrack.id) ? "Liked" : "Like"}
                        >
                            <ThumbsUp className="w-4 h-4 fill-current" />
                        </button>
                        <button
                            className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition active:scale-90"
                            title="Dislike"
                        >
                            <ThumbsDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Desktop Layout - Right Section: Volume & Sidebar Toggles */}
                <div className="hidden fold:flex items-center justify-end gap-2 fold:w-[30%] text-neutral-400 pr-6" onClick={(e) => e.stopPropagation()}>
                    {/* Volume Bar */}
                    <div className="flex items-center gap-2 w-24 group mr-2">
                        <Volume2 className="w-4.5 h-4.5 group-hover:text-white transition" />
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolume}
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white group-hover:accent-[#FF0000] transition"
                        />
                    </div>

                    <button
                        onClick={toggleShuffle}
                        className={`p-2 rounded-full hover:bg-white/5 transition active:scale-90 ${shuffle ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'}`}
                        title="Shuffle"
                    >
                        <Shuffle className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleRepeat}
                        className={`p-2 rounded-full hover:bg-white/5 transition active:scale-90 ${repeatMode !== 'none' ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'} relative`}
                        title="Repeat"
                    >
                        <Repeat className="w-4 h-4" />
                        {repeatMode === 'one' && <span className="absolute top-1 right-1 text-[7px] font-black text-black bg-[#FF0000] rounded-full w-2.5 h-2.5 flex items-center justify-center">1</span>}
                    </button>

                    <button
                        className={`p-2 rounded-full hover:bg-white/5 transition active:scale-90 ${
                            isLyricsOpen ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                        }`}
                        onClick={toggleLyrics}
                        title="Lyrics"
                    >
                        <Mic2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                        className={`p-2 rounded-full hover:bg-white/5 transition active:scale-90 ${
                            isRightPanelOpen && rightPanelTab === 'queue' ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'
                        }`}
                        onClick={() => toggleRightPanel('queue')}
                        title="Queue"
                    >
                        <ListMusic className="w-4.5 h-4.5" />
                    </button>

                    <button
                        className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition active:scale-90"
                        onClick={() => setIsTechSpecsOpen(true)}
                        title="Technical Details"
                    >
                        <MonitorSpeaker className="w-4.5 h-4.5" />
                    </button>

                    <button
                        onClick={() => setIsFullScreenOpen(true)}
                        title="Expand Video player"
                        className="p-2 rounded-full hover:bg-white/5 text-neutral-400 hover:text-white transition active:scale-90"
                    >
                        <Maximize2 className="w-4.5 h-4.5" />
                    </button>
                </div>
            </footer>

            {/* Mobile Full Screen Player Overlay */}
            <div
                className={`fixed inset-0 z-[70] flex flex-col transition-transform duration-300 ${isFullScreenOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ background: `linear-gradient(to bottom, ${dominantColor}, #121212)` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header / Close */}
                <div className={`relative z-[80] flex items-center justify-between p-4 pt-8 shrink-0 transition-opacity duration-700 ${isIdle && playerMode === 'video' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); }} className="text-white p-2 hover:bg-white/10 rounded-full transition cursor-pointer">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </div>

                    {/* Song / Video Toggle */}
                    <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-xl">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleModeSwitch('audio'); }}
                            className={`px-8 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${playerMode === 'audio' ? 'bg-white text-black shadow-lg scale-105' : 'text-neutral-400 hover:text-white'}`}
                        >
                            Song
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleModeSwitch('video'); }}
                            className={`px-8 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${playerMode === 'video' ? 'bg-white text-black shadow-lg scale-105' : 'text-neutral-400 hover:text-white'}`}
                        >
                            Video
                        </button>
                    </div>

                    <div className="w-10" />
                </div>

                {/* Content Area */}
                <div
                    className="flex-1 relative overflow-hidden group"
                    onMouseMove={resetIdleTimer}
                    onTouchStart={resetIdleTimer}
                >
                    {playerMode === 'video' ? (
                        /* CENTERED VIDEO MODE: Video Player centered like album art */
                        <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 pb-48 md:pb-40 animate-in zoom-in-95 duration-500">
                            <div className="relative w-full max-w-[480px] md:max-w-[640px] mb-6 md:mb-8">
                                {/* Video Container with 16:9 aspect ratio */}
                                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-black relative">
                                    <VideoPlayer
                                        videoId={currentTrack.id}
                                        isPlaying={isPlaying}
                                        onTimeUpdate={(time) => {
                                            // Sync video time with player progress
                                            if (Math.abs(time - progress) > 2) {
                                                setProgress(time);
                                            }
                                        }}
                                        onPlay={() => {
                                            setIsVideoReady(true);
                                            // Only toggle play if we're not already playing to avoid infinite loop
                                            if (!isPlaying) {
                                                togglePlay();
                                            }
                                        }}
                                        onPause={() => {
                                            // Only toggle pause if we're already playing to avoid infinite loop
                                            if (isPlaying) {
                                                togglePlay();
                                            }
                                        }}
                                        onEnded={() => {
                                            nextTrack();
                                        }}
                                        className="w-full h-full"
                                    />
                                </div>
                                {/* Subtle gradient overlay for depth */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            </div>
                            
                            {/* Song Info Below Video */}
                            <div className="text-center max-w-full px-4">
                                <h2 className="font-black text-white text-2xl md:text-3xl mb-1 md:mb-2 drop-shadow-lg tracking-tight line-clamp-2">{currentTrack.title}</h2>
                                <p
                                    onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                                    className="text-white/80 font-medium text-base md:text-lg cursor-pointer hover:text-white hover:underline transition drop-shadow-md line-clamp-1"
                                >
                                    {currentTrack.artist}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* SONG MODE: Centered Case */
                        <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 pb-48 md:pb-40 animate-in zoom-in-95 duration-500">
                            <div 
                                className="relative w-full max-w-[280px] md:max-w-[360px] mb-6 md:mb-8 cursor-pointer"
                                onClick={() => setIsInfoOpen(true)}
                            >
                                <img
                                    src={currentTrack.cover_url}
                                    alt={currentTrack.title}
                                    className="w-full aspect-square object-cover rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:scale-[1.03]"
                                />
                                {/* Subtle gradient overlay for depth */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            </div>
                            
                            {/* Song Info Below Cover */}
                            <div className="text-center max-w-full px-4">
                                <h2 className="font-black text-white text-2xl md:text-3xl mb-1 md:mb-2 drop-shadow-lg tracking-tight line-clamp-2">{currentTrack.title}</h2>
                                <p
                                    onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                                    className="text-white/80 font-medium text-base md:text-lg cursor-pointer hover:text-white hover:underline transition drop-shadow-md line-clamp-1"
                                >
                                    {currentTrack.artist}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Controls Overlay (Bottom) */}
                    <div className={`absolute bottom-0 left-0 right-0 z-20 px-8 pb-12 transition-all duration-700 ${playerMode === 'video' ? 'bg-gradient-to-t from-black via-black/40 to-transparent' : ''} ${isIdle && playerMode === 'video' ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row md:items-end gap-8">
                            {/* Secondary Actions Only (Metadata moved below cover in song mode) */}
                            <div className="flex-1 flex justify-center">
                                <div className="flex items-center gap-6 text-white">
                                    <button onClick={() => toggleLike(currentTrack)} className={`p-3 rounded-full hover:bg-white/10 transition ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-white/60'}`}>
                                        <Heart size={32} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                                    </button>
                                    <button onClick={() => toggleLyrics()} className={`p-3 rounded-full hover:bg-white/10 transition ${isLyricsOpen ? 'text-green-500' : 'text-white/60 hover:text-white'}`}>
                                        <Mic2 size={28} />
                                    </button>
                                    <button onClick={() => setIsInfoOpen(true)} className="p-3 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white">
                                        <Info size={28} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scrubber & Controls */}
                        <div className="max-w-screen-md mx-auto mt-8">
                            {/* Scrubber */}
                            <div className="mb-8">
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={progress}
                                    onChange={handleSeek}
                                    onMouseUp={handleSeekCommit}
                                    onTouchEnd={handleSeekCommit}
                                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white mb-2 hover:bg-white/30 transition-colors"
                                />
                                <div className="flex justify-between text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest font-mono">
                                    <span>{formatTime(progress)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Main Playback Controls */}
                            <div className="flex items-center justify-between w-full">
                                <button onClick={toggleShuffle} className={`p-2 transition-all duration-300 ${shuffle ? 'text-green-500 scale-110' : 'text-white/40 hover:text-white'}`}>
                                    <Shuffle size={24} />
                                </button>
                                <button onClick={prevTrack} className="text-white hover:scale-110 active:scale-95 transition">
                                    <SkipBack size={42} fill="currentColor" />
                                </button>
                                <button onClick={playerMode === 'video' ? handleVideoPlayPause : togglePlay} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-90 transition shadow-2xl">
                                    {isPlaying ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" className="ml-1.5" />}
                                </button>
                                <button onClick={nextTrack} className="text-white hover:scale-110 active:scale-95 transition">
                                    <SkipForward size={42} fill="currentColor" />
                                </button>
                                <button onClick={toggleRepeat} className={`p-2 transition-all duration-300 ${repeatMode !== 'none' ? 'text-green-500 scale-110' : 'text-white/40 hover:text-white'}`}>
                                    <Repeat size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Song Info Modal (Mobile) */}
            {isInfoOpen && (
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-6 backdrop-blur-sm animate-in">
                    <div className="bg-[#282828] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Song Info</h2>
                            <button onClick={() => setIsInfoOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-neutral-400">Title</p>
                                <p className="font-medium text-lg">{currentTrack.title}</p>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Artist</p>
                                <p
                                    className="font-medium text-lg text-spotify-highlight cursor-pointer hover:underline"
                                    onClick={() => { setPlayerMode('audio'); setIsInfoOpen(false); setIsFullScreenOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                                >
                                    {currentTrack.artist}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-400">Album</p>
                                <p className="font-medium text-lg">{currentTrack.album || 'Single'}</p>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                                <p className="text-xs text-neutral-500">Source: YouTube Music</p>
                                {currentTrack.duration && <p className="text-xs text-neutral-500">Duration: {formatTime(currentTrack.duration)}</p>}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                {/* Modals */}
            <TechSpecs
                isOpen={isTechSpecsOpen}
                onClose={() => setIsTechSpecsOpen(false)}
                quality={audioQuality}
                trackTitle={currentTrack?.title || ''}
            />

            {isAddToPlaylistOpen && currentTrack && (
                <AddToPlaylistModal
                    track={currentTrack}
                    isOpen={true}
                    onClose={() => setIsAddToPlaylistOpen(false)}
                />
            )}

            {/* Lyrics Overlay */}
            {currentTrack && (
                <Lyrics
                    trackTitle={currentTrack.title}
                    artistName={currentTrack.artist || ''}
                    currentTime={progress}
                    isOpen={isLyricsOpen}
                    onClose={closeLyrics}
                    videoId={currentTrack.id}
                />
            )}
        </>
    );
}
