import { useEffect, useRef, useCallback } from 'react';
import { useWaveformData } from '../hooks/useWaveformData';

interface WaveformProps {
    trackId?: string;
    peaks?: number[];
    played?: number;          // 0..1 fraction played
    interactive?: boolean;
    onSeek?: (ratio: number) => void;
    height?: number;          // px
    className?: string;
    barWidth?: number;        // px per bar
    barGap?: number;          // px gap between bars
    color?: string;           // played color (default orange)
}

export default function Waveform({
    trackId,
    peaks: peaksProp,
    played = 0,
    interactive = false,
    onSeek,
    height = 40,
    className = '',
    barWidth = 2,
    barGap = 1.5,
    color = '#ff5500',
}: WaveformProps) {
    const { peaks: peaksFromHook } = useWaveformData(trackId);
    const rawPeaks = (peaksProp && peaksProp.length > 0) ? peaksProp : (peaksFromHook || []);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const draggingRef = useRef(false);

    const draw = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        if (width <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const totalStep = barWidth + barGap;
        const numBars = Math.max(1, Math.floor((width + barGap) / totalStep));

        const sampled: number[] = [];
        const sourceLen = rawPeaks.length || 1;
        for (let i = 0; i < numBars; i++) {
            const start = Math.floor((i / numBars) * sourceLen);
            const end = Math.floor(((i + 1) / numBars) * sourceLen);
            let max = 0;
            for (let j = start; j < Math.max(start + 1, end); j++) {
                if (rawPeaks[j] > max) max = rawPeaks[j];
            }
            sampled.push(max || 0.15);
        }

        const playedBarIndex = Math.round(played * numBars);

        for (let i = 0; i < numBars; i++) {
            const val = sampled[i];
            const barH = Math.max(3, val * (height - 4));
            const x = i * totalStep;
            const y = (height - barH) / 2;

            ctx.fillStyle = i < playedBarIndex ? color : 'rgba(255, 255, 255, 0.22)';

            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, barWidth, barH);
            }
        }
    }, [rawPeaks, played, height, barWidth, barGap, color]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const ratioFromEvent = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive || !onSeek) return;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onSeek(ratioFromEvent(e.clientX));
  }, [interactive, onSeek, ratioFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactive || !onSeek || !draggingRef.current) return;
    onSeek(ratioFromEvent(e.clientX));
  }, [interactive, onSeek, ratioFromEvent]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-full overflow-hidden select-none relative ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{ height, touchAction: interactive ? 'none' : undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block overflow-hidden pointer-events-none"
      />
    </div>
  );
}
