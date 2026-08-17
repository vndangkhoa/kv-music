import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Heart, Repeat, Share2, MessageCircle, ListPlus, Send, Eye, UserPlus } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from '../components/CoverImage';
import Waveform from '../components/Waveform';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import DownloadMenu from '../components/DownloadMenu';
import { toast } from '../stores/toastStore';
import { formatCount } from '../utils/format';
import { haptic } from '../utils/haptic';
import type { Track } from '../types';

interface TrackComment {
  id: string;
  user: string;
  avatar?: string;
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
    { id: '1', user: 'Alex Rivers', text: 'This beat is incredible! 🔥', timestamp: '1:15', timeAgo: '2 hours ago' },
    { id: '2', user: 'Maya Lin', text: 'On repeat all day long 🎧', timestamp: '2:40', timeAgo: '5 hours ago' },
    { id: '3', user: 'SoundVibes', text: 'Super smooth transition at 3:10', timestamp: '3:10', timeAgo: '1 day ago' },
  ]);
  const [newComment, setNewComment] = useState('');
  const [isReposted, setIsReposted] = useState(false);
  const [openAddToPlaylist, setOpenAddToPlaylist] = useState(false);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);

  const isCurrent = currentTrack?.id === (trackData?.id || id);
  const activeTrack = isCurrent ? currentTrack : trackData;
  const isLiked = activeTrack ? likedTracks.has(activeTrack.id) : false;
  const playedFraction = isCurrent && duration > 0 ? Math.min(1, progress / duration) : 0;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/track/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data: Track) => {
        setTrackData(data);
        setLoading(false);
        const { currentTrack, playTrack } = usePlayerStore.getState();
        if (!currentTrack || currentTrack.id !== data.id) {
          playTrack(data, [data]);
        }
        libraryService.getRelatedContent(data.artist || data.title, 'track', 6)
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
    toast(isLiked ? 'Removed from Likes' : 'Added to Likes');
    haptic(8);
  }, [activeTrack, toggleLike, isLiked]);

  const handleShare = useCallback(async () => {
    if (!activeTrack) return;
    const url = `${window.location.origin}/track/${encodeURIComponent(activeTrack.id)}`;
    if (navigator.share) {
      try { await navigator.share({ title: activeTrack.title, text: `${activeTrack.title} - ${activeTrack.artist}`, url }); } catch { /* noop */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast('Copied track link'); } catch { /* noop */ }
    }
  }, [activeTrack]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const formattedTimestamp = `${Math.floor(progress / 60)}:${Math.floor(progress % 60).toString().padStart(2, '0')}`;
    const commentItem: TrackComment = {
      id: Date.now().toString(),
      user: 'You',
      text: newComment.trim(),
      timestamp: formattedTimestamp,
      timeAgo: 'Just now',
    };
    setComments([commentItem, ...comments]);
    setNewComment('');
    toast('Comment posted');
  };

  const handleSeek = useCallback((ratio: number) => {
    if (isCurrent && duration > 0) {
      seekTo(ratio * duration);
    } else if (activeTrack) {
      playTrack(activeTrack);
    }
  }, [isCurrent, duration, seekTo, activeTrack, playTrack]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[#121212]">
        <div className="w-12 h-12 rounded-full border-2 border-[#ff5500] border-t-transparent animate-spin mb-4" />
        <p className="text-neutral-400 font-medium text-sm">Loading SoundCloud track...</p>
      </div>
    );
  }

  if (error || !activeTrack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[#121212]">
        <p className="text-neutral-400 text-base mb-4">Track not found or unavailable.</p>
        <Link to="/" className="px-5 py-2 bg-[#ff5500] text-white text-xs font-bold rounded-full hover:bg-[#ff7a00] transition">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full text-white bg-[#121212]">
      <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        {/* SoundCloud Single Track Hero Banner Header */}
        <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-[#241a15] via-[#1a1a1a] to-[#121212] border border-white/10 p-4 sm:p-6 md:p-8 flex flex-col justify-between min-h-[260px] md:min-h-[300px] shadow-2xl">
          <div className="flex flex-col-reverse sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 z-10">
            {/* Play Button & Titles */}
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
              <button
                onClick={handlePlay}
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                ) : (
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-0.5 sm:ml-1" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <Link to={`/artist/${encodeURIComponent(activeTrack.artist || '')}`} className="text-xs sm:text-sm md:text-base text-neutral-300 hover:text-white font-semibold transition block truncate">
                  {activeTrack.artist}
                </Link>
                <h1 className="text-lg sm:text-2xl md:text-4xl font-extrabold text-white leading-tight break-words line-clamp-2 sm:line-clamp-none">
                  {activeTrack.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="bg-white/10 text-neutral-300 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    #Music
                  </span>
                  <span className="text-[11px] sm:text-xs text-neutral-400">Uploaded 2 days ago</span>
                </div>
              </div>
            </div>

            {/* Artwork */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-56 md:h-56 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl bg-neutral-900 border border-white/10">
              <CoverImage src={activeTrack.cover_url} alt={activeTrack.title} className="w-full h-full object-cover" fallbackText="♪" />
            </div>
          </div>

          {/* Large Waveform Player */}
          <div className="mt-4 sm:mt-6 z-10">
            <Waveform
              trackId={activeTrack.id}
              played={playedFraction}
              interactive
              onSeek={handleSeek}
              height={60}
              className="w-full"
            />
            <div className="flex justify-between items-center text-xs text-neutral-400 font-mono mt-1">
              <span>
                {isCurrent
                  ? `${Math.floor(progress / 60)}:${Math.floor(progress % 60).toString().padStart(2, '0')}`
                  : '0:00'}
              </span>
              <span>
                {duration
                  ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar & 2-Column Content Area */}
        <div className="flex gap-8">
          {/* Main Left Column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Social Action Bar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition flex-shrink-0 whitespace-nowrap ${
                    isLiked
                      ? 'bg-[#ff5500]/10 border-[#ff5500] text-[#ff5500]'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </button>

                <button
                  onClick={() => { setIsReposted(v => !v); toast(isReposted ? 'Repost removed' : 'Track reposted'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition flex-shrink-0 whitespace-nowrap ${
                    isReposted
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  <span>{isReposted ? 'Reposted' : 'Repost'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-white/5 border border-white/10 text-neutral-300 hover:text-white transition flex-shrink-0 whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => setOpenAddToPlaylist(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-white/5 border border-white/10 text-neutral-300 hover:text-white transition flex-shrink-0 whitespace-nowrap"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add to playlist</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium flex-shrink-0">
                {activeTrack.view_count != null && (
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatCount(activeTrack.view_count)}</span>
                )}
                {activeTrack.like_count != null && (
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{formatCount(activeTrack.like_count)}</span>
                )}
              </div>
            </div>

            {/* SoundCloud Comment Box */}
            <form onSubmit={handleAddComment} className="flex gap-3 bg-[#181818] border border-white/10 p-3 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-[#ff5500] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                SC
              </div>
              <div className="flex-1 relative flex items-center min-w-0">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full bg-[#242424] border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#ff5500]"
                />
                <button type="submit" className="absolute right-2 text-neutral-400 hover:text-[#ff5500] transition">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Comment Stream */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <MessageCircle className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  {comments.length} Comments
                </h3>
              </div>

              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3 bg-[#181818] p-3 rounded-lg border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {c.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs mb-1">
                        <span className="font-bold text-white truncate">{c.user}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">at {c.timestamp} • {c.timeAgo}</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Sidebar */}
          <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
            <SoundCloudSidebar />
          </div>
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
