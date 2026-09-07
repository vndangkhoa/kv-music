import { useCallback, useEffect, useRef, useState } from 'react';

interface PagedList<T> {
    /** Currently visible slice — render this, song by song. */
    visible: T[];
    total: number;
    hasMore: boolean;
    /** Attach to an empty sentinel div at the end of the list. */
    sentinelRef: (node: HTMLElement | null) => void;
    reset: () => void;
}

/**
 * Song-by-song progressive rendering: shows the first `pageSize` items
 * instantly, then reveals more as the sentinel scrolls into view.
 * Keeps Feed/Library first paint fast no matter how many tracks load.
 */
export function usePagedList<T>(items: T[], pageSize = 6, step = 6): PagedList<T> {
    const [count, setCount] = useState(pageSize);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        setCount(pageSize);
    }, [items.length, pageSize]);

    const sentinelRef = useCallback((node: HTMLElement | null) => {
        if (observer.current) observer.current.disconnect();
        if (!node) return;
        observer.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setCount((c) => (c >= items.length ? c : Math.min(items.length, c + step)));
                }
            },
            { rootMargin: '600px 0px' } // prefetch before the user hits the bottom
        );
        observer.current.observe(node);
    }, [items.length, step]);

    useEffect(() => () => observer.current?.disconnect(), []);

    return {
        visible: items.slice(0, count),
        total: items.length,
        hasMore: count < items.length,
        sentinelRef,
        reset: () => setCount(pageSize),
    };
}
