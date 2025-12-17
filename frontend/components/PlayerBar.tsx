"use client";

import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, Download, Disc, PlusCircle, Mic2, Heart, Loader2, ListMusic, MonitorSpeaker, Maximize2 } from 'lucide-react';
import { usePlayer } from "@/context/PlayerContext";
import { useEffect, useRef, useState } from "react";

import TechSpecs from './TechSpecs';
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import LyricsDetail from './LyricsDetail';

export default function PlayerBar() {
    const { currentTrack, isPlaying, isBuffering, togglePlay, setBuffering, likedTracks, toggleLike, nextTrack, prevTrack, shuffle, toggleShuffle, repeatMode, toggleRepeat, audioQuality } = usePlayer();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);
    const [isTechSpecsOpen, setIsTechSpecsOpen] = useState(false);
    const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
    const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

    useEffect(() => {
        if (currentTrack && audioRef.current && currentTrack.url) {
            // Prevent reloading if URL hasn't changed
            const isSameUrl = audioRef.current.src === currentTrack.url ||
                (currentTrack.url.startsWith('/') && audioRef.current.src.endsWith(currentTrack.url)) ||
                (audioRef.current.src.includes(currentTrack.id)); // Fallback for stream IDs

            if (isSameUrl) return;

            audioRef.current.src = currentTrack.url;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Play error:", e));
            }
        }
    }, [currentTrack?.url]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.play().catch(e => console.error("Play error:", e));
            else audioRef.current.pause();
        }
    }, [isPlaying]);

    // Volume Effect
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (!isNaN(audioRef.current.duration)) {
                setDuration(audioRef.current.duration);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        setVolume(vol);
    };

    const handleDownload = () => {
        if (!currentTrack) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const url = `${apiUrl}/api/download?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}`;
        window.open(url, '_blank');
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <footer
            className="fixed bottom-[64px] left-2 right-2 md:left-0 md:right-0 md:bottom-0 h-14 md:h-[90px] bg-[#2E2E2E] md:bg-black border-t-0 md:border-t border-[#282828] flex items-center justify-between z-[60] rounded-lg md:rounded-none shadow-xl md:shadow-none transition-all duration-300"
            onClick={(e) => {
                // Mobile: Open Full Screen Player
                if (window.innerWidth < 768) {
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
            />

            {/* Mobile Progress Bar (Mini Player) */}
            <div className="absolute bottom-0 left-1 right-1 h-[2px] md:hidden">
                {/* Visual Bar */}
                <div className="absolute inset-0 bg-white/20 rounded-full overflow-hidden pointer-events-none">
                    <div
                        className="h-full bg-white rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                    />
                </div>
                {/* Interactive Slider Overlay */}
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={(e) => { e.stopPropagation(); handleSeek(e); }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -bottom-1 -left-1 -right-1 h-4 w-[calc(100%+8px)] opacity-0 cursor-pointer z-10"
                />
            </div>

            {/* Left: Now Playing */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 md:w-[30%] text-white md:pl-4">
                {currentTrack ? (
                    <>
                        {/* Artwork */}
                        <img
                            src={currentTrack.cover_url}
                            alt="Cover"
                            className="h-10 w-10 md:h-14 md:w-14 rounded md:rounded-md object-cover ml-1 md:ml-0 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.innerWidth >= 768) setIsCoverModalOpen(true);
                            }}
                        />

                        <div className="flex flex-col justify-center overflow-hidden min-w-0">
                            <span className="text-sm font-medium truncate leading-tight hover:underline cursor-pointer">{currentTrack.title}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400 truncate leading-tight hover:underline cursor-pointer">{currentTrack.artist}</span>
                                {audioQuality && (
                                    <button
                                        onClick={() => setIsTechSpecsOpen(true)}
                                        className="text-[10px] bg-white/10 px-1 rounded text-green-400 font-bold hover:bg-white/20 transition border border-green-400/20"
                                    >
                                        HI-RES
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Mobile Heart (Inline) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); currentTrack && toggleLike(currentTrack); }}
                            className={`md:hidden ml-2 ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-neutral-400'}`}
                        >
                            <Heart size={20} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                        </button>
                        {/* Desktop Heart */}
                        <button
                            onClick={() => currentTrack && toggleLike(currentTrack)}
                            className={`hidden md:block hover:scale-110 transition ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-spotify-text-muted hover:text-white'}`}
                        >
                            <Heart className={`w-5 h-5 ${likedTracks.has(currentTrack.id) ? 'fill-green-500' : ''}`} />
                        </button>

                        {/* Add to Playlist Button (Desktop) */}
                        <button
                            onClick={() => setIsAddToPlaylistOpen(true)}
                            className="hidden md:block text-spotify-text-muted hover:text-white hover:scale-110 transition"
                            title="Add to Playlist"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <div className="h-10 w-10 md:h-14 md:w-14 bg-transparent rounded md:rounded-md" />
                )}
            </div>

            {/* Center: Controls (Desktop) | Right: Controls (Mobile) */}
            <div className="flex md:flex-col items-center justify-end md:justify-center md:max-w-[40%] w-auto md:w-full gap-2 pr-3 md:pr-0">

                {/* Mobile: Play/Pause Only (and Lyrics) */}
                <div className="flex items-center gap-3 md:hidden">
                    {/* Mobile Lyrics Button */}
                    <button
                        className={`transition ${isLyricsOpen ? 'text-green-500' : 'text-neutral-300'}`}
                        onClick={(e) => { e.stopPropagation(); setIsLyricsOpen(!isLyricsOpen); }}
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
                <div className="hidden md:flex items-center gap-6">
                    <button
                        onClick={toggleShuffle}
                        className={`transition ${shuffle ? 'text-green-500' : 'text-spotify-text-muted hover:text-white'}`}>
                        <Shuffle className="w-4 h-4" />
                    </button>
                    <button onClick={prevTrack} className="text-spotify-text-muted hover:text-white transition"><SkipBack className="w-5 h-5 fill-current" /></button>

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

                    <button onClick={nextTrack} className="text-spotify-text-muted hover:text-white transition"><SkipForward className="w-5 h-5 fill-current" /></button>
                    <button
                        onClick={toggleRepeat}
                        className={`transition ${repeatMode !== 'none' ? 'text-green-500' : 'text-spotify-text-muted hover:text-white'} relative`}>
                        <Repeat className="w-4 h-4" />
                        {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                    </button>
                </div>

                {/* Desktop: Seek Bar */}
                <div className="hidden md:flex items-center gap-2 w-full text-xs text-spotify-text-muted">
                    <span>{formatTime(progress)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={progress}
                        onChange={handleSeek}
                        className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500"
                    />
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Right: Volume & Extras (Desktop Only) */}
            <div className="hidden md:flex items-center justify-end gap-3 w-[30%] text-spotify-text-muted pr-4">
                {/* Right Controls */}
                <div className="flex items-center justify-end space-x-2 md:space-x-4">
                    <button
                        className={`text-zinc-400 hover:text-white transition ${isLyricsOpen ? 'text-green-500' : ''}`}
                        onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                        title="Lyrics"
                    >
                        <Mic2 size={20} />
                    </button>
                    <button
                        className="hidden md:block text-zinc-400 hover:text-white transition"
                        onClick={handleDownload}
                        title="Download MP3"
                    >
                        <Download size={20} />
                    </button>
                </div>
                <ListMusic className="hidden md:block w-4 h-4 hover:text-white cursor-pointer" />
                <MonitorSpeaker className="hidden md:block w-4 h-4 hover:text-white cursor-pointer" />
                <div className="hidden md:flex items-center gap-2 w-24 group">
                    {/* Volume Controls (Desktop Only) */}
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
                <Maximize2 className="hidden md:block w-4 h-4 hover:text-white cursor-pointer" />
            </div>

            {/* --- OVERLAYS --- */}

            {/* Mobile Full Screen Player */}
            {isFullScreenPlayerOpen && currentTrack && (
                <div className="fixed inset-0 z-[65] h-[100dvh] bg-gradient-to-b from-[#404040] via-[#121212] to-black flex flex-col px-6 pt-12 pb-[calc(2rem+env(safe-area-inset-bottom))] md:hidden animate-in slide-in-from-bottom duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setIsFullScreenPlayerOpen(false); }} className="text-white">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <span className="text-xs font-bold tracking-widest uppercase text-white/80">Now Playing</span>
                        <button className="text-white">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                        </button>
                    </div>

                    {/* Artwork */}
                    <div className="flex-1 flex items-center justify-center w-full mb-8 min-h-0">
                        <img src={currentTrack.cover_url} alt="Cover" className="w-full max-h-[45vh] aspect-square object-contain rounded-lg shadow-2xl" />
                    </div>

                    {/* Info */}
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="flex flex-col gap-1 pr-4">
                            <div className="relative overflow-hidden w-full">
                                <h2 className="text-2xl font-bold text-white leading-tight line-clamp-1">{currentTrack.title}</h2>
                            </div>
                            <p className="text-lg text-gray-400 line-clamp-1">{currentTrack.artist}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }} className={`${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-white'}`}>
                            <Heart size={28} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="mb-4 shrink-0">
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={progress}
                            onChange={handleSeek}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-green-500 mb-2"
                        />
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                            <span>{formatTime(progress)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between mb-8 px-2 shrink-0">
                        <button onClick={toggleShuffle} className={`${shuffle ? 'text-green-500' : 'text-zinc-400'} hover:text-white transition`}>
                            <Shuffle size={24} />
                        </button>
                        <button onClick={prevTrack} className="text-white hover:scale-110 transition">
                            <SkipBack size={36} fill="currentColor" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition active:scale-95 text-black shadow-lg"
                        >
                            {isBuffering ? <Loader2 className="w-8 h-8 text-black animate-spin" /> : (isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />)}
                        </button>
                        <button onClick={nextTrack} className="text-white hover:scale-110 transition">
                            <SkipForward size={36} fill="currentColor" />
                        </button>
                        <button onClick={toggleRepeat} className={`${repeatMode !== 'none' ? 'text-green-500' : 'text-zinc-400'} hover:text-white transition relative`}>
                            <Repeat size={24} />
                            {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] bg-green-500 text-black px-1 rounded-full">1</span>}
                        </button>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between px-2 shrink-0">
                        <button onClick={() => setIsTechSpecsOpen(true)} className="text-green-500 hover:text-white transition">
                            <MonitorSpeaker size={20} />
                        </button>
                        <div className="flex gap-6 items-center">
                            <button className="text-zinc-400 hover:text-white">
                                <PlusCircle size={24} onClick={() => setIsAddToPlaylistOpen(true)} />
                            </button>
                            <button
                                className={`transition ${isLyricsOpen ? 'text-green-500' : 'text-zinc-400'} hover:text-white`}
                                onClick={(e) => { e.stopPropagation(); setIsLyricsOpen(!isLyricsOpen); }}
                            >
                                <Mic2 size={24} />
                            </button>
                            <button className="text-zinc-400 hover:text-white">
                                <ListMusic size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Full Cover Modal */}
            {isCoverModalOpen && currentTrack && (
                <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setIsCoverModalOpen(false)}>
                    <img src={currentTrack.cover_url} alt="Cover Full" className="max-h-[80vh] max-w-[80vw] object-contain shadow-2xl rounded-lg scale-100" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setIsCoverModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                </div>
            )}

            {/* Modal */}
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

            {/* Lyrics Sheet (Responsive) */}
            {isLyricsOpen && currentTrack && (
                <div className="fixed inset-0 md:inset-auto md:bottom-[100px] md:left-1/2 md:-translate-x-1/2 h-[100dvh] md:h-[500px] md:w-[600px] z-[70] bg-[#121212] md:bg-black/80 backdrop-blur-xl border-t md:border border-white/10 md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden flex flex-col">
                    {/* Mobile Drag Handle Visual - Removed for full screen immersion */}
                    {/* <div
                        className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 md:hidden cursor-pointer"
                        onClick={() => setIsLyricsOpen(false)}
                    /> */}

                    <LyricsDetail
                        track={currentTrack}
                        currentTime={audioRef.current ? audioRef.current.currentTime : 0}
                        onClose={() => setIsLyricsOpen(false)}
                        onSeek={(time) => {
                            if (audioRef.current) {
                                audioRef.current.currentTime = time;
                                setProgress(time);
                            }
                        }}
                    />
                </div>
            )}
        </footer>
    );
}
