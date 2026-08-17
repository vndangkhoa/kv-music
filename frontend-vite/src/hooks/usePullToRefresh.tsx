import { useCallback, useRef, useState } from 'react';

// Pull-to-refresh for scrollable containers, with a STATIC layout: the
// content never moves or "slips away" while pulling. A small fixed spinner
// pill appears at the top-center of the screen; the refresh runs in place
// (the page data reloads without any layout shift). Native browser
// pull-to-refresh / overscroll bounce on the container is suppressed via
// overscroll-behavior (returned as part of the props).
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
        // Only pull while at the top; consume the gesture so the browser's
        // native pull-to-refresh / overscroll never kicks in.
        if (dy > 8) e.preventDefault();
        pull.current = Math.min(dy * 0.35, 64);
        setPullDist(pull.current);
    }, []);

    const onTouchEnd = useCallback(async () => {
        if (startY.current === null) return;
        startY.current = null;
        if (pull.current >= 48 && !refreshing) {
            setRefreshing(true);
            setPullDist(0);
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

    // Fixed overlay pill — never participates in layout, so the page stays
    // perfectly static while pulling/refreshing.
    const indicator = refreshing || pullDist > 0 ? (
        <div
            className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur border border-white/15"
            style={{ top: 'calc(10px + env(safe-area-inset-top, 0px))' }}
        >
            <div
                className={`w-4 h-4 rounded-full border-2 ${refreshing ? 'border-[#ff5500] border-t-transparent animate-spin' : 'border-neutral-400 border-t-transparent'}`}
                style={{ transform: refreshing ? undefined : `rotate(${pullDist * 3}deg)` }}
            />
            {refreshing && <span className="text-[11px] font-semibold text-white/90">Refreshing…</span>}
        </div>
    ) : null;

    return {
        containerRef,
        pullProps: {
            onTouchStart,
            onTouchMove,
            onTouchEnd,
            style: { overscrollBehaviorY: 'contain' as const, touchAction: 'pan-y' as const },
        },
        indicator,
        refreshing,
    };
}
