import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Download, PlusCircle, Mic2, Heart, Loader2, ListMusic, MonitorSpeaker, Maximize2, MoreHorizontal, Info, ChevronUp } from 'lucide-react';
import { usePlayer } from "../context/PlayerContext";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TechSpecs from './TechSpecs';
import AddToPlaylistModal from "./AddToPlaylistModal";
import Lyrics from './Lyrics';
import QueueModal from './QueueModal';
import { useDominantColor } from '../hooks/useDominantColor';
import { useLyrics } from '../hooks/useLyrics';

export default function PlayerBar() {
    const {
        currentTrack, isPlaying, isBuffering, togglePlay, setBuffering,
        likedTracks, toggleLike, nextTrack, prevTrack, shuffle, toggleShuffle,
        repeatMode, toggleRepeat, audioQuality, isLyricsOpen, toggleLyrics, closeLyrics, openLyrics
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
        isLyricsOpen || hasInteractedWithLyrics // Only fetch if opened or previously interacted
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

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [isTechSpecsOpen, setIsTechSpecsOpen] = useState(false);
    const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
    const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');

    // Force close lyrics on mount (Defensive fix for "Open on first play")
    useEffect(() => {
        closeLyrics();
    }, []);

    // Reset to audio mode when track changes
    useEffect(() => {
        setPlayerMode('audio');
    }, [currentTrack?.id]);

    // Handle audio/video mode switching
    const handleModeSwitch = (mode: 'audio' | 'video') => {
        if (mode === 'video') {
            audioRef.current?.pause();
            if (isPlaying) togglePlay(); // Update state to paused
        } else {
            // Switching back to audio
            // Optionally sync time if we could get it from video, but for now just resume
            if (!isPlaying) togglePlay();
        }
        setPlayerMode(mode);
    };

    // ... (rest of useEffects)

    // ... inside return ...


    const isDragging = useRef(false);

    // Audio source effect
    useEffect(() => {
        if (currentTrack && audioRef.current && currentTrack.url) {
            const isSameUrl = audioRef.current.src === currentTrack.url ||
                (currentTrack.url.startsWith('/') && audioRef.current.src.endsWith(currentTrack.url)) ||
                (audioRef.current.src.includes(currentTrack.id));

            if (isSameUrl) return;

            audioRef.current.src = currentTrack.url;
            if (isPlaying) {
                audioRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Play error:", e);
                });
            }
        }
    }, [currentTrack?.url]);

    // Play/Pause effect
    useEffect(() => {
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
    }, [isPlaying]);

    // Volume Effect
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    // Sync Play/Pause with YouTube Iframe
    useEffect(() => {
        if (playerMode === 'video' && iframeRef.current && iframeRef.current.contentWindow) {
            const action = isPlaying ? 'playVideo' : 'pauseVideo';
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: action
            }), '*');
        }
    }, [isPlaying, playerMode]);

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
                className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2 right-2 fold:left-0 fold:right-0 fold:bottom-0 h-16 fold:h-[90px] bg-spotify-player border-t-0 fold:border-t border-white/5 flex items-center justify-between z-[60] rounded-lg fold:rounded-none shadow-xl fold:shadow-none transition-all duration-300 backdrop-blur-xl"
                onClick={() => {
                    if (window.innerWidth < 1024) {
                        setIsFullScreenPlayerOpen(true);
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
                />

                {/* Mobile Progress Bar */}
                <div className="absolute bottom-0 left-1 right-1 h-[2px] fold:hidden">
                    <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden pointer-events-none">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-300 ease-linear"
                            style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={progress}
                        onChange={(e) => { e.stopPropagation(); handleSeek(e); }}
                        onMouseUp={(e) => { e.stopPropagation(); handleSeekCommit(); }}
                        onTouchEnd={(e) => { e.stopPropagation(); handleSeekCommit(); }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-1 -left-1 -right-1 h-4 w-[calc(100%+8px)] opacity-0 cursor-pointer z-10"
                    />
                </div>

                {/* Left: Now Playing */}
                <div className="flex items-center gap-3 fold:gap-4 flex-1 min-w-0 fold:w-[30%] text-white fold:pl-4">
                    <img
                        src={currentTrack.cover_url}
                        alt="Cover"
                        className="h-14 w-14 fold:h-14 fold:w-14 rounded-xl object-cover ml-1 fold:ml-0 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.innerWidth >= 700) setIsCoverModalOpen(true);
                            else setIsFullScreenPlayerOpen(true);
                        }}
                    />

                    <div className="flex flex-col justify-center overflow-hidden min-w-0">
                        <span className="text-[11px] fold:text-xs font-bold truncate leading-tight hover:underline cursor-pointer">{currentTrack.title}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] fold:text-xs text-neutral-400 truncate leading-tight hover:underline cursor-pointer">{currentTrack.artist}</span>
                            {audioQuality && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsTechSpecsOpen(true); }}
                                    className="text-[10px] bg-white/10 px-1 rounded text-green-400 font-bold hover:bg-white/20 transition border border-green-400/20"
                                >
                                    HI-RES
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Heart */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
                        className={`fold:hidden ml-2 ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-neutral-400'}`}
                    >
                        <Heart size={20} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                    </button>

                    {/* Desktop Heart */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
                        className={`hidden fold:block hover:scale-110 transition ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
                    >
                        <Heart className={`w-5 h-5 ${likedTracks.has(currentTrack.id) ? 'fill-green-500' : ''}`} />
                    </button>

                    {/* Add to Playlist (Desktop) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsAddToPlaylistOpen(true); }}
                        className="hidden fold:block text-neutral-400 hover:text-white hover:scale-110 transition"
                        title="Add to Playlist"
                    >
                        <PlusCircle className="w-5 h-5" />
                    </button>
                </div>

                {/* Center: Controls */}
                <div className="flex fold:flex-col items-center justify-end fold:justify-center fold:max-w-[40%] w-auto fold:w-full gap-2 pr-3 fold:pr-0">
                    {/* Mobile: Play/Pause + Lyrics */}
                    <div className="flex items-center gap-3 fold:hidden">
                        <button
                            className={`transition ${isLyricsOpen ? 'text-green-500' : 'text-neutral-300'}`}
                            onClick={(e) => { e.stopPropagation(); toggleLyrics(); }}
                        >
                            <Mic2 size={22} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="text-white"
                        >
                            {isBuffering ? <Loader2 size={24} className="animate-spin" /> : (isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />)}
                        </button>
                    </div>

                    {/* Desktop: Full Controls */}
                    <div className="hidden fold:flex items-center gap-6">
                        <button
                            onClick={toggleShuffle}
                            className={`transition ${shuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}>
                            <Shuffle className="w-4 h-4" />
                        </button>
                        <button onClick={prevTrack} className="text-neutral-400 hover:text-white transition"><SkipBack className="w-5 h-5 fill-current" /></button>

                        <button
                            onClick={togglePlay}
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition">
                            {isBuffering ? (
                                <Loader2 className="w-4 h-4 text-black animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="w-4 h-4 text-black fill-black" />
                            ) : (
                                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                            )}
                        </button>

                        <button onClick={nextTrack} className="text-neutral-400 hover:text-white transition"><SkipForward className="w-5 h-5 fill-current" /></button>
                        <button
                            onClick={toggleRepeat}
                            className={`transition ${repeatMode !== 'none' ? 'text-green-500' : 'text-neutral-400 hover:text-white'} relative`}>
                            <Repeat className="w-4 h-4" />
                            {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                        </button>
                    </div>

                    {/* Desktop: Seek Bar */}
                    <div className="hidden fold:flex items-center gap-2 w-full text-xs text-neutral-400">
                        <span>{formatTime(progress)}</span>
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={progress}
                            onChange={handleSeek}
                            onMouseUp={handleSeekCommit}
                            onTouchEnd={handleSeekCommit}
                            className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500"
                        />
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>



                {/* Right: Volume & Extras (Desktop) */}
                <div className="hidden fold:flex items-center justify-end gap-3 w-[30%] text-neutral-400 pr-4">
                    <button
                        className={`transition ${isLyricsOpen ? 'text-green-500' : 'text-zinc-400 hover:text-white'}`}
                        onClick={toggleLyrics}
                        title="Lyrics"
                    >
                        <Mic2 size={20} />
                    </button>
                    <button
                        className="text-zinc-400 hover:text-white transition"
                        onClick={handleDownload}
                        title="Download MP3"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        className={`transition ${isQueueOpen ? 'text-green-500' : 'text-zinc-400 hover:text-white'}`}
                        onClick={() => setIsQueueOpen(true)}
                        title="Queue"
                    >
                        <ListMusic className="w-4 h-4" />
                    </button>
                    <MonitorSpeaker className="w-4 h-4 hover:text-white cursor-pointer" onClick={() => setIsTechSpecsOpen(true)} />
                    <div className="flex items-center gap-2 w-24 group">
                        <Volume2 className="w-4 h-4 group-hover:text-white" />
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={volume}
                            onChange={handleVolume}
                            className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white group-hover:accent-green-500"
                        />
                    </div>
                    <button onClick={() => setIsCoverModalOpen(true)} title="Full Screen" className="text-zinc-400 hover:text-white">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>

            </footer>

            {/* Mobile Full Screen Player Overlay */}
            <div
                className={`fixed inset-0 z-[70] flex flex-col transition-transform duration-300 ${isFullScreenPlayerOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ background: `linear-gradient(to bottom, ${dominantColor}, #121212)` }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header / Close */}
                <div className="flex items-center justify-between p-4 pt-8">
                    <div onClick={() => setIsFullScreenPlayerOpen(false)} className="text-white">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </div>

                    {/* Song / Video Toggle */}
                    <div className="flex bg-[#1a1a1a] rounded-full p-1">
                        <button
                            onClick={() => handleModeSwitch('audio')}
                            className={`px-6 py-1 rounded-full text-xs font-bold transition ${playerMode === 'audio' ? 'bg-[#333] text-white' : 'text-neutral-500'}`}
                        >
                            Song
                        </button>
                        <button
                            onClick={() => handleModeSwitch('video')}
                            className={`px-6 py-1 rounded-full text-xs font-bold transition ${playerMode === 'video' ? 'bg-[#333] text-white' : 'text-neutral-500'}`}
                        >
                            Video
                        </button>
                    </div>

                    <div className="w-6" />
                </div>

                {/* Responsive Split View Container */}
                <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
                    {/* Left/Top: Art or Video */}
                    <div className="flex-1 flex items-center justify-center p-8 md:p-12">
                        {playerMode === 'audio' ? (
                            <img
                                src={currentTrack.cover_url}
                                alt={currentTrack.title}
                                className="w-full aspect-square object-cover rounded-3xl shadow-2xl max-h-[50vh] md:max-h-none"
                            />
                        ) : (
                            <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black">
                                <iframe
                                    ref={iframeRef}
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&start=${Math.floor(progress)}&playsinline=1&modestbranding=1&rel=0&controls=1&enablejsapi=1`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>

                    {/* Right/Bottom: Controls */}
                    <div className="flex-1 flex flex-col justify-center px-8 pb-12 md:pb-0 md:pr-12 overflow-y-auto no-scrollbar">
                        {/* Track Info */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex-1 mr-4">
                                <h2 className="text-2xl md:text-4xl font-bold text-white line-clamp-2 md:mb-2">{currentTrack.title}</h2>
                                <p
                                    onClick={() => { setIsFullScreenPlayerOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                                    className="text-lg md:text-xl text-neutral-400 line-clamp-1 cursor-pointer hover:text-white hover:underline transition"
                                >
                                    {currentTrack.artist}
                                </p>
                            </div>
                            <div className="flex flex-col gap-4">
                                <button onClick={() => toggleLike(currentTrack)} className={likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-neutral-400'}>
                                    <Heart size={28} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                                </button>
                                <button onClick={() => setIsInfoOpen(true)} className="text-neutral-400 hover:text-white">
                                    <Info size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-8">
                            <input
                                type="range"
                                min={0}
                                max={duration || 100}
                                value={progress}
                                onChange={handleSeek}
                                onMouseUp={handleSeekCommit}
                                onTouchEnd={handleSeekCommit}
                                className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white mb-2"
                            />
                            <div className="flex justify-between text-xs text-neutral-400 font-medium font-mono">
                                <span>{formatTime(progress)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between mb-8 max-w-md mx-auto w-full">
                            <button onClick={toggleShuffle} className={shuffle ? 'text-green-500' : 'text-neutral-400'}>
                                <Shuffle size={24} />
                            </button>
                            <button onClick={prevTrack} className="text-white hover:text-neutral-300 transition">
                                <SkipBack size={32} fill="currentColor" />
                            </button>
                            <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition shadow-lg">
                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={nextTrack} className="text-white hover:text-neutral-300 transition">
                                <SkipForward size={32} fill="currentColor" />
                            </button>
                            <button onClick={toggleRepeat} className={repeatMode !== 'none' ? 'text-green-500' : 'text-neutral-400'}>
                                <Repeat size={24} />
                            </button>
                        </div>

                        {/* Lyric Peek (Tablet optimized) */}
                        <div
                            className={`h-16 flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition bg-white/5 rounded-xl p-4 hover:bg-white/10 ${!hasInteractedWithLyrics ? 'opacity-50' : 'opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setHasInteractedWithLyrics(true);
                                openLyrics();
                            }}
                        >
                            {currentLine ? (
                                <p className="text-white font-bold text-lg text-center animate-in fade-in slide-in-from-bottom-2 line-clamp-2">
                                    "{currentLine.text}"
                                </p>
                            ) : (
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <Mic2 size={16} />
                                    <span className="text-sm font-bold">Tap for Lyrics</span>
                                </div>
                            )}
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
                                    onClick={() => { setIsInfoOpen(false); setIsFullScreenPlayerOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
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
            <QueueModal
                isOpen={isQueueOpen}
                onClose={() => setIsQueueOpen(false)}
            />

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

            {isLyricsOpen && (
                <Lyrics
                    trackTitle={currentTrack.title}
                    artistName={currentTrack.artist}
                    currentTime={progress}
                    isOpen={isLyricsOpen}
                    onClose={closeLyrics}
                />
            )}
        </>
    );
}
