import { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Loader2, ChevronUp } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import CoverImage from '../CoverImage';

interface MiniPlayerProps {
    hideUI?: boolean;
}

export default function MiniPlayer({ hideUI = false }: MiniPlayerProps) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const pendingSeek = usePlayerStore(s => s.pendingSeek);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const prevTrack = usePlayerStore(s => s.prevTrack);
  const setProgress = usePlayerStore(s => s.setProgress);
  const setDuration = usePlayerStore(s => s.setDuration);
  const seekTo = usePlayerStore(s => s.seekTo);
  const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
  const expandPlayer = useUIStore(s => s.expandPlayer);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
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

  useEffect(() => {
    if (!audioRef.current) return;
    const isVideoMode = usePlayerStore.getState().isVideoMode;
    if (isPlaying) {
      if (!isVideoMode) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("Play error:", e);
        });
      }
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
    } else {
      audioRef.current.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && pendingSeek !== null) {
      audioRef.current.currentTime = pendingSeek;
      seekTo(null);
    }
  }, [pendingSeek]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (!audioRef.current || isDragging.current) return;
    setProgress(audioRef.current.currentTime);
    if (!isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
    if ('mediaSession' in navigator && !isNaN(audioRef.current.duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current.duration,
          playbackRate: audioRef.current.playbackRate,
          position: audioRef.current.currentTime
        });
      } catch { }
    }
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const time = x * duration;
    audioRef.current.currentTime = time;
    setProgress(time);
  }, [duration, setProgress]);

  const handleAudioError = () => {
    if (!currentTrack) return;
    streamFailCount.current += 1;
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={nextTrack}
        onWaiting={() => usePlayerStore.getState().setBuffering(true)}
        onPlaying={() => usePlayerStore.getState().setBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onError={handleAudioError}
      />

      {currentTrack && !hideUI && (
        <footer
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-[60] lg:hidden select-none animate-in slide-in-from-bottom duration-200"
          onClick={() => setIsFullScreenOpen(true)}
        >
          {/* Thin progress bar — tap to seek */}
          <div
            ref={progressRef}
            className="h-1 bg-neutral-800 cursor-pointer relative active:h-1.5 transition-all group"
            onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}
          >
            <div
              className="h-full bg-white transition-all duration-100 relative"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-active:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Mobile (<660px) */}
          <div className="flex items-center gap-2 fold:hidden bg-[#0f0f0f]/95 backdrop-blur-xl px-3 py-2.5 border-t border-white/5">
            <CoverImage src={currentTrack.cover_url} alt="Cover" className="h-10 w-10 rounded-lg object-cover flex-shrink-0 shadow-lg" />
            <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
              <span className="text-sm font-semibold text-white truncate leading-tight">{currentTrack.title}</span>
              <span className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">{currentTrack.artist}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={prevTrack} className="text-neutral-400 hover:text-white transition p-1.5">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={togglePlay} className="bg-white text-black w-9 h-9 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg">
                {isBuffering
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : (isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />)
                }
              </button>
              <button onClick={nextTrack} className="text-neutral-400 hover:text-white transition p-1.5">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tablet (660px–1024px) */}
          <div className="hidden fold:flex items-center bg-[#0f0f0f]/95 backdrop-blur-xl px-5 py-3 border-t border-white/5">
            <div className="flex items-center gap-3 min-w-0 flex-1" onClick={e => e.stopPropagation()}>
              <CoverImage src={currentTrack.cover_url} alt="Cover" className="h-12 w-12 rounded-xl object-cover flex-shrink-0 shadow-lg" />
              <div className="min-w-0">
                <span className="text-sm font-bold text-white truncate block">{currentTrack.title}</span>
                <span className="text-xs text-neutral-400 truncate">{currentTrack.artist}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4" onClick={e => e.stopPropagation()}>
              <span className="text-xs text-neutral-500 font-mono tabular-nums">{formatTime(progress)}</span>
              <button onClick={prevTrack} className="text-neutral-300 hover:text-white transition p-1">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={togglePlay} className="bg-white text-black w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg">
                {isBuffering
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : (isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />)
                }
              </button>
              <button onClick={nextTrack} className="text-neutral-300 hover:text-white transition p-1">
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); expandPlayer(); }}
                className="p-2 text-neutral-400 hover:text-white transition"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </footer>
      )}
    </>
  );
}
