import { useRef, useState, useEffect } from 'react';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  className?: string;
  barClassName?: string;
  thumbClassName?: string;
}

export default function ProgressBar({
  progress,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
  className = '',
  barClassName = '',
  thumbClassName = '',
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setLocalProgress(time);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
    onSeekStart?.();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onSeek(localProgress);
    onSeekEnd?.();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    onSeek(localProgress);
    onSeekEnd?.();
  };

  const pct = ((localProgress / (duration || 1)) * 100);

  return (
    <div className={`relative group cursor-pointer select-none ${className}`}>
      <div className={`absolute inset-0 rounded-full ${barClassName || 'bg-neutral-800'}`} />
      <div
        className="absolute top-0 bottom-0 left-0 bg-neutral-400 group-hover:bg-green-500 rounded-full transition-colors"
        style={{ width: `${pct}%` }}
      />
      <div
        className={`absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow ${thumbClassName}`}
        style={{ left: `${pct}%` }}
      />
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={duration || 100}
        value={localProgress}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
}
