import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ChevronUp } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useSwipe } from '../../hooks/useSwipe';
import { haptic } from '../../utils/haptic';
import CoverImage from '../CoverImage';
import Waveform from '../Waveform';
import Logo from '../Logo';

function formatTime(t: number) {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MobileMiniBar() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const prevTrack = usePlayerStore(s => s.prevTrack);
  const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);

  const swipe = useSwipe({
    onSwipeLeft: () => { haptic(8); nextTrack(); },
    onSwipeRight: () => { haptic(8); prevTrack(); },
    onSwipeUp: () => setIsFullScreenOpen(true),
    threshold: 50,
  });

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+8px)] left-2 right-2 z-50 md:hidden select-none">
      <motion.div
        {...swipe}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2.5 px-2.5 py-2 bg-[#1c1c1c]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl cursor-pointer touch-pan-y"
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest('button')) return;
          setIsFullScreenOpen(true);
        }}
      >
        <CoverImage
          src={currentTrack.cover_url}
          alt={currentTrack.title}
          className={`w-[42px] h-[42px] rounded-lg flex-shrink-0 object-cover border transition ${
            isPlaying ? 'border-[#ff5500]/60 ring-1 ring-[#ff5500]/50' : 'border-white/10'
          }`}
          fallbackText="♪"
        />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 min-w-0 mt-0.5">
            <Logo size={13} showText={false} />
            <span className="truncate">{currentTrack.artist}</span>
            <span className="flex-shrink-0">•</span>
            <span className="font-mono text-neutral-300 flex-shrink-0">
              {formatTime(progress)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}
            </span>
          </div>
          {duration > 0 && (
            <Waveform
              trackId={currentTrack.id}
              played={duration > 0 ? progress / duration : 0}
              height={10}
              barWidth={1.5}
              barGap={1}
              className="mt-1"
            />
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); haptic(8); prevTrack(); }}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white active:scale-95 transition"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); haptic(8); togglePlay(); }}
            className="w-9 h-9 rounded-full bg-[#ff5500] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition shadow"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); haptic(8); nextTrack(); }}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white active:scale-95 transition"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setIsFullScreenOpen(true); }}
            className="p-1 text-neutral-400 hover:text-white transition"
            aria-label="Expand player"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
