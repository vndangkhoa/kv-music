import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, ThumbsUp, Share2, MessageSquare, ListPlus, Send, Eye } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from '../components/CoverImage';
import TrackRow, { formatDuration } from '../components/TrackRow';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import DownloadMenu from '../components/DownloadMenu';
import { toast } from '../stores/toastStore';
import { formatCount } from '../utils/format';
import { haptic } from '../utils/haptic';
import type { Track } from '../types';

interface TrackComment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  timeAgo: string;
}

export default function Track() {
  const { id } = useParams();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const seekTo = usePlayerStore(s => s.seekTo);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const likedTracks = usePlayerStore(s => s.likedTracks);

  const [trackData, setTrackData] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [comments, setComments] = useState<TrackComment[]>([
    { id: '1', user: 'Alex Rivers', text: 'This arrangement is incredible.', timestamp: '1:15', timeAgo: '2 hours ago' },
    { id: '2', user: 'Maya Lin', text: 'On repeat all day long.', timestamp: '2:40', timeAgo: '5 hours ago' },
  ]);
  const [newComment, setNewComment] = useState('');
  const [openAddToPlaylist, setOpenAddToPlaylist] = useState(false);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const isCurrent = currentTrack?.id === (trackData?.id || id);
  const activeTrack = isCurrent ? currentTrack : trackData;
  const isLiked = activeTrack ? likedTracks.has(activeTrack.id) : false;
  const playedFraction = isCurrent && duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/track/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data: Track) => {
        setTrackData(data);
        setLoading(false);
        const { currentTrack: playingNow, playTrack: startPlay } = usePlayerStore.getState();
        if (!playingNow || playingNow.id !== data.id) {
          startPlay(data, [data]);
        }
        libraryService
          .getRelatedContent(data.artist || data.title, 'track', 10)
          .then(res => setRelatedTracks(res.tracks || []))
          .catch(() => {});
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  const handlePlay = useCallback(() => {
    if (!activeTrack) return;
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(activeTrack, relatedTracks.length > 0 ? relatedTracks : [activeTrack]);
    }
  }, [activeTrack, isCurrent, togglePlay, playTrack, relatedTracks]);

  const handleLike = useCallback(async () => {
    if (!activeTrack) return;
    await toggleLike(activeTrack);
    toast(isLiked ? 'Removed from Liked music' : 'Saved to Liked music');
    haptic(8);
  }, [activeTrack, toggleLike, isLiked]);

  const handleShare = useCallback(async () => {
    if (!activeTrack) return;
    const url = shareTrackUrl(activeTrack.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: activeTrack.title, text: `${activeTrack.title} - ${activeTrack.artist}`, url });
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast('Copied track link');
      } catch {
        /* ignore */
      }
    }
  }, [activeTrack]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const formattedTimestamp = `${Math.floor(progress / 60)}:${Math.floor(progress % 60).toString().padStart(2, '0')}`;
    setComments(prev => [
      {
        id: Date.now().toString(),
        user: 'You',
        text: newComment.trim(),
        timestamp: formattedTimestamp,
        timeAgo: 'Just now',
      },
      ...prev,
    ]);
    setNewComment('');
    toast('Comment posted');
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrent || duration <= 0 || !scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="w-10 h-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !activeTrack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <p className="text-base text-white/70">Track not found or unavailable.</p>
        <Link
          to="/"
          className="h-9 px-5 rounded-full bg-white text-[#030303] text-sm font-medium inline-flex items-center hover:bg-white/90 transition"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent text-white relative">
      {/* Ambient Blurred Backdrop */}
      {activeTrack.cover_url && (
        <div className="absolute inset-x-0 top-0 h-[49vh] min-h-[340px] overflow-hidden pointer-events-none select-none">
          <img
            src={activeTrack.cover_url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-[80px] scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#030303]/75 to-[#030303]" />
        </div>
      )}

      <div className="relative z-10 max-w-[1478px] mx-auto px-4 md:px-10 py-8 md:py-12 pb-28 space-y-12">
        {/* Watch / Track Hero Split */}
        <section className="flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-[8px] overflow-hidden shadow-2xl bg-[#181818] flex-shrink-0">
            <CoverImage
              src={activeTrack.cover_url}
              alt={activeTrack.title}
              className="w-full h-full object-cover"
              fallbackText="♪"
            />
          </div>

          <div className="flex-1 min-w-0 w-full space-y-4 text-center md:text-left">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70 mb-1">Song</p>
              <h1
                className="text-[26px] sm:text-[32px] md:text-[38px] font-bold text-white leading-[1.15] break-words"
                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
              >
                {activeTrack.title}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm text-white/70 mt-2">
                <Link
                  to={`/artist/${encodeURIComponent(activeTrack.artist || '')}`}
                  className="text-white hover:underline font-medium"
                >
                  {activeTrack.artist}
                </Link>
                {activeTrack.album && (
                  <>
                    <span>•</span>
                    <span>{activeTrack.album}</span>
                  </>
                )}
                {activeTrack.view_count != null && activeTrack.view_count > 0 && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {formatCount(activeTrack.view_count)} plays
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* YTM Scrubber Bar */}
            <div className="space-y-1.5 max-w-2xl mx-auto md:mx-0">
              <div
                ref={scrubberRef}
                role="slider"
                aria-label="Track progress"
                aria-valuemin={0}
                aria-valuemax={duration || 100}
                aria-valuenow={isCurrent ? Math.round(progress) : 0}
                tabIndex={0}
                onClick={handleScrubberClick}
                className="relative h-4 flex items-center cursor-pointer group"
              >
                <div className="w-full h-[3px] group-hover:h-[5px] bg-white/15 rounded-full overflow-hidden transition-all">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${playedFraction * 100}%`,
                      background: 'linear-gradient(to right, #FF0033 80%, #FF2791 100%)',
                    }}
                  />
                </div>
                {isCurrent && (
                  <div
                    className="absolute w-3 h-3 rounded-full bg-[#FF0033] shadow opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 pointer-events-none"
                    style={{ left: `${playedFraction * 100}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-white/60 tabular-nums">
                <span>{isCurrent ? formatDuration(progress) || '0:00' : '0:00'}</span>
                <span>{formatDuration(isCurrent && duration > 0 ? duration : activeTrack.duration) || '--:--'}</span>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={handlePlay}
                className="h-10 px-6 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] text-sm font-medium inline-flex items-center gap-2 transition active:scale-95"
              >
                {isCurrent && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleLike}
                className={`h-10 px-4 rounded-full border text-sm font-medium inline-flex items-center gap-2 transition ${
                  isLiked
                    ? 'bg-white text-[#030303] border-white'
                    : 'border-white/20 text-white hover:bg-white/10'
                }`}
              >
                <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                type="button"
                onClick={() => setOpenAddToPlaylist(true)}
                className="h-10 px-4 rounded-full border border-white/20 text-white hover:bg-white/10 text-sm font-medium inline-flex items-center gap-2 transition"
              >
                <ListPlus className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="h-10 px-4 rounded-full border border-white/20 text-white hover:bg-white/10 text-sm font-medium inline-flex items-center gap-2 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <DownloadMenu
                tracks={[activeTrack]}
                label="Download"
                className="h-10 px-4 rounded-full border border-white/20 text-white hover:bg-white/10 text-sm font-medium transition"
                iconClassName="w-4 h-4"
              />
            </div>
          </div>
        </section>

        {/* Bottom 2-Column Content: Related Tracks & Comments */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7 space-y-4">
            <h2
              className="text-[20px] md:text-[24px] font-bold text-white"
              style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
            >
              Up next & related
            </h2>
            {relatedTracks.length > 0 ? (
              <div className="space-y-0.5">
                {relatedTracks.map((t, idx) => (
                  <TrackRow key={`rel-${t.id}-${idx}`} track={t} queue={relatedTracks} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">Playing solo track.</p>
            )}
          </section>

          <section className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-white/80" />
              <h2
                className="text-[20px] md:text-[24px] font-bold text-white"
                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
              >
                Comments ({comments.length})
              </h2>
            </div>

            <div className="bg-[#181818] border border-white/10 rounded-[12px] p-4 space-y-4">
              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 h-10 px-3.5 rounded-[8px] bg-[#212121] border border-white/10 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  aria-label="Post comment"
                  className="w-10 h-10 rounded-full bg-white text-[#030303] hover:bg-white/90 flex items-center justify-center transition flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3 p-3 rounded-[8px] bg-[#212121]/70">
                    <div className="w-8 h-8 rounded-full bg-white/15 text-white font-medium flex items-center justify-center text-xs flex-shrink-0">
                      {c.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-medium text-white truncate">{c.user}</span>
                        <span className="text-[11px] text-white/50 tabular-nums">
                          {c.timestamp} • {c.timeAgo}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {openAddToPlaylist && (
        <AddToPlaylistModal track={activeTrack} isOpen onClose={() => setOpenAddToPlaylist(false)} />
      )}
    </div>
  );
}

export function shareTrackUrl(id: string): string {
  return `${window.location.origin}/track/${encodeURIComponent(id)}`;
}
