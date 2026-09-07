import { useEffect, useRef, useCallback, useState, memo } from 'react';
import { useWaveformData } from '../hooks/useWaveformData';
import { haptic } from '../utils/haptic';

interface WaveformProps {
    trackId?: string;
    peaks?: number[];
    played?: number;          // 0..1 fraction played
    interactive?: boolean;
    onSeek?: (ratio: number) => void;
    /** Commit-only callback fired once on release (use for actual audio seek to avoid seek storms) */
    onScrubEnd?: (ratio: number) => void;
    /** Live preview while scrubbing (cheap UI updates only) */
    onScrubPreview?: (ratio: number) => void;
    duration?: number;        // seconds, for the scrub time bubble
    height?: number;          // px (visual bar height)
    className?: string;
    barWidth?: number;        // px per bar
    barGap?: number;          // px gap between bars
    color?: string;           // played color (default orange)
    /** Fetch + decode the real audio to compute true peaks. Default false (cheap seeded bars). */
    loadRealAudio?: boolean;
    /**
     * When true (default for interactive), a simple tap does NOTHING —
     * the user must press-and-hold (~200ms) or slide ≥8px to start scrubbing.
     * This fixes miss-taps on phones that accidentally seeked/started playback.
     */
    requireHoldToSeek?: boolean;
    /** Show "hold & slide to seek" hint. Default true on touch devices when interactive. */
    showHint?: boolean;
}

const HOLD_MS = 220;
const MOVE_PX = 8;

function formatTime(t: number) {
    if (!isFinite(t) || t < 0) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function Waveform({
    trackId,
    peaks: peaksProp,
    played = 0,
    interactive = false,
    onSeek,
    onScrubEnd,
    onScrubPreview,
    duration = 0,
    height = 40,
    className = '',
    barWidth = 2,
    barGap = 1.5,
    color = '#ff5500',
    loadRealAudio = false,
    requireHoldToSeek = true,
    showHint = true,
}: WaveformProps) {
    const { peaks: peaksFromHook } = useWaveformData(trackId, 160, loadRealAudio);
    const rawPeaks = (peaksProp && peaksProp.length > 0) ? peaksProp : (peaksFromHook || []);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef(0);
    const gestureRef = useRef<{
        pointerId: number; startX: number; startY: number;
        scrubbing: boolean; holdTimer: number | null; previewRatio: number;
    } | null>(null);
    const [scrubRatio, setScrubRatio] = useState<number | null>(null);
    const [showTouchHint, setShowTouchHint] = useState(false);

    useEffect(() => {
        if (!interactive || !showHint) return;
        try {
            if (window.matchMedia?.('(pointer: coarse)').matches && !localStorage.getItem('kv_wave_hint_seen')) {
                setShowTouchHint(true);
                const t = setTimeout(() => setShowTouchHint(false), 5000);
                return () => clearTimeout(t);
            }
        } catch { /* noop */ }
    }, [interactive, showHint]);

    const draw = useCallback((preview: number | null) => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const rect = container.getBoundingClientRect();
        // Container includes vertical touch padding; canvas draws in the middle `height` band.
        const width = rect.width;
        if (width <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        const cssH = height + 24; // matches container padding
        if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(cssH * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, cssH);

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

        const effectivePlayed = preview ?? played;
        const playedBarIndex = Math.round(effectivePlayed * numBars);
        const topOffset = 12;

        for (let i = 0; i < numBars; i++) {
            const val = sampled[i];
            const barH = Math.max(3, val * (height - 4));
            const x = i * totalStep;
            const y = topOffset + (height - barH) / 2;

            ctx.fillStyle = i < playedBarIndex ? color : 'rgba(255, 255, 255, 0.22)';

            if (typeof ctx.roundRect === 'function') {
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barH, barWidth / 2);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, barWidth, barH);
            }
        }

        // Scrub cursor + handle while scrubbing
        if (preview != null) {
            const cx = Math.max(0, Math.min(width, preview * width));
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 1, 4, 2, cssH - 8);
            ctx.beginPath();
            ctx.arc(cx, cssH / 2, 8, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }, [rawPeaks, played, height, barWidth, barGap, color]);

    // Redraw on data/progress changes (rAF-throttled; cheap canvas op).
    // Non-interactive rows render a static seeded bar once — no per-tick work.
    useEffect(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => draw(scrubRatio));
        return () => cancelAnimationFrame(rafRef.current);
    }, [draw, scrubRatio]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const observer = new ResizeObserver(() => draw(scrubRatio));
        observer.observe(container);
        return () => observer.disconnect();
    }, [draw, scrubRatio]);

    const ratioFromClientX = useCallback((clientX: number) => {
        const el = containerRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }, []);

    const beginScrub = useCallback((ratio: number) => {
        const g = gestureRef.current;
        if (!g || g.scrubbing) return;
        g.scrubbing = true;
        g.previewRatio = ratio;
        setScrubRatio(ratio);
        onScrubPreview?.(ratio);
        try { haptic(10); } catch { /* noop */ }
        try { localStorage.setItem('kv_wave_hint_seen', '1'); } catch { /* noop */ }
        setShowTouchHint(false);
    }, [onScrubPreview]);

    const cancelHoldTimer = useCallback(() => {
        const g = gestureRef.current;
        if (g?.holdTimer != null) {
            window.clearTimeout(g.holdTimer);
            g.holdTimer = null;
        }
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!interactive) return;
        const commit = onScrubEnd ?? onSeek;
        if (!commit && !onScrubPreview) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        gestureRef.current = {
            pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
            scrubbing: false, holdTimer: null, previewRatio: ratioFromClientX(e.clientX),
        };
        if (!requireHoldToSeek) {
            beginScrub(ratioFromClientX(e.clientX));
        } else {
            // Hold-to-seek: arm a timer; movement past MOVE_PX also starts scrub.
            gestureRef.current.holdTimer = window.setTimeout(() => {
                const g = gestureRef.current;
                if (g && !g.scrubbing) beginScrub(g.previewRatio);
            }, HOLD_MS);
        }
    }, [interactive, onScrubEnd, onSeek, onScrubPreview, requireHoldToSeek, ratioFromClientX, beginScrub]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const g = gestureRef.current;
        if (!interactive || !g || e.pointerId !== g.pointerId) return;
        const ratio = ratioFromClientX(e.clientX);
        g.previewRatio = ratio;
        const moved = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
        if (!g.scrubbing) {
            if (moved >= MOVE_PX) beginScrub(ratio); // slide-to-seek, no hold needed
            return;
        }
        setScrubRatio(ratio);
        onScrubPreview?.(ratio);
    }, [interactive, ratioFromClientX, beginScrub, onScrubPreview]);

    const endGesture = useCallback((e: React.PointerEvent, commit: boolean) => {
        const g = gestureRef.current;
        if (!g || e.pointerId !== g.pointerId) return;
        cancelHoldTimer();
        const wasScrubbing = g.scrubbing;
        const ratio = g.previewRatio;
        gestureRef.current = null;
        setScrubRatio(null);
        if (commit && wasScrubbing) {
            (onScrubEnd ?? onSeek)?.(ratio); // single commit — no seek storm
            try { haptic(8); } catch { /* noop */ }
        }
        // Plain tap (no hold, no slide) is intentionally ignored to prevent miss-taps.
    }, [cancelHoldTimer, onScrubEnd, onSeek]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => endGesture(e, true), [endGesture]);
    const handlePointerCancel = useCallback((e: React.PointerEvent) => endGesture(e, false), [endGesture]);

    const scrubTime = scrubRatio != null && duration > 0 ? scrubRatio * duration : null;

    return (
        <div className={`relative w-full max-w-full select-none ${className}`}>
            <div
                ref={containerRef}
                role={interactive ? 'slider' : undefined}
                aria-label={interactive ? 'Seek. Press and hold, then slide to scrub.' : undefined}
                aria-valuemin={interactive ? 0 : undefined}
                aria-valuemax={interactive ? 100 : undefined}
                aria-valuenow={interactive ? Math.round((scrubRatio ?? played) * 100) : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={interactive ? (e) => {
                    const commit = onScrubEnd ?? onSeek;
                    if (!commit || duration <= 0) return;
                    const cur = scrubRatio ?? played;
                    if (e.key === 'ArrowRight') { e.preventDefault(); commit(Math.min(1, cur + 5 / duration)); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); commit(Math.max(0, cur - 5 / duration)); }
                } : undefined}
                className={`w-full overflow-hidden relative ${interactive ? 'cursor-ew-resize touch-pan-y' : ''}`}
                style={{ height: height + 24, paddingTop: 12, paddingBottom: 12, touchAction: interactive ? 'pan-y' : undefined }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerCancel}
                onContextMenu={(e) => { if (interactive) e.preventDefault(); }}
            >
                <canvas ref={canvasRef} className="w-full block overflow-hidden pointer-events-none" style={{ height }} />
            </div>
            {/* Scrub time bubble */}
            {scrubTime != null && (
                <div
                    className="absolute -top-1 px-2 py-0.5 rounded-md bg-black/85 border border-white/20 text-[10px] font-mono text-white pointer-events-none whitespace-nowrap z-10"
                    style={{ left: `clamp(8px, ${(scrubRatio ?? 0) * 100}%, calc(100% - 52px))` }}
                >
                    {formatTime(scrubTime)} / {formatTime(duration)}
                </div>
            )}
            {showTouchHint && interactive && (
                <p className="text-[10px] text-neutral-500 mt-0.5 text-center">Hold &amp; slide on the waveform to seek</p>
            )}
        </div>
    );
}

export default memo(Waveform);
