import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ChevronDown, ThumbsUp, ThumbsDown, Share2, ListPlus, Download, Check,
  Shuffle, Repeat, Repeat1, SkipBack, SkipForward, Play, Pause, Mic2,
  MoreVertical, Volume2, Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useSwipe } from '../../hooks/useSwipe';
import { haptic } from '../../utils/haptic';
import { toast } from '../../stores/toastStore';
import { downloadTrack } from '../../services/download';
import { libraryService } from '../../services/library';
import type { Track } from '../../types';
import CoverImage from '../CoverImage';
import Lyrics from '../Lyrics';
import VideoPlayer from '../VideoPlayer';
import BottomSheet from '../BottomSheet';
import AddToPlaylistModal from '../AddToPlaylistModal';

type SheetTab = 'upnext' | 'lyrics' | 'related';

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isYouTubeVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
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
  const setProgress = usePlayerStore(s => s.setProgress);
  const shuffle = usePlayerStore(s => s.shuffle);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const queue = usePlayerStore(s => s.queue);
  const isVideoMode = usePlayerStore(s => s.isVideoMode);
  const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);

  const [activeSheetTab, setActiveSheetTab] = useState<SheetTab | null>(null);
  const [showOverflowSheet, setShowOverflowSheet] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(() => new Set());
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  useEffect(() => {
    setScrubValue(null);
  }, [currentTrack?.id]);

  const handleDragEnd = useCallback((_e: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 900) {
      haptic(10);
      setIsFullScreenOpen(false);
    }
  }, [setIsFullScreenOpen]);

  const artworkSwipe = useSwipe({
    onSwipeLeft: () => {
      haptic(8);
      nextTrack();
    },
    onSwipeRight: () => {
      haptic(8);
      prevTrack();
    },
    threshold: 45,
  });

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

  const isLiked = currentTrack ? likedTracks.has(currentTrack.id) : false;
  const isDisliked = currentTrack ? dislikedIds.has(currentTrack.id) : false;
  const displayedProgress = scrubValue ?? progress;
  const maxDuration = duration > 0 ? duration : 1;
  const progressPct = Math.min(100, Math.max(0, (displayedProgress / maxDuration) * 100));
  const queueTracks = queue.length > 0 ? queue : currentTrack ? [currentTrack] : [];

  return (
    <>
      <AnimatePresence>
        {currentTrack && isFullScreenOpen && (
          <motion.div
            key="ytm-mobile-full-player"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag={activeSheetTab ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            className="fixed inset-0 z-[70] flex flex-col bg-[#030303] touch-pan-y overflow-hidden select-none"
          >
        {/* Blurred Album Art Ambient Backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {currentTrack.cover_url && (
            <img
              key={`bg-${currentTrack.cover_url}`}
              src={currentTrack.cover_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-x-0 top-0 w-full h-[55vh] object-cover blur-[80px] opacity-30 scale-125"
              draggable={false}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, #030303 65%)',
            }}
          />
        </div>

        {/* Main Full-Screen Watch Body */}
        <div className="relative z-10 flex-1 flex flex-col min-h-0 pt-[max(10px,env(safe-area-inset-top))]">
          {/* Top Header Bar: Collapse Chevron + Song/Video Pill + Overflow Menu */}
          <div className="flex items-center justify-between px-4 py-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullScreenOpen(false)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
              aria-label="Collapse player"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <div
              role="group"
              aria-label="Playback mode"
              className="inline-flex items-center bg-[#181818]/90 border border-white/10 rounded-full p-0.5"
            >
              <button
                type="button"
                onClick={() => handleModeSwitch(false)}
                className={`px-4 h-7 rounded-full text-[13px] font-medium transition ${
                  !isVideoMode ? 'bg-[#282828] text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                Song
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch(true)}
                className={`px-4 h-7 rounded-full text-[13px] font-medium transition ${
                  isVideoMode ? 'bg-[#282828] text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                Video
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOverflowSheet(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Artwork / Video Canvas */}
          <div {...artworkSwipe} className="flex-1 min-h-0 flex items-center justify-center px-7 py-2">
            {!isVideoMode ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={currentTrack.id}
                  initial={{ x: 64, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -64, opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="w-full max-w-[340px] max-h-full aspect-square rounded-[12px] overflow-hidden shadow-2xl bg-[#181818] border border-white/10"
                >
                  <CoverImage
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </motion.div>
              </AnimatePresence>
            ) : isYouTubeVideoId(currentTrack.id) ? (
              <div className="w-full aspect-video rounded-[12px] overflow-hidden bg-black relative shadow-2xl border border-white/10">
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
              <div className="w-full aspect-video rounded-[12px] overflow-hidden bg-[#181818] relative shadow-2xl border border-white/10 flex items-center justify-center">
                <CoverImage
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-24 h-24 rounded-[8px] shadow-xl"
                />
              </div>
            )}
          </div>

          {/* Left-Aligned Title + Artist */}
          <div className="px-7 mb-3 shrink-0">
            <h2 className="ytm-display-font text-[22px] font-bold text-white truncate leading-tight">
              {currentTrack.title}
            </h2>
            <p className="text-[15px] text-white/70 truncate mt-1">{currentTrack.artist}</p>
          </div>

          {/* Horizontally Scrollable 36px Action Pills */}
          <div className="px-7 mb-4 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Combined Like | Dislike Pill */}
            <div className="h-9 rounded-full bg-white/10 inline-flex items-center shrink-0 overflow-hidden">
              <button
                type="button"
                onClick={handleLike}
                aria-label="Like"
                aria-pressed={isLiked}
                className={`px-3.5 h-full inline-flex items-center gap-1.5 text-[13px] font-medium hover:bg-white/10 transition ${
                  isLiked ? 'text-white' : 'text-white/90'
                }`}
              >
                <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>
              <span className="w-px h-4 bg-white/15" aria-hidden="true" />
              <button
                type="button"
                onClick={handleDislike}
                aria-label="Dislike"
                aria-pressed={isDisliked}
                className={`px-3 h-full inline-flex items-center justify-center hover:bg-white/10 transition ${
                  isDisliked ? 'text-white' : 'text-white/80'
                }`}
              >
                <ThumbsDown className="w-4 h-4" fill={isDisliked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveSheetTab('lyrics')}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 text-[13px] font-medium text-white shrink-0 transition"
            >
              <Mic2 className="w-4 h-4" />
              <span>Lyrics</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddToPlaylist(true)}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 text-[13px] font-medium text-white shrink-0 transition"
            >
              <ListPlus className="w-4 h-4" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 text-[13px] font-medium text-white shrink-0 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloadStatus === 'downloading'}
              className="h-9 px-3.5 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 text-[13px] font-medium text-white shrink-0 transition disabled:opacity-60"
            >
              {downloadStatus === 'downloading' ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : downloadStatus === 'done' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {downloadStatus === 'downloading'
                  ? 'Saving...'
                  : downloadStatus === 'done'
                    ? 'Saved'
                    : 'Download'}
              </span>
            </button>
          </div>

          {/* 2px White Range Scrubber + Timestamps */}
          <div className="px-7 mb-4 shrink-0">
            <input
              type="range"
              min={0}
              max={maxDuration}
              step={0.1}
              value={Math.min(maxDuration, displayedProgress)}
              onPointerDown={() => setScrubValue(progress)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setScrubValue(val);
              }}
              onPointerUp={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                seekTo(val);
                setScrubValue(null);
              }}
              onKeyUp={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                seekTo(val);
                setScrubValue(null);
              }}
              aria-label="Seek track"
              aria-valuetext={`${formatTime(displayedProgress)} of ${formatTime(duration)}`}
              className="ytm-range w-full h-6"
              style={
                {
                  '--slider-track-size': '2px',
                  '--slider-thumb-size': '12px',
                  '--slider-track-color': 'rgba(255, 255, 255, 0.25)',
                  '--slider-fill-color': '#FFFFFF',
                  '--slider-thumb-color': '#FFFFFF',
                  '--slider-progress': `${progressPct}%`,
                } as React.CSSProperties
              }
            />
            <div className="flex justify-between text-[12px] text-white/70 tabular-nums -mt-1">
              <span>{formatTime(displayedProgress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* 5-Button Transport Controls with 72px Solid White Play/Pause Circle */}
          <div className="px-7 mb-5 shrink-0 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Shuffle"
              aria-pressed={shuffle}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                shuffle ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={prevTrack}
              aria-label="Previous track"
              className="w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-95 transition"
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-[72px] h-[72px] rounded-full bg-white text-[#030303] flex items-center justify-center active:scale-95 transition shadow-xl"
            >
              {isBuffering ? (
                <div className="w-7 h-7 border-[3px] border-[#030303]/30 border-t-[#030303] rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-9 h-9 fill-current" />
              ) : (
                <Play className="w-9 h-9 fill-current ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={nextTrack}
              aria-label="Next track"
              className="w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-95 transition"
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>

            <button
              type="button"
              onClick={toggleRepeat}
              aria-label={`Repeat: ${repeatMode}`}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                repeatMode !== 'none' ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Docked UP NEXT | LYRICS | RELATED Bottom Tab Strip */}
          <div className="mt-auto shrink-0 bg-[#141414]/95 border-t border-white/10 rounded-t-[16px] pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-3 h-12">
              {([
                { id: 'upnext', label: 'UP NEXT' },
                { id: 'lyrics', label: 'LYRICS' },
                { id: 'related', label: 'RELATED' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSheetTab(tab.id)}
                  className="text-[12px] font-medium uppercase tracking-[0.04em] text-white/75 hover:text-white transition"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expanded Bottom Sheet Overlay (UP NEXT / LYRICS / RELATED) */}
        <AnimatePresence>
          {activeSheetTab && (
            <motion.div
              key="ytm-mobile-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed inset-0 z-[75] bg-[#030303] flex flex-col pt-[max(8px,env(safe-area-inset-top))]"
            >
              {/* Collapsed Mini Player Header at Top */}
              <div className="h-16 px-4 flex items-center gap-3 bg-[#141414] border-b border-white/10 shrink-0">
                <CoverImage
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-11 h-11 rounded-[4px] flex-shrink-0 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-white truncate">{currentTrack.title}</p>
                  <p className="text-[13px] text-white/70 truncate">{currentTrack.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSheetTab(null)}
                  aria-label="Close sheet"
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="grid grid-cols-3 border-b border-white/10 bg-[#030303] shrink-0" role="tablist">
                {([
                  { id: 'upnext', label: 'UP NEXT' },
                  { id: 'lyrics', label: 'LYRICS' },
                  { id: 'related', label: 'RELATED' },
                ] as const).map(tab => {
                  const active = activeSheetTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveSheetTab(tab.id)}
                      className={`relative h-12 text-[13px] font-medium uppercase tracking-[0.04em] transition-colors ${
                        active ? 'text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {tab.label}
                      {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />}
                    </button>
                  );
                })}
              </div>

              {/* Sheet Body */}
              <div className="flex-1 min-h-0 overflow-hidden bg-[#030303] pb-[env(safe-area-inset-bottom)]">
                {activeSheetTab === 'upnext' && (
                  <div className="h-full overflow-y-auto ytm-scroller px-4 py-3 space-y-0.5">
                    {queueTracks.map((track, idx) => {
                      const isCurrent = track.id === currentTrack.id;
                      return (
                        <button
                          key={`${track.id}-${idx}`}
                          type="button"
                          onClick={() => playTrack(track, queueTracks)}
                          className={`w-full h-14 px-2 rounded-[8px] flex items-center gap-3 text-left transition-colors ${
                            isCurrent ? 'bg-white/10' : 'hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="relative w-11 h-11 rounded-[4px] overflow-hidden flex-shrink-0 bg-[#181818]">
                            <CoverImage
                              src={track.cover_url}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            {isCurrent && (
                              <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                                <Volume2 className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-white truncate">{track.title}</p>
                            <p className="text-[13px] text-white/70 truncate">{track.artist}</p>
                          </div>
                          <span className="text-[12px] text-white/60 tabular-nums">
                            {track.duration ? formatTime(track.duration) : ''}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeSheetTab === 'lyrics' && (
                  <div className="h-full overflow-hidden">
                    <Lyrics
                      trackTitle={currentTrack.title}
                      artistName={currentTrack.artist || ''}
                      currentTime={progress}
                      isOpen
                      onClose={() => setActiveSheetTab(null)}
                      videoId={currentTrack.id}
                      variant="panel"
                    />
                  </div>
                )}

                {activeSheetTab === 'related' && (
                  <div className="h-full overflow-y-auto ytm-scroller px-4 py-3">
                    <MobileRelatedTracks
                      track={currentTrack}
                      onPlay={(t, list) => playTrack(t, list)}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {currentTrack && (
        <BottomSheet isOpen={showOverflowSheet} onClose={() => setShowOverflowSheet(false)} title={currentTrack.title}>
          <div className="flex flex-col gap-1 pb-4">
            <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10 mb-1">
              <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-12 h-12 rounded-[4px] object-cover" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
                <p className="text-xs text-white/70 truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowOverflowSheet(false);
                handleLike();
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-sm font-medium text-white"
            >
              <ThumbsUp className="w-4 h-4 text-white/80" fill={isLiked ? 'currentColor' : 'none'} />
              <span>{isLiked ? 'Remove from Liked Music' : 'Like'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOverflowSheet(false);
                setShowAddToPlaylist(true);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-sm font-medium text-white"
            >
              <ListPlus className="w-4 h-4 text-white/80" />
              <span>Save to playlist</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOverflowSheet(false);
                handleShare();
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-sm font-medium text-white"
            >
              <Share2 className="w-4 h-4 text-white/80" />
              <span>Share track</span>
            </button>
          </div>
        </BottomSheet>
      )}

      {currentTrack && showAddToPlaylist && (
        <AddToPlaylistModal track={currentTrack} isOpen onClose={() => setShowAddToPlaylist(false)} />
      )}
    </>
  );
}

function MobileRelatedTracks({
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
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-white/5 rounded-[8px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-2">
        <Sparkles className="w-4 h-4 text-white/70" />
        <h3 className="text-[15px] font-semibold text-white">You might also like</h3>
      </div>
      {tracks.length === 0 ? (
        <p className="text-[13px] text-white/50 text-center py-8">No related tracks found</p>
      ) : (
        tracks.map((item, idx) => (
          <button
            key={`${item.id}-${idx}`}
            type="button"
            onClick={() => onPlay(item, tracks)}
            className="w-full h-14 px-2 rounded-[8px] flex items-center gap-3 text-left hover:bg-white/[0.06] transition"
          >
            <CoverImage
              src={item.cover_url}
              alt={item.title}
              className="w-11 h-11 rounded-[4px] object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-white truncate">{item.title}</p>
              <p className="text-[13px] text-white/70 truncate">{item.artist}</p>
            </div>
            <span className="text-[12px] text-white/60 tabular-nums">
              {item.duration ? formatTime(item.duration) : ''}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
