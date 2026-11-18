import { motion } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useSwipe } from '../../hooks/useSwipe';
import { haptic } from '../../utils/haptic';
import CoverImage from '../CoverImage';

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
    onSwipeLeft: () => {
      haptic(8);
      nextTrack();
    },
    onSwipeRight: () => {
      haptic(8);
      prevTrack();
    },
    onSwipeUp: () => setIsFullScreenOpen(true),
    threshold: 50,
  });

  if (!currentTrack) return null;

  const playedFraction = duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0;

  return (
    <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom))] left-0 right-0 z-50 md:hidden select-none">
      <motion.div
        {...swipe}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        role="region"
        aria-label="Mini player"
        className="relative h-16 bg-[#212121] border-t border-white/10 px-4 flex items-center gap-3 cursor-pointer touch-pan-y"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          setIsFullScreenOpen(true);
        }}
      >
        <CoverImage
          src={currentTrack.cover_url}
          alt={currentTrack.title}
          className="w-12 h-12 rounded-[4px] flex-shrink-0 object-cover bg-[#181818]"
          fallbackText="♪"
        />

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-white truncate leading-[18px]">
            {currentTrack.title}
          </p>
          <p className="text-[14px] text-white/70 truncate leading-[18px] mt-0.5">
            {currentTrack.artist}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptic(8);
              togglePlay();
            }}
            className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center text-white active:scale-95 transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              haptic(8);
              nextTrack();
            }}
            className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center text-white active:scale-95 transition"
            aria-label="Next track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Bottom 2px progress track */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/15 pointer-events-none">
          <div
            className="h-full bg-white transition-[width] duration-150 ease-linear"
            style={{ width: `${playedFraction * 100}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
}
