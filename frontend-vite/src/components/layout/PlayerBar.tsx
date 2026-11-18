import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shuffle, Repeat, Repeat1, SkipBack, SkipForward, Play, Pause,
  ThumbsUp, ThumbsDown, ListPlus, Share2, Volume2, Volume1, VolumeX,
  ChevronUp, MoreVertical, Sparkles, Music2,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { libraryService, prefetchTrack } from '../../services/library';
import { toast } from '../../stores/toastStore';
import { haptic } from '../../utils/haptic';
import type { Track } from '../../types';
import CoverImage from '../CoverImage';
import Lyrics from '../Lyrics';
import DownloadMenu from '../DownloadMenu';
import VideoPlayer from '../VideoPlayer';
import AddToPlaylistModal from '../AddToPlaylistModal';

type PlayerPageTab = 'upnext' | 'lyrics' | 'related';

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isYouTubeVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

export default function PlayerBar() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const shuffle = usePlayerStore(s => s.shuffle);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const queue = usePlayerStore(s => s.queue);
  const isVideoMode = usePlayerStore(s => s.isVideoMode);

  const togglePlay = usePlayerStore(s => s.togglePlay);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const prevTrack = usePlayerStore(s => s.prevTrack);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
  const seekTo = usePlayerStore(s => s.seekTo);
  const setProgress = usePlayerStore(s => s.setProgress);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const playTrack = usePlayerStore(s => s.playTrack);
  const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);

  const [isPlayerPageOpen, setIsPlayerPageOpen] = useState(false);
  const [playerTab, setPlayerTab] = useState<PlayerPageTab>('upnext');
  const [showVolume, setShowVolume] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(() => new Set());

  // Top-edge scrubber drag & hover tooltip state
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const prevVolumeRef = useRef(volume > 0 ? volume : 1);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);

  useEffect(() => {
    if (volume > 0) prevVolumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    setIsDraggingScrubber(false);
    setDragFraction(null);
    setHoverFraction(null);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!showOverflow) return;
    const onDocDown = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showOverflow]);

  const computeFraction = useCallback((clientX: number): number => {
    const el = scrubberRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handleScrubberPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.preventDefault();
    const frac = computeFraction(e.clientX);
    setIsDraggingScrubber(true);
    setDragFraction(frac);
    setHoverFraction(frac);

    const onMove = (ev: PointerEvent) => {
      const next = computeFraction(ev.clientX);
      setDragFraction(next);
      setHoverFraction(next);
    };

    const onUp = (ev: PointerEvent) => {
      const finalFrac = computeFraction(ev.clientX);
      seekTo(finalFrac * duration);
      setIsDraggingScrubber(false);
      setDragFraction(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [computeFraction, duration, seekTo]);

  const handleLike = useCallback(async () => {
    if (!currentTrack) return;
    const wasLiked = likedTracks.has(currentTrack.id);
    if (!wasLiked) {
      setDislikedIds(prev => {
        if (!prev.has(currentTrack.id)) return prev;
        const next = new Set(prev);
        next.delete(currentTrack.id);
        return next;
      });
    }
    await toggleLike(currentTrack);
    toast(wasLiked ? 'Removed from Liked Music' : 'Added to Liked Music');
    haptic(8);
  }, [currentTrack, toggleLike, likedTracks]);

  const handleDislike = useCallback(async () => {
    if (!currentTrack) return;
    const isCurrentlyDisliked = dislikedIds.has(currentTrack.id);
    if (!isCurrentlyDisliked && likedTracks.has(currentTrack.id)) {
      await toggleLike(currentTrack);
    }
    setDislikedIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) next.delete(currentTrack.id);
      else next.add(currentTrack.id);
      return next;
    });
    haptic(6);
  }, [currentTrack, dislikedIds, likedTracks, toggleLike]);

  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const url = `${window.location.origin}/track/${encodeURIComponent(currentTrack.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack.title,
          text: `${currentTrack.title} - ${currentTrack.artist}`,
          url,
        });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast('Copied track link');
      } catch {
        toast('Could not copy link');
      }
    }
  }, [currentTrack]);

  const handleMuteToggle = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8);
    }
  }, [volume, setVolume]);

  const handleModeSwitch = useCallback((video: boolean) => {
    if (video === isVideoMode) return;
    if (isPlaying) {
      togglePlay();
      setIsVideoMode(video);
      setTimeout(() => togglePlay(), 50);
    } else {
      setIsVideoMode(video);
    }
  }, [isVideoMode, isPlaying, setIsVideoMode, togglePlay]);

  useKeyboardShortcuts({
    onSpace: () => currentTrack && togglePlay(),
    onSeekBack: () => seekTo(Math.max(0, progress - 10)),
    onSeekForward: () => seekTo(Math.min(duration || 0, progress + 10)),
    onVolumeDown: () => setVolume(Math.max(0, Number((volume - 0.1).toFixed(2)))),
    onVolumeUp: () => setVolume(Math.min(1, Number((volume + 0.1).toFixed(2)))),
    onEscape: () => {
      if (showOverflow) setShowOverflow(false);
      else if (isPlayerPageOpen) setIsPlayerPageOpen(false);
    },
  });

  if (!currentTrack) return null;

  const isLiked = likedTracks.has(currentTrack.id);
  const isDisliked = dislikedIds.has(currentTrack.id);
  const playedFraction = duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0;
  const displayedFraction = dragFraction ?? playedFraction;
  const queueTracks = queue.length > 0 ? queue : [currentTrack];

  return (
    <>
      {/* Full Desktop ytmusic-player-page Split Overlay */}
      <AnimatePresence>
        {isPlayerPageOpen && (
          <motion.section
            key="ytm-player-page"
            aria-label="Now playing watch view"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0.2, 1] }}
            className="hidden md:flex fixed top-16 bottom-[72px] right-0 left-0 md:left-[var(--ytm-guide-width,240px)] z-[54] bg-[#030303] flex-col overflow-hidden select-none"
          >
            {/* Blurred ambient cover backdrop */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {currentTrack.cover_url && (
                <img
                  src={currentTrack.cover_url}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover scale-125 blur-[80px] opacity-25"
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-[#030303]/60 via-[#030303]/85 to-[#030303]" />
            </div>

            {/* Two-Column Split Content */}
            <div className="relative z-10 flex-1 flex gap-8 lg:gap-10 px-6 lg:px-10 py-6 max-w-[1440px] mx-auto w-full min-h-0">
              {/* Left Pane: Song / Video Toggle + Artwork / Video Canvas */}
              <div className="flex-1 flex flex-col items-center justify-center min-w-0 min-h-0">
                <div
                  role="group"
                  aria-label="Playback mode"
                  className="mb-5 inline-flex items-center bg-[#181818] border border-white/10 rounded-full p-1 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => handleModeSwitch(false)}
                    className={`px-5 h-8 rounded-full text-[14px] font-medium transition ${
                      !isVideoMode ? 'bg-[#282828] text-white shadow' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Song
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch(true)}
                    className={`px-5 h-8 rounded-full text-[14px] font-medium transition ${
                      isVideoMode ? 'bg-[#282828] text-white shadow' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    Video
                  </button>
                </div>

                {!isVideoMode ? (
                  <div className="w-full max-w-[460px] aspect-square rounded-[8px] overflow-hidden shadow-2xl bg-[#181818] border border-white/10">
                    <CoverImage
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : isYouTubeVideoId(currentTrack.id) ? (
                  <div className="w-full max-w-[760px] aspect-video rounded-[8px] overflow-hidden bg-black relative shadow-2xl border border-white/10">
                    <VideoPlayer
                      videoId={currentTrack.id}
                      isPlaying={isPlaying}
                      onPlay={() => {
                        if (!isPlaying) togglePlay();
                      }}
                      onPause={() => {
                        if (isPlaying) togglePlay();
                      }}
                      onEnded={nextTrack}
                      onTimeUpdate={(t) => setProgress(t)}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-[760px] aspect-video rounded-[8px] overflow-hidden bg-[#181818] relative shadow-2xl border border-white/10 flex items-center justify-center">
                    {currentTrack.cover_url && (
                      <img
                        src={currentTrack.cover_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110"
                        draggable={false}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
                      <CoverImage
                        src={currentTrack.cover_url}
                        alt={currentTrack.title}
                        className="w-36 h-36 rounded-[8px] shadow-2xl border border-white/10"
                      />
                      <div>
                        <p className="text-[16px] font-semibold text-white">{currentTrack.title}</p>
                        <p className="text-[13px] text-white/70 mt-0.5">{currentTrack.artist}</p>
                      </div>
                      {isPlaying && (
                        <div className="flex items-end gap-1 h-5" aria-hidden="true">
                          <span className="w-1 bg-white rounded-full animate-soundwave-1" />
                          <span className="w-1 bg-white rounded-full animate-soundwave-2" />
                          <span className="w-1 bg-white rounded-full animate-soundwave-3" />
                          <span className="w-1 bg-white rounded-full animate-soundwave-4" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Pane: UP NEXT / LYRICS / RELATED */}
              <div className="w-[40%] max-w-[480px] min-w-[340px] flex flex-col min-h-0">
                <div className="grid grid-cols-3 border-b border-white/10 shrink-0" role="tablist">
                  {([
                    { id: 'upnext', label: 'UP NEXT' },
                    { id: 'lyrics', label: 'LYRICS' },
                    { id: 'related', label: 'RELATED' },
                  ] as const).map(tab => {
                    const active = playerTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPlayerTab(tab.id)}
                        className={`relative h-12 text-[13px] font-medium uppercase tracking-[0.04em] transition-colors ${
                          active ? 'text-white' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {tab.label}
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* UP NEXT Tab */}
                {playerTab === 'upnext' && (
                  <div className="flex-1 min-h-0 flex flex-col pt-3">
                    <div className="flex items-center justify-between gap-3 px-2 pb-3 border-b border-white/10 shrink-0">
                      <div className="min-w-0">
                        <p className="text-[12px] text-white/60">Playing from</p>
                        <p className="text-[14px] font-medium text-white truncate">
                          {currentTrack.album || 'KV Music Mix'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddToPlaylist(true)}
                        className="h-8 px-3.5 rounded-full bg-white text-[#030303] hover:bg-white/90 text-[13px] font-medium flex items-center gap-1.5 flex-shrink-0 transition"
                      >
                        <ListPlus className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto ytm-scroller py-1">
                      {queueTracks.map((track, idx) => {
                        const isCurrent = track.id === currentTrack.id;
                        return (
                          <button
                            key={`${track.id}-${idx}`}
                            type="button"
                            onClick={() => playTrack(track, queueTracks)}
                            onMouseEnter={() => prefetchTrack(track.id)}
                            onPointerDown={() => prefetchTrack(track.id)}
                            className={`w-full h-14 px-2 rounded-[8px] flex items-center gap-3 text-left group transition-colors border-b border-white/[0.06] last:border-b-0 ${
                              isCurrent ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="relative w-12 h-12 rounded-[4px] overflow-hidden flex-shrink-0 bg-[#181818]">
                              <CoverImage
                                src={track.cover_url}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                              <div
                                className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity ${
                                  isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                {isCurrent && isPlaying ? (
                                  <Volume2 className="w-4 h-4 text-white" />
                                ) : (
                                  <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-white truncate">
                                {track.title}
                              </p>
                              <p className="text-[13px] text-white/70 truncate mt-0.5">
                                {track.artist}
                              </p>
                            </div>
                            <span className="text-[13px] text-white/60 tabular-nums flex-shrink-0 pl-2">
                              {track.duration ? formatTime(track.duration) : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LYRICS Tab */}
                {playerTab === 'lyrics' && (
                  <div className="flex-1 min-h-0 overflow-hidden pt-2">
                    <Lyrics
                      trackTitle={currentTrack.title}
                      artistName={currentTrack.artist || ''}
                      currentTime={progress}
                      isOpen
                      onClose={() => setPlayerTab('upnext')}
                      videoId={currentTrack.id}
                      variant="panel"
                    />
                  </div>
                )}

                {/* RELATED Tab */}
                {playerTab === 'related' && (
                  <div className="flex-1 min-h-0 overflow-y-auto ytm-scroller pt-4">
                    <RelatedTracksPanel
                      track={currentTrack}
                      onPlay={(t, list) => playTrack(t, list)}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Fixed Bottom ytmusic-player-bar (Desktop >= md, 72px) */}
      <footer
        aria-label="Audio player bar"
        className="hidden md:flex fixed bottom-0 left-0 right-0 z-[55] h-[72px] bg-[#212121] border-t border-white/10 px-4 items-center select-none"
      >
        {/* Full-bleed Top-Edge Interactive Progress Scrubber */}
        <div
          ref={scrubberRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek track"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
          onPointerDown={handleScrubberPointerDown}
          onPointerMove={(e) => {
            if (!duration) return;
            setHoverFraction(computeFraction(e.clientX));
          }}
          onPointerLeave={() => {
            if (!isDraggingScrubber) setHoverFraction(null);
          }}
          onKeyDown={(e) => {
            if (!duration) return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              seekTo(Math.min(duration, progress + 5));
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              seekTo(Math.max(0, progress - 5));
            }
          }}
          className="absolute top-0 left-0 right-0 h-4 -translate-y-1/2 cursor-pointer z-20 group/scrubber flex items-center focus-visible:outline-none"
        >
          {/* Hover Timestamp Tooltip */}
          {hoverFraction !== null && duration > 0 && (
            <div
              className="absolute bottom-full mb-1.5 -translate-x-1/2 px-2 py-0.5 rounded-[4px] bg-[#111111] border border-white/10 text-[12px] leading-[18px] text-white tabular-nums pointer-events-none shadow-lg"
              style={{
                left: `clamp(24px, ${hoverFraction * 100}%, calc(100% - 24px))`,
              }}
            >
              {formatTime(hoverFraction * duration)}
            </div>
          )}

          {/* Track + Active Gradient Fill + #FF0033 Circular Knob */}
          <div
            className={`w-full bg-white/20 relative transition-[height] duration-150 ${
              isDraggingScrubber ? 'h-1' : 'h-[3px] group-hover/scrubber:h-1'
            }`}
          >
            <div
              className="h-full relative"
              style={{
                width: `${displayedFraction * 100}%`,
                background: 'linear-gradient(to right, #FF0033 0%, #FF2791 100%)',
              }}
            >
              <span
                className={`w-3 h-3 rounded-full bg-[#FF0033] shadow-md absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 transition-opacity duration-150 ${
                  isDraggingScrubber
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/scrubber:opacity-100 group-focus-visible/scrubber:opacity-100'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 3-Zone Controls Grid */}
        <div className="w-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          {/* Left Zone: Transport + Timestamp */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={prevTrack}
              aria-label="Previous track"
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition"
            >
              {isBuffering ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              aria-label="Next track"
              className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <span className="hidden lg:inline-block ml-2 text-[12px] text-white/70 tabular-nums whitespace-nowrap">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          </div>

          {/* Center Zone: Track Lockup + Thumbs + Actions */}
          <div className="flex items-center justify-center gap-3 min-w-0 max-w-[580px] mx-auto w-full">
            <button
              type="button"
              onClick={() => setIsPlayerPageOpen(v => !v)}
              aria-label={isPlayerPageOpen ? 'Collapse player page' : 'Open player page'}
              className="flex-shrink-0 rounded-[2px] overflow-hidden hover:opacity-90 transition"
            >
              <CoverImage
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-[2px] object-cover"
                fallbackText="♪"
              />
            </button>

            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIsPlayerPageOpen(v => !v)}
                className="block max-w-full text-left text-[14px] font-medium text-white truncate hover:underline leading-[18px]"
              >
                {currentTrack.title}
              </button>
              <p className="text-[14px] text-white/70 truncate leading-[18px] mt-0.5">
                <Link
                  to={`/artist/${encodeURIComponent(currentTrack.artist)}`}
                  className="hover:underline hover:text-white transition"
                >
                  {currentTrack.artist}
                </Link>
                {currentTrack.album ? <span> • {currentTrack.album}</span> : null}
              </p>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleDislike}
                aria-label="Dislike"
                aria-pressed={isDisliked}
                className={`w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition ${
                  isDisliked ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <ThumbsDown className="w-[18px] h-[18px]" fill={isDisliked ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                onClick={handleLike}
                aria-label="Like"
                aria-pressed={isLiked}
                className={`w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition ${
                  isLiked ? 'text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-[18px] h-[18px]" fill={isLiked ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                onClick={() => setShowAddToPlaylist(true)}
                aria-label="Add to playlist"
                title="Save to playlist"
                className="hidden lg:inline-flex w-9 h-9 rounded-full hover:bg-white/10 items-center justify-center text-white/70 hover:text-white transition"
              >
                <ListPlus className="w-[18px] h-[18px]" />
              </button>

              <DownloadMenu
                tracks={[currentTrack]}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
                iconClassName="w-[18px] h-[18px]"
              />

              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  onClick={() => setShowOverflow(v => !v)}
                  aria-label="More track actions"
                  aria-expanded={showOverflow}
                  className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
                >
                  <MoreVertical className="w-[18px] h-[18px]" />
                </button>

                {showOverflow && (
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#212121] border border-white/15 rounded-[8px] shadow-2xl py-1.5 z-[70]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOverflow(false);
                        setShowAddToPlaylist(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:text-white hover:bg-white/10 transition text-left"
                    >
                      <ListPlus className="w-4 h-4 text-white/70" />
                      <span>Save to playlist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOverflow(false);
                        handleShare();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:text-white hover:bg-white/10 transition text-left"
                    >
                      <Share2 className="w-4 h-4 text-white/70" />
                      <span>Share track</span>
                    </button>
                    <Link
                      to={`/artist/${encodeURIComponent(currentTrack.artist)}`}
                      onClick={() => setShowOverflow(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-white/90 hover:text-white hover:bg-white/10 transition text-left"
                    >
                      <Music2 className="w-4 h-4 text-white/70" />
                      <span>Go to artist</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Zone: Volume + Repeat + Shuffle + Expand Chevron */}
          <div className="flex items-center justify-end gap-1 flex-shrink-0">
            <div
              className="flex items-center gap-1"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
              onFocus={() => setShowVolume(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setShowVolume(false);
                }
              }}
            >
              <div
                className={`overflow-hidden flex items-center transition-all duration-200 ${
                  showVolume ? 'w-24 opacity-100 pr-1' : 'w-0 opacity-0'
                }`}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  aria-valuetext={`${Math.round(volume * 100)}%`}
                  className="ytm-range w-24 h-6"
                  style={
                    {
                      '--slider-progress': `${Math.round(volume * 100)}%`,
                      '--slider-track-size': '3px',
                      '--slider-thumb-size': '12px',
                    } as React.CSSProperties
                  }
                />
              </div>

              <button
                type="button"
                onClick={handleMuteToggle}
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition"
              >
                {volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeatMode}`}
              title={`Repeat: ${repeatMode}`}
              className={`w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition ${
                repeatMode !== 'none' ? 'text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              title="Shuffle"
              className={`w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition ${
                shuffle ? 'text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsPlayerPageOpen(v => !v)}
              aria-label={isPlayerPageOpen ? 'Collapse player page' : 'Expand player page'}
              aria-expanded={isPlayerPageOpen}
              className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition ml-1"
            >
              <ChevronUp
                className={`w-5 h-5 transition-transform duration-300 ${
                  isPlayerPageOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </footer>

      <AddToPlaylistModal
        track={currentTrack}
        isOpen={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
      />
    </>
  );
}

function RelatedTracksPanel({
  track,
  onPlay,
}: {
  track: Track;
  onPlay: (t: Track, list: Track[]) => void;
}) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    libraryService
      .getRelatedContent(track.artist || track.title, 'track', 12)
      .then(data => {
        if (!cancelled) setTracks(data.tracks || []);
      })
      .catch(() => {
        if (!cancelled) setTracks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [track.id, track.artist, track.title]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse px-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-14 bg-white/5 rounded-[8px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-4">
      <div className="flex items-center gap-2 px-2 pb-2">
        <Sparkles className="w-4 h-4 text-white/70" />
        <h3 className="text-[15px] font-semibold text-white">You might also like</h3>
      </div>

      {tracks.length === 0 ? (
        <p className="text-[13px] text-white/50 text-center py-10">No related tracks found</p>
      ) : (
        tracks.map((item, idx) => (
          <button
            key={`${item.id}-${idx}`}
            type="button"
            onClick={() => onPlay(item, tracks)}
            onMouseEnter={() => prefetchTrack(item.id)}
            onPointerDown={() => prefetchTrack(item.id)}
            className="w-full h-14 px-2 rounded-[8px] flex items-center gap-3 text-left group hover:bg-white/[0.06] transition-colors border-b border-white/[0.06] last:border-b-0"
          >
            <div className="relative w-12 h-12 rounded-[4px] overflow-hidden flex-shrink-0 bg-[#181818]">
              <CoverImage
                src={item.cover_url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-white fill-current ml-0.5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-white truncate">{item.title}</p>
              <p className="text-[13px] text-white/70 truncate mt-0.5">{item.artist}</p>
            </div>
            <span className="text-[13px] text-white/60 tabular-nums flex-shrink-0">
              {item.duration ? formatTime(item.duration) : ''}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
