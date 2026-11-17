import { useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';

function toAbsoluteUrl(raw?: string): string {
    if (!raw) return '';
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}${raw.startsWith('/') ? raw : `/${raw}`}`;
    }
    return raw;
}

function buildArtwork(coverUrl?: string): MediaImage[] {
    const resolvedCover = toAbsoluteUrl(coverUrl);
    if (resolvedCover) {
        return [
            { src: resolvedCover, sizes: '96x96' },
            { src: resolvedCover, sizes: '128x128' },
            { src: resolvedCover, sizes: '192x192' },
            { src: resolvedCover, sizes: '256x256' },
            { src: resolvedCover, sizes: '384x384' },
            { src: resolvedCover, sizes: '512x512' },
        ];
    }

    const sizes = [96, 128, 192, 256, 384, 512];
    return sizes.map((sz) => ({
        src: toAbsoluteUrl(`/icons/icon-${sz}x${sz}.png`),
        sizes: `${sz}x${sz}`,
        type: 'image/png',
    }));
}

function findAudioElement(): HTMLAudioElement | null {
    return typeof document !== 'undefined' ? document.querySelector('audio') : null;
}

export default function useMediaSession() {
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

        const mediaSession = navigator.mediaSession;
        let lastTrackKey = '';
        let lastPositionBucket = -1;

        const syncPlaybackState = () => {
            const state = usePlayerStore.getState();
            if (!state.currentTrack) {
                mediaSession.playbackState = 'none';
                return;
            }
            if (state.isVideoMode) {
                mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
                return;
            }
            const audio = findAudioElement();
            if (!audio) {
                mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
                return;
            }
            mediaSession.playbackState = (!audio.paused && !audio.ended) || state.isPlaying ? 'playing' : 'paused';
        };

        const syncPosition = (force = false) => {
            if (typeof mediaSession.setPositionState !== 'function') return;
            const state = usePlayerStore.getState();
            const audio = findAudioElement();
            const rawDuration = audio && Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : state.duration;
            if (!Number.isFinite(rawDuration) || rawDuration <= 0) return;

            const rawPosition = audio && Number.isFinite(audio.currentTime)
                ? audio.currentTime
                : state.progress;
            const validPosition = Number.isFinite(rawPosition)
                ? Math.max(0, Math.min(rawDuration, rawPosition))
                : 0;
            const bucket = Math.floor(validPosition);
            if (!force && bucket === lastPositionBucket) return;
            lastPositionBucket = bucket;

            const rawRate = audio?.playbackRate;
            const validRate = rawRate && Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 1;

            try {
                mediaSession.setPositionState({
                    duration: rawDuration,
                    playbackRate: validRate,
                    position: validPosition,
                });
            } catch {
                // Ignore transient invalid position errors while loading metadata
            }
        };

        const syncMetadata = () => {
            const state = usePlayerStore.getState();
            const track = state.currentTrack;
            if (!track) {
                lastTrackKey = '';
                mediaSession.playbackState = 'none';
                return;
            }

            const trackKey = `${track.id}|${track.title}|${track.artist}|${track.cover_url || ''}`;
            if (trackKey !== lastTrackKey) {
                lastTrackKey = trackKey;
                lastPositionBucket = -1;
                if (typeof MediaMetadata !== 'undefined') {
                    try {
                        mediaSession.metadata = new MediaMetadata({
                            title: track.title || 'KV Music',
                            artist: track.artist || 'KV Music',
                            album: track.album || 'KV Music — Hi-Res Streaming',
                            artwork: buildArtwork(track.cover_url),
                        });
                    } catch {
                        // Ignore on browsers without full MediaMetadata support
                    }
                }
            }

            syncPlaybackState();
            syncPosition(true);
        };

        const handleAction = (details: MediaSessionActionDetails) => {
            const state = usePlayerStore.getState();
            const audio = findAudioElement();
            const curProgress = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : state.progress;
            const curDuration = audio && Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : state.duration;

            switch (details.action) {
                case 'play':
                    if (!state.isPlaying) state.togglePlay();
                    if (audio && audio.paused && !state.isVideoMode) {
                        audio.play().catch(() => {});
                    }
                    mediaSession.playbackState = 'playing';
                    syncPosition(true);
                    break;
                case 'pause':
                    if (state.isPlaying) state.togglePlay();
                    if (audio && !audio.paused) audio.pause();
                    mediaSession.playbackState = 'paused';
                    syncPosition(true);
                    break;
                case 'previoustrack':
                    state.prevTrack();
                    break;
                case 'nexttrack':
                    state.nextTrack();
                    break;
                case 'stop':
                    if (state.isPlaying) state.togglePlay();
                    if (audio && !audio.paused) audio.pause();
                    mediaSession.playbackState = 'paused';
                    syncPosition(true);
                    break;
                case 'seekto':
                    if (details.seekTime != null && Number.isFinite(details.seekTime)) {
                        const target = Math.max(0, curDuration > 0 ? Math.min(curDuration, details.seekTime) : details.seekTime);
                        state.seekTo(target);
                        if (audio) audio.currentTime = target;
                        syncPosition(true);
                    }
                    break;
                case 'seekbackward': {
                    const offset = details.seekOffset ?? 10;
                    const target = Math.max(0, curProgress - offset);
                    state.seekTo(target);
                    if (audio) audio.currentTime = target;
                    syncPosition(true);
                    break;
                }
                case 'seekforward': {
                    const offset = details.seekOffset ?? 10;
                    const maxTarget = curDuration > 0 ? curDuration : curProgress + offset;
                    const target = Math.min(maxTarget, curProgress + offset);
                    state.seekTo(target);
                    if (audio) audio.currentTime = target;
                    syncPosition(true);
                    break;
                }
            }
        };

        const actions: MediaSessionAction[] = [
            'play',
            'pause',
            'previoustrack',
            'nexttrack',
            'stop',
            'seekto',
            'seekbackward',
            'seekforward',
        ];
        actions.forEach((action) => {
            try {
                mediaSession.setActionHandler(action, handleAction);
            } catch {
                // Ignore unsupported action on older browsers
            }
        });

        const audio = findAudioElement();
        const onAudioStateChange = () => {
            syncPlaybackState();
            syncPosition(true);
        };
        const onAudioTimeChange = () => {
            syncPosition(false);
        };

        if (audio) {
            audio.addEventListener('play', onAudioStateChange);
            audio.addEventListener('playing', onAudioStateChange);
            audio.addEventListener('pause', onAudioStateChange);
            audio.addEventListener('ended', onAudioStateChange);
            audio.addEventListener('loadedmetadata', onAudioStateChange);
            audio.addEventListener('durationchange', onAudioStateChange);
            audio.addEventListener('seeked', onAudioStateChange);
            audio.addEventListener('ratechange', onAudioStateChange);
            audio.addEventListener('timeupdate', onAudioTimeChange);
        }

        const unsubscribe = usePlayerStore.subscribe((state, prev) => {
            if (
                state.currentTrack?.id !== prev.currentTrack?.id ||
                state.currentTrack?.title !== prev.currentTrack?.title ||
                state.currentTrack?.artist !== prev.currentTrack?.artist ||
                state.currentTrack?.cover_url !== prev.currentTrack?.cover_url
            ) {
                syncMetadata();
            }
            if (state.isPlaying !== prev.isPlaying || state.isVideoMode !== prev.isVideoMode) {
                syncPlaybackState();
                syncPosition(true);
            }
            if (state.duration !== prev.duration) {
                syncPosition(true);
            } else if (state.progress !== prev.progress) {
                syncPosition(false);
            }
        });

        syncMetadata();

        return () => {
            unsubscribe();
            if (audio) {
                audio.removeEventListener('play', onAudioStateChange);
                audio.removeEventListener('playing', onAudioStateChange);
                audio.removeEventListener('pause', onAudioStateChange);
                audio.removeEventListener('ended', onAudioStateChange);
                audio.removeEventListener('loadedmetadata', onAudioStateChange);
                audio.removeEventListener('durationchange', onAudioStateChange);
                audio.removeEventListener('seeked', onAudioStateChange);
                audio.removeEventListener('ratechange', onAudioStateChange);
                audio.removeEventListener('timeupdate', onAudioTimeChange);
            }
            actions.forEach((action) => {
                try {
                    mediaSession.setActionHandler(action, null);
                } catch {
                    // Ignore cleanup errors
                }
            });
        };
    }, []);
}
