import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { useToastStore } from '../../stores/toastStore';
import useMediaSession from '../../hooks/useMediaSession';

export default function MiniPlayer() {
  useMediaSession();

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const volume = usePlayerStore(s => s.volume);
  const pendingSeek = usePlayerStore(s => s.pendingSeek);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const setProgress = usePlayerStore(s => s.setProgress);
  const setDuration = usePlayerStore(s => s.setDuration);
  const setBuffering = usePlayerStore(s => s.setBuffering);
  const seekTo = usePlayerStore(s => s.seekTo);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamFailCount = useRef(0);
  // Remembers which track the audio element is currently loaded for, so a
  // track change ALWAYS reloads even when two songs resolve to the same URL.
  const loadedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentTrack && audioRef.current && currentTrack.url) {
      const hasError = audioRef.current.error !== null;
      const isSameUrl = audioRef.current.src === currentTrack.url ||
        (currentTrack.url.startsWith('/') && audioRef.current.src.endsWith(currentTrack.url)) ||
        (audioRef.current.src.includes(currentTrack.id));

      // Always reload when the element is in an error state - a previously
      // failed source (e.g. unsupported WebM) must be retried even if the URL
      // is unchanged, otherwise playback stays broken until a full reload.
      if (isSameUrl && !hasError && loadedTrackIdRef.current === currentTrack.id) return;
      loadedTrackIdRef.current = currentTrack.id;

      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
      // A new song always starts from 0:00 — never inherit the previous
      // track's position, and reset the UI progress right away so the
      // progress bar / waveform don't show the old song's timestamp.
      audioRef.current.currentTime = 0;
      setProgress(0);
      setDuration(0);
      streamFailCount.current = 0;
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("Play error:", e);
        });
      }
    }
  }, [currentTrack?.url]);

  useEffect(() => {
    if (!audioRef.current) return;
    const isVideoMode = usePlayerStore.getState().isVideoMode;
    if (isPlaying) {
      if (!isVideoMode) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error("Play error:", e);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && pendingSeek !== null) {
      audioRef.current.currentTime = pendingSeek;
      seekTo(null);
    }
  }, [pendingSeek]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
    if (!isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioError = () => {
    if (!currentTrack) return;
    streamFailCount.current += 1;
    if (streamFailCount.current >= 3) {
      setBuffering(false);
      usePlayerStore.setState({ isPlaying: false, isBuffering: false });
      useToastStore.getState().addToast(
        'Playback failed (YouTube bot check or stream error — check Settings → Cookies).'
      );
      return;
    }
    if (!audioRef.current) return;
    const url = currentTrack.url;
    if (!url) return;
    const retryUrl =
      streamFailCount.current === 2 && !url.includes('fmt=m4a')
        ? `/api/stream/${currentTrack.id}?fmt=m4a`
        : url;
    const trackId = currentTrack.id;
    // Auto-retry by reloading the source (and falling back to ?fmt=m4a on retry 2);
    // a reload clears the stuck error state.
    setTimeout(() => {
      const latestTrack = usePlayerStore.getState().currentTrack;
      if (audioRef.current && audioRef.current.error !== null && latestTrack?.id === trackId) {
        audioRef.current.src = retryUrl;
        audioRef.current.load();
        if (usePlayerStore.getState().isPlaying) {
          audioRef.current.play().catch(e => {
            if (e.name !== 'AbortError') console.error("Play error:", e);
          });
        }
      }
    }, 800);
  };

  return (
    <audio
      ref={audioRef}
      preload="auto"
      onEnded={nextTrack}
      onWaiting={() => usePlayerStore.getState().setBuffering(true)}
      onPlaying={() => usePlayerStore.getState().setBuffering(false)}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleTimeUpdate}
      onError={handleAudioError}
    />
  );
}
