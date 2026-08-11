import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';

export default function MiniPlayer() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const volume = usePlayerStore(s => s.volume);
  const pendingSeek = usePlayerStore(s => s.pendingSeek);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const setProgress = usePlayerStore(s => s.setProgress);
  const setDuration = usePlayerStore(s => s.setDuration);
  const seekTo = usePlayerStore(s => s.seekTo);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamFailCount = useRef(0);

  useEffect(() => {
    if (currentTrack && audioRef.current && currentTrack.url) {
      const hasError = audioRef.current.error !== null;
      const isSameUrl = audioRef.current.src === currentTrack.url ||
        (currentTrack.url.startsWith('/') && audioRef.current.src.endsWith(currentTrack.url)) ||
        (audioRef.current.src.includes(currentTrack.id));

      // Always reload when the element is in an error state - a previously
      // failed source (e.g. unsupported WebM) must be retried even if the URL
      // is unchanged, otherwise playback stays broken until a full reload.
      if (isSameUrl && !hasError) return;

      audioRef.current.src = currentTrack.url;
      audioRef.current.load();
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
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "playing";
    } else {
      audioRef.current.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = "paused";
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
    if ('mediaSession' in navigator && !isNaN(audioRef.current.duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audioRef.current.duration,
          playbackRate: audioRef.current.playbackRate,
          position: audioRef.current.currentTime
        });
      } catch { }
    }
  };

  const handleAudioError = () => {
    if (!currentTrack) return;
    streamFailCount.current += 1;
    if (streamFailCount.current >= 3) return;
    if (!audioRef.current) return;
    const url = currentTrack.url;
    if (!url) return;
    // Auto-retry once by reloading the source (helps after backend format
    // changes or transient failures); a reload clears the stuck error state.
    setTimeout(() => {
      if (audioRef.current && audioRef.current.error !== null && currentTrack.url === url) {
        audioRef.current.src = url;
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
