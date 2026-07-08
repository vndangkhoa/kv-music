import { useRef, useState, useEffect } from 'react';
import { Heart, Mic2, Shuffle, Repeat, SkipBack, SkipForward, Play, Pause, ListMusic, Sparkles, Music } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useDominantColor } from '../../hooks/useDominantColor';
import CoverImage from '../CoverImage';
import VideoPlayer from '../VideoPlayer';
import BottomSheet from '../BottomSheet';
import Lyrics from '../Lyrics';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../../types';

export default function FullPlayer() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isBuffering = usePlayerStore(s => s.isBuffering);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const nextTrack = usePlayerStore(s => s.nextTrack);
  const prevTrack = usePlayerStore(s => s.prevTrack);
  const shuffle = usePlayerStore(s => s.shuffle);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const toggleRepeat = usePlayerStore(s => s.toggleRepeat);
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const isFullScreenOpen = usePlayerStore(s => s.isFullScreenOpen);
  const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
  const seekTo = usePlayerStore(s => s.seekTo);
  const setProgress = usePlayerStore(s => s.setProgress);
  const setVolume = usePlayerStore(s => s.setVolume);
  const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);
  const queue = usePlayerStore(s => s.queue);
  const playTrack = usePlayerStore(s => s.playTrack);

  const navigate = useNavigate();
  const dominantColor = useDominantColor(currentTrack?.cover_url);
  const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
  const [isIdle, setIsIdle] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [activePanel, setActivePanel] = useState<'lyrics' | 'queue' | 'related' | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (playerMode === 'video' && isPlaying) {
      idleTimerRef.current = setTimeout(() => setIsIdle(true), 3000);
    }
  };

  useEffect(() => {
    setPlayerMode('audio');
    setIsIdle(false);
    setIsVideoReady(false);
    setActivePanel(null);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (activePanel !== 'related' || !currentTrack) return;
    setLoadingRelated(true);
    import('../../services/library').then(({ libraryService }) =>
      libraryService.getRelatedContent(currentTrack.artist || currentTrack.title, 'track', 10)
        .then(data => setRelatedTracks(data.tracks || []))
        .catch(() => setRelatedTracks([]))
        .finally(() => setLoadingRelated(false))
    );
  }, [activePanel, currentTrack]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [isPlaying, playerMode]);

  const handleModeSwitch = (mode: 'audio' | 'video') => {
    if (mode === 'video') {
      if (isPlaying) togglePlay();
      setIsVideoReady(false);
      setIsVideoMode(true);
    } else {
      seekTo(progress);
      if (!isPlaying) togglePlay();
      setIsVideoMode(false);
    }
    setPlayerMode(mode);
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentTrack || !isFullScreenOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-[70] flex flex-col transition-transform duration-300 ${isFullScreenOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ background: `linear-gradient(to bottom, ${dominantColor}, #121212)` }}
        onMouseMove={resetIdleTimer}
        onTouchStart={resetIdleTimer}
      >
        {/* Header */}
        <div className={`relative z-[80] flex items-center justify-between p-4 pt-8 shrink-0 transition-opacity duration-700 ${isIdle && playerMode === 'video' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); }}
               className="text-white p-2 hover:bg-white/10 rounded-full transition cursor-pointer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>

          <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10 shadow-xl">
            <button
              onClick={() => handleModeSwitch('audio')}
              className={`px-8 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${playerMode === 'audio' ? 'bg-white text-black shadow-lg scale-105' : 'text-neutral-400 hover:text-white'}`}
            >
              Song
            </button>
            <button
              onClick={() => handleModeSwitch('video')}
              className={`px-8 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${playerMode === 'video' ? 'bg-white text-black shadow-lg scale-105' : 'text-neutral-400 hover:text-white'}`}
            >
              Video
            </button>
          </div>

          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden group">
          {playerMode === 'video' ? (
            <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 pb-48 md:pb-40 animate-in zoom-in-95 duration-500">
              <div className="relative w-full max-w-[480px] md:max-w-[640px] mb-6 md:mb-8">
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-black relative">
                  <VideoPlayer
                    videoId={currentTrack.id}
                    isPlaying={isPlaying}
                    onTimeUpdate={(time) => {
                      if (Math.abs(time - progress) > 2) setProgress(time);
                    }}
                    onPlay={() => { setIsVideoReady(true); if (!isPlaying) togglePlay(); }}
                    onPause={() => { if (isPlaying) togglePlay(); }}
                    onEnded={nextTrack}
                    className="w-full h-full"
                  />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="text-center max-w-full px-4">
                <h2 className="font-black text-white text-lg md:text-3xl mb-1 md:mb-2 drop-shadow-lg tracking-tight line-clamp-1 md:line-clamp-2">{currentTrack.title}</h2>
                <p
                  onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                  className="text-white/80 font-medium text-sm md:text-lg cursor-pointer hover:text-white hover:underline transition drop-shadow-md line-clamp-1"
                >
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 pb-48 md:pb-40 animate-in zoom-in-95 duration-500">
              <div className="relative w-full max-w-[280px] md:max-w-[360px] mb-6 md:mb-8">
                <img
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:scale-[1.03]"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="text-center max-w-full px-4">
                <h2 className="font-black text-white text-lg md:text-3xl mb-1 md:mb-2 drop-shadow-lg tracking-tight line-clamp-1 md:line-clamp-2">{currentTrack.title}</h2>
                <p
                  onClick={() => { setPlayerMode('audio'); setIsFullScreenOpen(false); navigate(`/artist/${encodeURIComponent(currentTrack.artist)}`); }}
                  className="text-white/80 font-medium text-sm md:text-lg cursor-pointer hover:text-white hover:underline transition drop-shadow-md line-clamp-1"
                >
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          )}

          {/* Controls Overlay */}
          <div className={`absolute bottom-0 left-0 right-0 z-20 px-8 pb-12 transition-all duration-700 ${playerMode === 'video' ? 'bg-gradient-to-t from-black via-black/40 to-transparent' : ''} ${isIdle && playerMode === 'video' ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
            {/* Action Row */}
            <div className="flex items-center justify-center gap-4 md:gap-6 text-white mb-8">
              <button onClick={() => toggleLike(currentTrack)} className={`p-2 md:p-3 rounded-full hover:bg-white/10 transition ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-white/60'}`}>
                <Heart size={22} className="md:hidden" fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
                <Heart size={32} className="hidden md:block" fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
              </button>
              <button onClick={() => setActivePanel(activePanel === 'lyrics' ? null : 'lyrics')} className={`p-2 md:p-3 rounded-full hover:bg-white/10 transition ${activePanel === 'lyrics' ? 'text-green-500' : 'text-white/60 hover:text-white'}`}>
                <Mic2 size={22} className="md:hidden" />
                <Mic2 size={30} className="hidden md:block" />
              </button>
              <button onClick={() => setActivePanel(activePanel === 'queue' ? null : 'queue')} className={`p-2 md:p-3 rounded-full hover:bg-white/10 transition ${activePanel === 'queue' ? 'text-green-500' : 'text-white/60 hover:text-white'}`}>
                <ListMusic size={22} className="md:hidden" />
                <ListMusic size={30} className="hidden md:block" />
              </button>
              <button onClick={() => setActivePanel(activePanel === 'related' ? null : 'related')} className={`p-2 md:p-3 rounded-full hover:bg-white/10 transition ${activePanel === 'related' ? 'text-green-500' : 'text-white/60 hover:text-white'}`}>
                <Sparkles size={22} className="md:hidden" />
                <Sparkles size={30} className="hidden md:block" />
              </button>
            </div>

            {/* Progress */}
            <div className="max-w-screen-md mx-auto">
              <div className="mb-8">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={progress}
                  onChange={(e) => setProgress(parseFloat(e.target.value))}
                  onMouseUp={() => seekTo(progress)}
                  onTouchEnd={() => seekTo(progress)}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white mb-2 hover:bg-white/30 transition-colors"
                />
                <div className="flex justify-between text-[10px] md:text-xs text-white/50 font-bold uppercase tracking-widest font-mono">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between w-full">
                <button onClick={toggleShuffle} className={`p-2 transition-all duration-300 ${shuffle ? 'text-green-500 scale-110' : 'text-white/40 hover:text-white'}`}>
                  <Shuffle size={24} />
                </button>
                <button onClick={prevTrack} className="text-white hover:scale-110 active:scale-95 transition">
                  <SkipBack size={42} />
                </button>
                <button onClick={togglePlay} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 active:scale-90 transition shadow-2xl">
                  {isPlaying ? <Pause size={42} /> : <Play size={42} className="ml-1.5" />}
                </button>
                <button onClick={nextTrack} className="text-white hover:scale-110 active:scale-95 transition">
                  <SkipForward size={42} />
                </button>
                <button onClick={toggleRepeat} className={`p-2 transition-all duration-300 ${repeatMode !== 'none' ? 'text-green-500 scale-110' : 'text-white/40 hover:text-white'}`}>
                  <Repeat size={24} />
                </button>
              </div>

              {/* Volume slider — desktop only */}
              <div className="hidden md:flex items-center justify-center mt-6 gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lyrics Bottom Sheet */}
      <BottomSheet
        isOpen={activePanel === 'lyrics'}
        onClose={() => setActivePanel(null)}
        title="Lyrics"
      >
        {currentTrack && (
          <Lyrics
            trackTitle={currentTrack.title}
            artistName={currentTrack.artist || ''}
            currentTime={progress}
            isOpen={true}
            onClose={() => setActivePanel(null)}
            videoId={currentTrack.id}
            variant="panel"
          />
        )}
      </BottomSheet>

      {/* Queue Bottom Sheet */}
      <BottomSheet
        isOpen={activePanel === 'queue'}
        onClose={() => setActivePanel(null)}
        title="Queue"
      >
        {queue.length === 0 ? (
          <div className="text-neutral-600 text-sm text-center py-8">Queue is empty</div>
        ) : (
          <div className="space-y-1 pb-4">
            {queue.map((track, idx) => (
              <div key={`${track.id}-${idx}`}
                onClick={() => playTrack(track, queue)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <CoverImage src={track.cover_url} alt={track.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{track.title}</div>
                  <div className="text-xs text-neutral-500 truncate">{track.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* Related Bottom Sheet */}
      <BottomSheet
        isOpen={activePanel === 'related'}
        onClose={() => setActivePanel(null)}
        title="Related"
      >
        {loadingRelated ? (
          <div className="text-neutral-500 text-sm text-center py-8">Loading...</div>
        ) : relatedTracks.length === 0 ? (
          <div className="text-neutral-600 text-sm text-center py-8">No related tracks found</div>
        ) : (
          <div className="space-y-1 pb-4">
            {relatedTracks.map((track, idx) => (
              <div key={`${track.id}-${idx}`}
                onClick={() => playTrack(track, relatedTracks)}
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <CoverImage src={track.cover_url} alt={track.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{track.title}</div>
                  <div className="text-xs text-neutral-500 truncate">{track.artist}</div>
                </div>
                <Music className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </>
  );
}
