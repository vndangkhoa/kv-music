import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  shuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PlayerControls({
  isPlaying,
  isBuffering,
  shuffle,
  repeatMode,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  size = 'md',
  className = '',
}: PlayerControlsProps) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 28 : 22;
  const playBtnSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const playIconSize = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={onToggleShuffle}
        className={`p-1.5 rounded-full hover:bg-white/5 transition ${shuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
        title="Shuffle"
      >
        <Shuffle size={iconSize} />
      </button>

      <button
        onClick={onPrev}
        className="text-neutral-400 hover:text-white transition p-1"
        title="Previous"
      >
        <SkipBack size={iconSize} />
      </button>

      <button
        onClick={onTogglePlay}
        className={`${playBtnSize} bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying
          ? <Pause size={playIconSize} fill="currentColor" />
          : <Play size={playIconSize} fill="currentColor" className="ml-0.5" />
        }
      </button>

      <button
        onClick={onNext}
        className="text-neutral-400 hover:text-white transition p-1"
        title="Next"
      >
        <SkipForward size={iconSize} />
      </button>

      <button
        onClick={onToggleRepeat}
        className={`p-1.5 rounded-full hover:bg-white/5 transition relative ${repeatMode !== 'none' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
        title="Repeat"
      >
        <Repeat size={iconSize} />
        {repeatMode === 'one' && (
          <span className="absolute top-0 right-0 text-[8px] font-black text-black bg-green-500 rounded-full w-3 h-3 flex items-center justify-center">
            1
          </span>
        )}
      </button>
    </div>
  );
}
