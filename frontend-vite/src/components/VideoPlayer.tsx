import { useEffect, useRef, useState } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
    videoId: string;
    isPlaying: boolean;
    onTimeUpdate?: (time: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    className?: string;
}

export default function VideoPlayer({
    videoId,
    isPlaying,
    onTimeUpdate,
    onPlay,
    onPause,
    onEnded,
    className = ''
}: VideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<Plyr | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const isParentControlledRef = useRef<boolean>(false);

    // Initialize Plyr
    useEffect(() => {
        if (!containerRef.current || !videoId) return;

        // Clean up previous instance
        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
            setIsReady(false);
        }

        // Clear container
        containerRef.current.innerHTML = '';

        // Create wrapper div for Plyr
        const wrapper = document.createElement('div');
        wrapper.className = 'plyr__video-embed';
        containerRef.current.appendChild(wrapper);

        // Create iframe
        const iframe = document.createElement('iframe');
        const origin = encodeURIComponent(window.location.origin);
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&showinfo=0&origin=${origin}`;
        iframe.allow = 'autoplay; fullscreen';
        iframe.allowFullscreen = true;
        iframe.setAttribute('allowtransparency', 'true');
        wrapper.appendChild(iframe);
        iframeRef.current = iframe;

        // Initialize Plyr
        const player = new Plyr(wrapper, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            youtube: {
                noCookie: false,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                modestbranding: 1,
            },
            ratio: '16:9',
            fullscreen: {
                enabled: true,
                fallback: true,
                iosNative: true,
            },
            clickToPlay: true,
            hideControls: true,
            resetOnEnd: false,
        });

        playerRef.current = player;

        // Event handlers
        player.on('ready', () => {
            setIsReady(true);
            if (isPlaying) {
                isParentControlledRef.current = true;
                player.play();
                // Reset flag after a short delay to allow the play event to be processed
                setTimeout(() => {
                    isParentControlledRef.current = false;
                }, 100);
            }
        });

        player.on('play', () => {
            // Only call onPlay if this event was triggered by user interaction (not by parent)
            if (!isParentControlledRef.current) {
                onPlay?.();
            }
        });

        player.on('pause', () => {
            // Only call onPause if this event was triggered by user interaction (not by parent)
            if (!isParentControlledRef.current) {
                onPause?.();
            }
        });

        player.on('timeupdate', () => {
            if (onTimeUpdate && player.currentTime) {
                onTimeUpdate(player.currentTime);
            }
        });

        player.on('ended', () => {
            onEnded?.();
        });

        // Clean up on unmount or videoId change
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            // Clear container
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            setIsReady(false);
        };
    }, [videoId]);

    // Handle play/pause from parent
    useEffect(() => {
        if (!playerRef.current || !isReady) return;

        isParentControlledRef.current = true;
        
        if (isPlaying) {
            playerRef.current.play();
        } else {
            playerRef.current.pause();
        }
        
        // Reset flag after a short delay to allow the play/pause event to be processed
        setTimeout(() => {
            isParentControlledRef.current = false;
        }, 100);
    }, [isPlaying, isReady]);

    return (
        <div className={`w-full h-full ${className}`}>
            <div ref={containerRef} className="w-full h-full plyr__video-embed" />
            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-[#FF0000] rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}