import { useCallback, useRef } from 'react';

export interface SwipeHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

// Generic touch-swipe detection (SoundCloud-style gestures).
// Attach the returned handlers to an element's onTouchStart/Move/End.
export function useSwipe({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 60,
    velocityThreshold = 500,
}: SwipeHandlers & { threshold?: number; velocityThreshold?: number }) {
    const start = useRef<{ x: number; y: number; t: number } | null>(null);
    const last = useRef<{ x: number; y: number; t: number } | null>(null);
    const tracking = useRef(false);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
        last.current = start.current;
        tracking.current = true;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!tracking.current || !last.current) return;
        const t = e.touches[0];
        last.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!tracking.current || !start.current || !last.current) return;
        tracking.current = false;
        const dx = last.current.x - start.current.x;
        const dy = last.current.y - start.current.y;
        const dt = Math.max(1, last.current.t - start.current.t);
        const vx = Math.abs(dx / dt) * 1000;
        const vy = Math.abs(dy / dt) * 1000;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        const horizontal = adx > ady;
        if (horizontal && adx > threshold) {
            if (dx < 0) onSwipeLeft?.();
            else onSwipeRight?.();
        } else if (!horizontal && ady > threshold) {
            if (dy < 0) onSwipeUp?.();
            else onSwipeDown?.();
        } else if (horizontal && vx > velocityThreshold) {
            if (dx < 0) onSwipeLeft?.();
            else onSwipeRight?.();
        } else if (!horizontal && vy > velocityThreshold) {
            if (dy < 0) onSwipeUp?.();
            else onSwipeDown?.();
        }
        start.current = null;
        last.current = null;
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocityThreshold]);

    return { onTouchStart, onTouchMove, onTouchEnd };
}
