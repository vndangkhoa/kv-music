import { useEffect, useState } from 'react';
import { X, Play, Pause, Sparkles, Disc, User, Mic2, ListMusic, Video } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';
import { libraryService } from '../../services/library';
import { Track } from '../../types';
import CoverImage from '../CoverImage';
import PlayerControls from '../player/PlayerControls';
import ProgressBar from '../player/ProgressBar';
import VideoPlayer from '../VideoPlayer';
import Lyrics from '../Lyrics';
import { Link } from 'react-router-dom';

export default function NowPlayingBar() {
  const isNowPlayingOpen = useUIStore(s => s.isNowPlayingOpen);
  const toggleNowPlaying = useUIStore(s => s.toggleNowPlaying);
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
  const queue = usePlayerStore(s => s.queue);
  const playTrack = usePlayerStore(s => s.playTrack);
  const isRightPanelOpen = usePlayerStore(s => s.isRightPanelOpen);
  const rightPanelTab = usePlayerStore(s => s.rightPanelTab);
  const setRightPanelTab = usePlayerStore(s => s.setRightPanelTab);
  const closeRightPanel = usePlayerStore(s => s.closeRightPanel);
  const toggleLyrics = usePlayerStore(s => s.toggleLyrics);
  const isLyricsOpen = usePlayerStore(s => s.isLyricsOpen);
  const closeLyrics = usePlayerStore(s => s.closeLyrics);
  const seekTo = usePlayerStore(s => s.seekTo);
  const setVolume = usePlayerStore(s => s.setVolume);
  const setIsVideoMode = usePlayerStore(s => s.setIsVideoMode);

  const [related, setRelated] = useState<{ tracks: Track[]; albums: any[]; artists: any[] }>({ tracks: [], albums: [], artists: [] });
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!currentTrack || !isRightPanelOpen || rightPanelTab !== 'related') return;
    const fetchRelated = async () => {
      setLoadingRelated(true);
      try {
        const data = await libraryService.getRelatedContent(currentTrack.artist || currentTrack.title, 'track', 10);
        setRelated({ tracks: data.tracks || [], albums: data.albums || [], artists: data.artists || [] });
      } catch (e) {
        console.error("Failed to load related content", e);
      } finally {
        setLoadingRelated(false);
      }
    };
    fetchRelated();
  }, [currentTrack, isRightPanelOpen, rightPanelTab]);

  const handleToggleVideo = () => {
    if (!showVideo) {
      if (isPlaying) togglePlay();
      setIsVideoMode(true);
    } else {
      seekTo(progress);
      if (!isPlaying) togglePlay();
      setIsVideoMode(false);
    }
    setShowVideo(!showVideo);
  };

  if (!isNowPlayingOpen) return null;
  if (!currentTrack) {
    return (
      <aside className="hidden lg:flex w-[340px] xl:w-[380px] h-full bg-[#121212] border-l border-white/[0.06] flex-col flex-shrink-0 items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center">
            <ListMusic className="w-10 h-10 text-neutral-600" />
          </div>
          <p className="text-neutral-500 text-sm font-medium">Select a song to play</p>
          <p className="text-neutral-600 text-xs mt-1">Pick something from your library</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-[340px] xl:w-[380px] h-full bg-[#121212] border-l border-white/[0.06] flex-col flex-shrink-0 select-none">
      {/* Player Section */}
      <div className="p-4 border-b border-white/[0.06]">
        {showVideo ? (
          <div className="mb-4 rounded-xl overflow-hidden">
            <VideoPlayer
              videoId={currentTrack.id}
              isPlaying={isPlaying}
              onTimeUpdate={(time) => {
                if (Math.abs(time - progress) > 2) usePlayerStore.getState().setProgress(time);
              }}
              onPlay={() => { if (!isPlaying) togglePlay(); }}
              onPause={() => { if (isPlaying) togglePlay(); }}
              onEnded={nextTrack}
              className="w-full aspect-video"
            />
          </div>
        ) : (
          <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-40 h-40 mx-auto rounded-xl object-cover shadow-lg mb-4" />
        )}
        <div className="mb-1">
          <h3 className="font-bold text-white text-base truncate">{currentTrack.title}</h3>
          <p className="text-sm text-neutral-400 truncate">{currentTrack.artist}</p>
        </div>

        <ProgressBar
          progress={progress}
          duration={duration}
          onSeek={(time) => { seekTo(time); }}
          className="w-full h-1.5 mb-2"
          barClassName="bg-white/10"
        />
        <div className="flex justify-between text-[10px] text-neutral-500 font-mono mb-3">
          <span>{Math.floor(progress / 60)}:{Math.floor(progress % 60).toString().padStart(2, '0')}</span>
          <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
        </div>

        <PlayerControls
          isPlaying={isPlaying}
          isBuffering={isBuffering}
          shuffle={shuffle}
          repeatMode={repeatMode}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrev={prevTrack}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          size="sm"
          className="justify-center"
        />

        {/* Volume */}
        <div className="flex items-center gap-2 mt-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
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
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={handleToggleVideo}
            className={`p-2 rounded-full hover:bg-white/5 transition ${showVideo ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
            title="Video"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-full hover:bg-white/5 transition ${isLyricsOpen ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => usePlayerStore.getState().toggleRightPanel('queue')}
            className={`p-2 rounded-full hover:bg-white/5 transition ${isRightPanelOpen && rightPanelTab === 'queue' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
          <button
            onClick={() => usePlayerStore.getState().toggleRightPanel('related')}
            className={`p-2 rounded-full hover:bg-white/5 transition ${isRightPanelOpen && rightPanelTab === 'related' ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
            title="Related"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lyrics Panel (slides in below player) */}
      {isLyricsOpen && (
        <div className="flex-1 flex flex-col overflow-hidden border-b border-white/[0.06] animate-in slide-in-from-right">
          <Lyrics
            trackTitle={currentTrack.title}
            artistName={currentTrack.artist || ''}
            currentTime={progress}
            isOpen={true}
            onClose={closeLyrics}
            videoId={currentTrack.id}
            variant="panel"
          />
        </div>
      )}

      {/* Queue / Related Panel */}
      {isRightPanelOpen && !isLyricsOpen && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center border-b border-white/[0.06] px-1">
            <div className="flex flex-1">
              {([
                { key: 'queue' as const, label: 'Queue' },
                { key: 'related' as const, label: 'Related' },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRightPanelTab(key)}
                  className={`flex-1 py-3 text-[13px] font-semibold transition border-b-2 ${
                    rightPanelTab === key ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={closeRightPanel} className="p-1.5 mr-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
            {rightPanelTab === 'queue' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Now Playing</div>
                  <div className="flex items-center gap-3 p-2.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                    <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-11 h-11 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{currentTrack.title}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{currentTrack.artist}</div>
                    </div>
                    <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition">
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1">Next Up</div>
                  {queue.length === 0 ? (
                    <div className="text-neutral-600 text-[13px] px-1 py-6 text-center">Queue is empty</div>
                  ) : (
                    <div className="space-y-0.5">
                      {queue.map((track, idx) => {
                        const isCurrent = track.id === currentTrack.id;
                        return (
                          <div
                            key={`${track.id}-${idx}`}
                            onClick={() => playTrack(track, queue)}
                            className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition ${isCurrent ? 'bg-white/[0.06]' : ''}`}
                          >
                            <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded-md object-cover" />
                            <div className="flex-1 min-w-0">
                              <div className={`text-[13px] font-medium truncate ${isCurrent ? 'text-white' : 'text-neutral-300'}`}>{track.title}</div>
                              <div className="text-[11px] text-neutral-500 truncate">{track.artist}</div>
                            </div>
                            <div className="text-[11px] text-neutral-600 w-10 text-right">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {rightPanelTab === 'related' && (
              <div className="space-y-5">
                {loadingRelated ? (
                  <div className="space-y-3 py-6 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-2 py-2">
                        <div className="w-9 h-9 bg-white/[0.06] rounded-md" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-white/[0.06] rounded w-3/4" />
                          <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {related.tracks.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-purple-400" /> Similar Songs
                        </div>
                        <div className="space-y-0.5">
                          {related.tracks.slice(0, 6).map((track) => (
                            <div
                              key={track.id}
                              onClick={() => playTrack(track, related.tracks)}
                              className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition group"
                            >
                              <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded-md object-cover" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-neutral-300 truncate group-hover:text-white transition">{track.title}</div>
                                <div className="text-[11px] text-neutral-500 truncate">{track.artist}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {related.albums.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                          <Disc className="w-3 h-3 text-blue-400" /> Albums
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {related.albums.slice(0, 4).map((album) => (
                            <Link to={`/album/${album.id}`} key={album.id} onClick={closeRightPanel} className="group">
                              <CoverImage src={album.cover_url} alt={album.title} className="w-full aspect-square rounded-lg object-cover group-hover:scale-[1.02] transition" />
                              <div className="text-[12px] font-medium text-neutral-300 truncate mt-1.5 group-hover:text-white transition">{album.title}</div>
                              <div className="text-[10px] text-neutral-500 truncate">{album.artist}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {related.artists.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-green-400" /> Artists
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {related.artists.slice(0, 6).map((artist) => (
                            <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.id} onClick={closeRightPanel} className="flex flex-col items-center text-center group">
                              <CoverImage src={artist.photo_url} alt={artist.name} className="w-16 h-16 rounded-full object-cover group-hover:scale-105 transition shadow-lg" />
                              <div className="text-[11px] font-medium text-neutral-300 truncate mt-2 w-full group-hover:text-white transition">{artist.name}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}