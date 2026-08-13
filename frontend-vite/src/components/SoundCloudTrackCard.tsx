import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Heart, Repeat, Share2, MoreHorizontal, MessageCircle, Eye, ListPlus } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from './CoverImage';
import Waveform from './Waveform';
import AddToPlaylistModal from './AddToPlaylistModal';
import DownloadMenu from './DownloadMenu';
import { toast } from '../stores/toastStore';
import { formatCount } from '../utils/format';
import { haptic } from '../utils/haptic';
import type { Track } from '../types';

interface SoundCloudTrackCardProps {
  track: Track;
  queue?: Track[];
  onPlay?: (track: Track, queue: Track[]) => void;
  repostedBy?: string;
  className?: string;
}

export default function SoundCloudTrackCard({
  track,
  queue,
  onPlay,
  repostedBy,
  className = '',
}: SoundCloudTrackCardProps) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  const playTrack = usePlayerStore(s => s.playTrack);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const seekTo = usePlayerStore(s => s.seekTo);

  const [isReposted, setIsReposted] = useState(false);
  const [openAddToPlaylist, setOpenAddToPlaylist] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTracks.has(track.id);
  const playedFraction = isCurrent && duration > 0 ? Math.min(1, progress / duration) : 0;

  const handlePlayToggle = useCallback(() => {
    if (isCurrent) {
      togglePlay();
    } else {
      const q = queue && queue.length > 0 ? queue : [track];
      if (onPlay) onPlay(track, q);
      else playTrack(track, q);
    }
  }, [isCurrent, togglePlay, queue, track, onPlay, playTrack]);

  const handleLike = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    await toggleLike(track);
    toast(isLiked ? 'Removed from Likes' : 'Added to Likes');
    haptic(8);
  }, [track, toggleLike, isLiked]);

  const handleRepost = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReposted(v => !v);
    toast(isReposted ? 'Repost removed' : 'Track reposted');
    haptic(8);
  }, [isReposted]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/track/${encodeURIComponent(track.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text: `${track.title} - ${track.artist}`, url });
      } catch { /* canceled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard');
      } catch {
        toast('Could not copy link');
      }
    }
  }, [track]);

  const handleSeek = useCallback((ratio: number) => {
    if (isCurrent && duration > 0) {
      seekTo(ratio * duration);
    } else {
      const q = queue && queue.length > 0 ? queue : [track];
      if (onPlay) onPlay(track, q);
      else playTrack(track, q);
    }
  }, [isCurrent, duration, seekTo, queue, track, onPlay, playTrack]);

  return (
    <article className={`bg-[#181818] border border-white/5 rounded-lg p-3 md:p-4 hover:border-white/10 transition-colors ${className}`}>
      {/* Repost Header if applicable */}
      {repostedBy && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2 font-medium">
          <Repeat className="w-3.5 h-3.5 text-neutral-400" />
          <span><strong className="text-neutral-200">{repostedBy}</strong> reposted</span>
        </div>
      )}

      <div className="flex gap-3 md:gap-4">
        {/* Cover Artwork with SoundCloud Play Overlay Button */}
        <div className="relative group/art w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 flex-shrink-0 bg-neutral-900 rounded overflow-hidden">
          <CoverImage
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/art:scale-105"
            fallbackText="♪"
          />
          <button
            onClick={handlePlayToggle}
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover/art:opacity-100'
            }`}
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
          >
            <div className="w-12 h-12 rounded-full bg-[#ff5500] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform">
              {isCurrent && isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </div>
          </button>
        </div>

        {/* Track Main Info & Waveform */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Top row: Artist avatar/name & Title & Tag */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 font-medium truncate hover:text-white transition-colors">
                  {track.artist}
                </p>
                <Link
                  to={`/track/${encodeURIComponent(track.id)}`}
                  className="text-sm md:text-base font-bold text-white hover:text-[#ff5500] truncate block transition-colors leading-tight"
                >
                  {track.title}
                </Link>
              </div>

              {/* Genre / Tag badge */}
              <span className="hidden sm:inline-block text-[11px] font-semibold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-full flex-shrink-0">
                #Music
              </span>
            </div>

            {/* Interactive SoundCloud Waveform */}
            <div className="mt-2 relative w-full max-w-full overflow-hidden">
              <Waveform
                trackId={track.id}
                played={playedFraction}
                interactive
                onSeek={handleSeek}
                height={50}
                className="w-full"
              />
              <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mt-1">
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

          {/* Action Bar & Stats Footer */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-2">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
                  isLiked
                    ? 'bg-[#ff5500]/10 border-[#ff5500] text-[#ff5500]'
                    : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:border-white/20'
                }`}
              >
                <Heart className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{isLiked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={handleRepost}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
                  isReposted
                    ? 'bg-green-500/10 border-green-500 text-green-400'
                    : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:border-white/20'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isReposted ? 'Reposted' : 'Repost'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                onClick={() => setOpenAddToPlaylist(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Add to playlist</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="p-1 rounded bg-white/5 border border-white/10 text-neutral-400 hover:text-white transition"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute left-0 bottom-full mb-1 w-44 bg-[#222222] border border-white/10 rounded-xl shadow-2xl py-1 z-30">
                    <button
                      onClick={() => { setShowMenu(false); setOpenAddToPlaylist(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition text-left"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Add to playlist</span>
                    </button>
                    <DownloadMenu
                      tracks={[track]}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-white/5 transition text-left"
                      iconClassName="w-3.5 h-3.5 text-neutral-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Stats */}
            <div className="flex items-center gap-2.5 text-[11px] text-neutral-500 font-medium">
              {track.view_count != null && (
                <span className="flex items-center gap-1" title="Plays">
                  <Eye className="w-3 h-3 text-neutral-500" />
                  {formatCount(track.view_count)}
                </span>
              )}
              {track.like_count != null && (
                <span className="flex items-center gap-1" title="Likes">
                  <Heart className="w-3 h-3 text-neutral-500" />
                  {formatCount(track.like_count)}
                </span>
              )}
              {track.comment_count != null && track.comment_count > 0 && (
                <span className="hidden sm:flex items-center gap-1" title="Comments">
                  <MessageCircle className="w-3 h-3 text-neutral-500" />
                  {formatCount(track.comment_count)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {openAddToPlaylist && (
        <AddToPlaylistModal track={track} isOpen onClose={() => setOpenAddToPlaylist(false)} />
      )}
    </article>
  );
}
