import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/playerStore';

interface MediaArtwork {
    src: string;
    sizes?: string;
    type?: string;
}

async function buildArtwork(url: string): Promise<MediaArtwork | null> {
    if (!url) return null;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('bad status');
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('empty blob');
        return {
            src: URL.createObjectURL(blob),
            sizes: '512x512',
            type: blob.type,
        };
    } catch {
        return { src: url };
    }
}

function findAudioElement(): HTMLAudioElement | null {
    return document.querySelector('audio');
}

export default function useMediaSession() {
    const artworkUrlRef = useRef<MediaArtwork[] | null>(null);

    useEffect(() => {
        if (!('mediaSession' in navigator)) return;

        const mediaSession = navigator.mediaSession;

        const syncPlaybackState = () => {
            const state = usePlayerStore.getState();
            const audio = findAudioElement();
            if (state.isVideoMode || !audio || audio.paused) {
                mediaSession.playbackState = 'paused';
                return;
            }
            mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
        };

        const syncPosition = () => {
            const audio = findAudioElement();
            if (!audio) return;
            const duration = audio.duration;
            if (isNaN(duration)) return;
            try {
                mediaSession.setPositionState({
                    duration,
                    playbackRate: audio.playbackRate,
                    position: audio.currentTime,
                });
            } catch { }
        };

        const syncMetadata = async () => {
            const state = usePlayerStore.getState();
            const track = state.currentTrack;
            if (!track) return;

            const artwork = track.cover_url ? await buildArtwork(track.cover_url) : null;
            if (artworkUrlRef.current) {
                artworkUrlRef.current.forEach(a => {
                    if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src);
                });
            }
            artworkUrlRef.current = artwork ? [artwork] : [];

            mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: track.album || 'kv-music',
                artwork: artworkUrlRef.current,
            });

            syncPlaybackState();
            syncPosition();
        };

        const handleAction = (details: MediaSessionActionDetails) => {
            const state = usePlayerStore.getState();
            switch (details.action) {
                case 'play':
                    if (!state.isPlaying) state.togglePlay();
                    break;
                case 'pause':
                    if (state.isPlaying) state.togglePlay();
                    break;
                case 'previoustrack':
                    state.prevTrack();
                    break;
                case 'nexttrack':
                    state.nextTrack();
                    break;
                case 'stop':
                    if (state.isPlaying) state.togglePlay();
                    break;
                case 'seekto':
                    if (details.seekTime != null) state.seekTo(details.seekTime);
                    break;
                case 'seekbackward':
                    state.seekTo(Math.max(0, state.progress - (details.seekOffset ?? 10)));
                    break;
                case 'seekforward':
                    state.seekTo(Math.min(state.duration || state.progress, state.progress + (details.seekOffset ?? 10)));
                    break;
            }
        };

        const actions: MediaSessionAction[] = [
            'play', 'pause', 'previoustrack', 'nexttrack',
            'stop', 'seekto', 'seekbackward', 'seekforward',
        ];
        actions.forEach(action => {
            try {
                mediaSession.setActionHandler(action, handleAction);
            } catch { }
        });

        const unsubscribe = usePlayerStore.subscribe((state, prev) => {
            if (state.currentTrack?.id !== prev.currentTrack?.id) {
                syncMetadata();
            }
            if (state.isPlaying !== prev.isPlaying || state.isVideoMode !== prev.isVideoMode) {
                syncPlaybackState();
            }
            if (state.progress !== prev.progress) {
                syncPosition();
            }
        });

        syncMetadata();

        return () => {
            unsubscribe();
            if (artworkUrlRef.current) {
                artworkUrlRef.current.forEach(a => {
                    if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src);
                });
            }
            artworkUrlRef.current = null;
            actions.forEach(action => {
                try {
                    mediaSession.setActionHandler(action, null);
                } catch { }
            });
        };
    }, []);
}
