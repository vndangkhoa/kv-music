import { useState, useEffect, useMemo } from 'react';
import { Heart, Mic2, Shuffle, Repeat, SkipBack, SkipForward, Play, Pause, ListMusic, Sparkles, Music } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useLyrics } from '../../hooks/useLyrics';
import CoverImage from '../CoverImage';
import VideoPlayer from '../VideoPlayer';
import BottomSheet from '../BottomSheet';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../../types';

function formatTime(t: number) {
  if (isNaN(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FullPlayer() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
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
  const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);
  const queue = usePlayerStore(s => s.queue);
  const playTrack = usePlayerStore(s => s.playTrack);

  const navigate = useNavigate();
  const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
  const [activePanel, setActivePanel] = useState<'lyrics' | 'queue' | 'related' | null>(null);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const {
    lyrics,
    syncedLines,
    activeIndex
  } = useLyrics(
    currentTrack?.title || '',
    currentTrack?.artist || '',
    progress,
    true,
    currentTrack?.id
  );

  const currentLyricLine = activeIndex >= 0 ? syncedLines[activeIndex]?.text : '';
  const nextLyricLine = activeIndex >= 0 && activeIndex + 1 < syncedLines.length
    ? syncedLines[activeIndex + 1]?.text : '';

  const plainLyricLines = useMemo(() => {
    if (lyrics) return lyrics.split('\n').filter(l => l.trim());
    return [];
  }, [lyrics]);

  const currentPlainLine = plainLyricLines.length > 0
    ? plainLyricLines[Math.floor((progress / (duration || 1)) * plainLyricLines.length) % plainLyricLines.length]
    : '';

  const displayLine1 = syncedLines.length > 0 ? currentLyricLine : currentPlainLine;
  const displayLine2 = syncedLines.length > 0 ? nextLyricLine : '';

  useEffect(() => {
    setPlayerMode('audio');
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

  const handleModeSwitch = (mode: 'audio' | 'video') => {
    if (mode === 'video') {
      if (isPlaying) togglePlay();
      setIsVideoMode(true);
    } else {
      seekTo(progress);
      if (!isPlaying) togglePlay();
      setIsVideoMode(false);
    }
    setPlayerMode(mode);
  };

  if (!currentTrack || !isFullScreenOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex flex-col">
        {/* Blurred background */}
        <div className="absolute inset-0 overflow-hidden bg-black">
          <img
            key={currentTrack.cover_url}
            src={currentTrack.cover_url}
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] object-cover blur-3xl opacity-60"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
            <button
              onClick={() => setIsFullScreenOpen(false)}
              className="text-white/60 hover:text-white transition p-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
              <button
                onClick={() => handleModeSwitch('audio')}
                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${playerMode === 'audio' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
              >
                Song
              </button>
              <button
                onClick={() => handleModeSwitch('video')}
                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${playerMode === 'video' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
              >
                Video
              </button>
            </div>
            <div className="w-10" />
          </div>

          {/* Title & Artist */}
          <div className="px-8 pt-2 pb-1 shrink-0 text-center">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-black text-white leading-tight truncate drop-shadow-lg">
                {currentTrack.title}
              </h2>
              {currentTrack.bitrate && (
                <span className="shrink-0 px-2 py-0.5 bg-white/15 rounded text-[10px] font-bold text-white/70">
                  {currentTrack.bitrate}kbps
                </span>
              )}
            </div>
            <p className="text-sm text-white/50 font-medium mt-1 truncate">{currentTrack.artist}</p>
          </div>

          {/* Lyrics */}
          <div className="px-8 py-3 min-h-[64px] flex flex-col justify-center shrink-0">
            {displayLine1 ? (
              <>
                <p className="text-lg font-bold text-white leading-tight line-clamp-1 drop-shadow-lg">
                  {displayLine1}
                </p>
                {displayLine2 && (
                  <p className="text-sm text-white/40 leading-tight line-clamp-1 mt-1 drop-shadow-lg">
                    {displayLine2}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-white/30 text-center">No lyrics available</p>
            )}
          </div>

          {/* Cover */}
          <div className="flex-1 flex items-center justify-center px-8 py-2 min-h-0">
            {playerMode === 'video' ? (
              <div className="w-full max-w-[400px]">
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-black relative">
                  <VideoPlayer
                    videoId={currentTrack.id}
                    isPlaying={isPlaying}
                    onTimeUpdate={(time) => { if (Math.abs(time - progress) > 2) setProgress(time); }}
                    onPlay={() => { if (!isPlaying) togglePlay(); }}
                    onPause={() => { if (isPlaying) togglePlay(); }}
                    onEnded={nextTrack}
                    className="w-full h-full"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[360px]">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={currentTrack.cover_url}
                    alt={currentTrack.title}
                    className="w-full aspect-square object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-6 py-2 shrink-0">
            <button onClick={() => toggleLike(currentTrack)} className={`p-2 rounded-full hover:bg-white/10 transition ${likedTracks.has(currentTrack.id) ? 'text-green-500' : 'text-white/50'}`}>
              <Heart size={22} fill={likedTracks.has(currentTrack.id) ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setActivePanel(activePanel === 'lyrics' ? null : 'lyrics')} className={`p-2 rounded-full hover:bg-white/10 transition ${activePanel === 'lyrics' ? 'text-green-500' : 'text-white/50'}`}>
              <Mic2 size={22} />
            </button>
            <button onClick={() => setActivePanel(activePanel === 'queue' ? null : 'queue')} className={`p-2 rounded-full hover:bg-white/10 transition ${activePanel === 'queue' ? 'text-green-500' : 'text-white/50'}`}>
              <ListMusic size={22} />
            </button>
            <button onClick={() => setActivePanel(activePanel === 'related' ? null : 'related')} className={`p-2 rounded-full hover:bg-white/10 transition ${activePanel === 'related' ? 'text-green-500' : 'text-white/50'}`}>
              <Sparkles size={22} />
            </button>
          </div>

          {/* Progress */}
          <div className="px-8 py-1 shrink-0">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={(e) => setProgress(parseFloat(e.target.value))}
              onMouseUp={() => seekTo(progress)}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
              style={{
                background: `linear-gradient(to right, white ${duration > 0 ? (progress / duration) * 100 : 0}%, rgba(255,255,255,0.2) ${duration > 0 ? (progress / duration) * 100 : 0}%)`
              }}
            />
            <div className="flex justify-between text-[10px] text-white/40 font-mono mt-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-6 py-3 shrink-0">
            <button onClick={toggleShuffle} className={`p-2 transition ${shuffle ? 'text-green-500' : 'text-white/40 hover:text-white'}`}>
              <Shuffle size={20} />
            </button>
            <button onClick={prevTrack} className="text-white hover:scale-110 transition">
              <SkipBack size={28} />
            </button>
            <button onClick={togglePlay} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition shadow-lg">
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-white hover:scale-110 transition">
              <SkipForward size={28} />
            </button>
            <button onClick={toggleRepeat} className={`p-2 transition ${repeatMode !== 'none' ? 'text-green-500' : 'text-white/40 hover:text-white'}`}>
              <Repeat size={20} />
            </button>
          </div>

          <div className="h-8 shrink-0" />
        </div>
      </div>

      {/* Bottom Sheets */}
      <BottomSheet isOpen={activePanel === 'queue'} onClose={() => setActivePanel(null)} title="Queue">
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

      <BottomSheet isOpen={activePanel === 'related'} onClose={() => setActivePanel(null)} title="Related">
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
