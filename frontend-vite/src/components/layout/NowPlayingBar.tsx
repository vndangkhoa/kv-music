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
      <aside className="hidden lg:flex w-[340px] xl:w-[380px] h-full bg-[#0f1938] border-l border-cyan-500/15 flex-col flex-shrink-0 select-none overflow-hidden">
        <div className="p-4 border-b border-cyan-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">GỢI Ý PHÁT NHẠC</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            AUTO
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#142044] to-[#1c2c5b] border border-cyan-500/20 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00a8ff] to-[#00d2d3] mx-auto mb-3 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
            <h4 className="text-sm font-extrabold text-white">Bắt Đầu Trải Nghiệm</h4>
            <p className="text-xs text-neutral-400 mt-1">Chọn bất kỳ bài hát nào để thưởng thức âm nhạc chất lượng cao trên kv-music.</p>
          </div>

          <IdleTrendingWidget onPlayTrack={(track, list) => playTrack(track, list)} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-[340px] xl:w-[380px] h-full bg-[#0f1938] border-l border-cyan-500/10 flex-col flex-shrink-0 select-none">
      {/* Player Section */}
      <div className="p-4 border-b border-cyan-500/10">
        {showVideo ? (
          <div className="mb-4 rounded-xl overflow-hidden shadow-lg border border-cyan-500/20">
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
          <div className="relative mb-4 group">
            <CoverImage src={currentTrack.cover_url} alt={currentTrack.title} className="w-44 h-44 mx-auto rounded-2xl object-cover shadow-2xl border-2 border-cyan-500/20 group-hover:scale-105 transition duration-300" />
            <div className="absolute top-2 right-6 px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-[10px] shadow uppercase tracking-wider">
              Lossless 320k
            </div>
          </div>
        )}
        <div className="mb-2 text-center">
          <h3 className="font-extrabold text-white text-base truncate">{currentTrack.title}</h3>
          <p className="text-xs font-medium text-cyan-400/80 truncate mt-0.5">{currentTrack.artist}</p>
        </div>

        <ProgressBar
          progress={progress}
          duration={duration}
          onSeek={(time) => { seekTo(time); }}
          className="w-full h-1.5 mb-2"
          barClassName="bg-gradient-to-r from-[#00a8ff] to-[#00d2d3]"
        />
        <div className="flex justify-between text-[10px] text-cyan-300/70 font-mono mb-3">
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
        <div className="flex items-center gap-2 mt-3 px-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
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
            className="flex-1 h-1 bg-cyan-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleToggleVideo}
            className={`p-2 rounded-xl transition border border-cyan-500/10 ${showVideo ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white hover:bg-cyan-500/10'}`}
            title="Video"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-xl transition border border-cyan-500/10 ${isLyricsOpen ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white hover:bg-cyan-500/10'}`}
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => usePlayerStore.getState().toggleRightPanel('queue')}
            className={`p-2 rounded-xl transition border border-cyan-500/10 ${isRightPanelOpen && rightPanelTab === 'queue' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white hover:bg-cyan-500/10'}`}
            title="Danh sách phát"
          >
            <ListMusic className="w-4 h-4" />
          </button>
          <button
            onClick={() => usePlayerStore.getState().toggleRightPanel('related')}
            className={`p-2 rounded-xl transition border border-cyan-500/10 ${isRightPanelOpen && rightPanelTab === 'related' ? 'bg-cyan-500/20 text-cyan-400' : 'text-neutral-400 hover:text-white hover:bg-cyan-500/10'}`}
            title="Gợi ý"
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

function IdleTrendingWidget({ onPlayTrack }: { onPlayTrack: (track: Track, list: Track[]) => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [reason, setReason] = useState<string>('BÀI HÁT HOT NỔI BẬT');
  const [loading, setLoading] = useState(true);
  const playHistory = usePlayerStore(s => s.playHistory);
  const likedTracksData = usePlayerStore(s => s.likedTracksData);

  useEffect(() => {
    libraryService.getSmartSuggestions(playHistory, likedTracksData)
      .then(res => {
        if (res && res.tracks.length > 0) {
          setTracks(res.tracks.slice(0, 20));
          if (res.reason) setReason(res.reason);
        }
        setLoading(false);
      })
      .catch(() => {
        libraryService.getCharts('trending').then(res => {
          if (res) setTracks(res.slice(0, 20));
          setLoading(false);
        });
      });
  }, [playHistory.length, likedTracksData.length]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-12 bg-cyan-500/10 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider truncate max-w-[210px]" title={reason}>
          {reason}
        </h5>
        <span className="text-[10px] text-cyan-300/70 font-semibold flex-shrink-0">{tracks.length} bài</span>
      </div>
      <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
        {tracks.map((track, idx) => (
          <div
            key={track.id || idx}
            onClick={() => onPlayTrack(track, tracks)}
            className="flex items-center gap-3 p-2 rounded-xl bg-[#142044]/80 hover:bg-[#1c2c5b] border border-cyan-500/10 cursor-pointer group transition hover:scale-[1.01]"
          >
            <div className="w-6 text-center font-extrabold text-xs text-cyan-400/80 flex-shrink-0">
              {idx + 1}
            </div>
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
              <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h6 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition">{track.title}</h6>
              <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}