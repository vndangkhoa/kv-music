import { useEffect } from 'react';

interface Shortcuts {
    onSpace?: () => void;
    onSeekBack?: () => void;
    onSeekForward?: () => void;
    onVolumeDown?: () => void;
    onVolumeUp?: () => void;
    onEscape?: () => void;
}

// SoundCloud-style desktop keyboard controls: Space = play/pause,
// Left/Right = seek ±10s, Up/Down = volume, Esc = close overlays.
export function useKeyboardShortcuts({
    onSpace,
    onSeekBack,
    onSeekForward,
    onVolumeDown,
    onVolumeUp,
    onEscape,
}: Shortcuts) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    onSpace?.();
                    break;
                case 'ArrowLeft':
                    onSeekBack?.();
                    break;
                case 'ArrowRight':
                    onSeekForward?.();
                    break;
                case 'ArrowUp':
                    onVolumeUp?.();
                    break;
                case 'ArrowDown':
                    onVolumeDown?.();
                    break;
                case 'Escape':
                    onEscape?.();
                    break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onSpace, onSeekBack, onSeekForward, onVolumeDown, onVolumeUp, onEscape]);
}
