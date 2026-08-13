import { useCallback, useRef, useState } from 'react';

// Pull-to-refresh for scrollable containers (SoundCloud-style feeds).
// Attach returned props to a scrollable div. Refresh triggers when the user
// pulls down while already at scrollTop 0 (with some rubber-band resistance).
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const startY = useRef<number | null>(null);
    const pull = useRef(0);
    const [refreshing, setRefreshing] = useState(false);
    const [pullDist, setPullDist] = useState(0);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const el = containerRef.current;
        if (!el || el.scrollTop > 0 || refreshing) return;
        startY.current = e.touches[0].clientY;
        pull.current = 0;
    }, [refreshing]);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (startY.current === null) return;
        const el = containerRef.current;
        if (!el || el.scrollTop > 0) return;
        const dy = e.touches[0].clientY - startY.current;
        if (dy <= 0) {
            setPullDist(0);
            return;
        }
        pull.current = Math.min(dy * 0.45, 90);
        setPullDist(pull.current);
    }, []);

    const onTouchEnd = useCallback(async () => {
        if (startY.current === null) return;
        startY.current = null;
        if (pull.current >= 60 && !refreshing) {
            setRefreshing(true);
            setPullDist(52);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setPullDist(0);
            }
        } else {
            setPullDist(0);
        }
        pull.current = 0;
    }, [onRefresh, refreshing]);

    const indicator = refreshing || pullDist > 0 ? (
        <div
            className="flex items-center justify-center overflow-hidden transition-all duration-200"
            style={{ height: pullDist }}
        >
            <div
                className={`w-6 h-6 rounded-full border-2 ${refreshing ? 'border-orange-500 border-t-transparent animate-spin' : 'border-neutral-600 border-t-neutral-300'}`}
                style={{ transform: `rotate(${pullDist * 4}deg)` }}
            />
        </div>
    ) : null;

    return {
        containerRef,
        pullProps: { onTouchStart, onTouchMove, onTouchEnd },
        indicator,
        refreshing,
    };
}
