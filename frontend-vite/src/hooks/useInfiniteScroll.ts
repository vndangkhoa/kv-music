import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(callback: () => void, isFetching: boolean = false) {
    const observer = useRef<IntersectionObserver | null>(null);

    const lastElementRef = useCallback((node: HTMLElement | null) => {
        if (isFetching) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                callback();
            }
        });

        if (node) observer.current.observe(node);
    }, [isFetching, callback]);

    return lastElementRef;
}
