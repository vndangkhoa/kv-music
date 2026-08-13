import { useState, useCallback } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Play, Pause, Heart, MoreHorizontal, Share2, ListPlus, MessageCircle, Eye } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from './CoverImage';
import Waveform from './Waveform';
import BottomSheet from './BottomSheet';
import AddToPlaylistModal from './AddToPlaylistModal';
import DownloadMenu from './DownloadMenu';
import { toast } from '../stores/toastStore';
import { formatCount } from '../utils/format';
import { haptic } from '../utils/haptic';
import type { Track } from '../types';

interface TrackRowProps {
    track: Track;
    index?: number;
    queue?: Track[];
    showStats?: boolean;
    onPlay?: (track: Track, queue: Track[]) => void;
}

// SoundCloud-style list row: artwork, title/artist, mini waveform (when
// playing), likes/plays stats, heart, more menu. Touch: swipe left reveals
// action buttons (Like / Add to playlist / Share).
export default function TrackRow({ track, index, queue, showStats = true, onPlay }: TrackRowProps) {
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const playTrack = usePlayerStore(s => s.playTrack);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const likedTracks = usePlayerStore(s => s.likedTracks);

    const [openSheet, setOpenSheet] = useState(false);
    const [openAddToPlaylist, setOpenAddToPlaylist] = useState(false);

    const isCurrent = currentTrack?.id === track.id;
    const isLiked = likedTracks.has(track.id);

    const x = useMotionValue(0);

    const handlePlay = useCallback(() => {
        if (onPlay) onPlay(track, queue && queue.length > 0 ? queue : [track]);
        else playTrack(track, queue && queue.length > 0 ? queue : [track]);
    }, [track, queue, onPlay, playTrack]);

    const handleLike = useCallback(async () => {
        await toggleLike(track);
        toast(isLiked ? 'Đã bỏ thích' : 'Đã thích bài hát');
        haptic(8);
    }, [track, toggleLike, isLiked]);

    const handleShare = useCallback(async () => {
        const url = `${window.location.origin}/share/track/${encodeURIComponent(track.id)}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: track.title, text: `${track.title} - ${track.artist}`, url });
            } catch { /* cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast('Đã sao chép liên kết');
            } catch {
                toast('Không thể sao chép');
            }
        }
    }, [track]);

    return (
        <>
            <div className="relative overflow-hidden group">
                {/* Revealed actions (swipe left) */}
                <div className="absolute inset-y-0 right-0 flex">
                    <button
                        onClick={handleLike}
                        className={`w-16 flex items-center justify-center ${isLiked ? 'bg-orange-500 text-white' : 'bg-neutral-700 text-white'}`}
                        aria-label="Like"
                    >
                        <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        onClick={() => { setOpenSheet(false); setOpenAddToPlaylist(true); }}
                        className="w-16 flex items-center justify-center bg-neutral-600 text-white"
                        aria-label="Add to playlist"
                    >
                        <ListPlus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-16 flex items-center justify-center bg-neutral-500 text-white"
                        aria-label="Share"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>

                <motion.div
                    className={`relative flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    style={{ x }}
                    drag="x"
                    dragConstraints={{ left: -192, right: 0 }}
                    dragElastic={0.1}
                    onDragEnd={(_e, info) => {
                        if (info.offset.x < -60 || info.velocity.x < -500) {
                            haptic(8);
                            x.set(-192);
                        } else {
                            x.set(0);
                        }
                    }}
                    onClick={handlePlay}
                >
                    {/* Play state / index */}
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                        {isCurrent ? (
                            isPlaying
                                ? <Pause className="w-4 h-4 text-orange-500" />
                                : <Play className="w-4 h-4 text-orange-500 fill-current" />
                        ) : (
                            <>
                                <span className={`text-xs font-bold tabular-nums w-4 text-center group-hover:hidden ${isCurrent ? 'text-orange-500' : 'text-neutral-500'}`}>
                                    {index !== undefined ? index + 1 : ''}
                                </span>
                                <Play className="w-4 h-4 text-neutral-300 hidden group-hover:block" />
                            </>
                        )}
                    </div>

                    <CoverImage
                        src={track.cover_url}
                        alt={track.title}
                        className="w-10 h-10 rounded flex-shrink-0 object-cover"
                        fallbackText="♪"
                    />

                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-orange-500' : 'text-white'}`}>
                            {track.title}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{track.artist}</p>
                        {isCurrent && (
                            <Waveform
                                trackId={track.id}
                                height={14}
                                barWidth={1.5}
                                barGap={1}
                                className="mt-1 max-w-[220px]"
                            />
                        )}
                    </div>

                    {showStats && (
                        <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500 flex-shrink-0">
                            {track.like_count != null && (
                                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatCount(track.like_count)}</span>
                            )}
                            {track.comment_count != null && track.comment_count > 0 && (
                                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatCount(track.comment_count)}</span>
                            )}
                            {track.view_count != null && (
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatCount(track.view_count)}</span>
                            )}
                        </div>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); handleLike(); }}
                        className={`p-1.5 rounded-full transition flex-shrink-0 ${isLiked ? 'text-orange-500' : 'text-neutral-500 hover:text-white'}`}
                        aria-label="Like"
                    >
                        <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setOpenSheet(true); }}
                        className="p-1.5 rounded-full text-neutral-500 hover:text-white transition flex-shrink-0"
                        aria-label="More"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>

            <BottomSheet isOpen={openSheet} onClose={() => setOpenSheet(false)} title={track.title}>
                <div className="flex flex-col gap-1 pb-4">
                    <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10 mb-1">
                        <CoverImage src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{track.title}</p>
                            <p className="text-xs text-neutral-500 truncate">{track.artist}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLike}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-sm font-medium text-white"
                    >
                        <Heart className={`w-5 h-5 ${isLiked ? 'text-orange-500' : 'text-neutral-400'}`} fill={isLiked ? 'currentColor' : 'none'} />
                        {isLiked ? 'Bỏ thích' : 'Thích'}
                    </button>
                    <button
                        onClick={() => { setOpenSheet(false); setOpenAddToPlaylist(true); }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-sm font-medium text-white"
                    >
                        <ListPlus className="w-5 h-5 text-neutral-400" />
                        Thêm vào playlist
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-sm font-medium text-white"
                    >
                        <Share2 className="w-5 h-5 text-neutral-400" />
                        Chia sẻ
                    </button>
                    <div className="flex items-center px-3 py-2">
                        <DownloadMenu
                            tracks={[track]}
                            className="flex items-center gap-3 py-2 rounded-xl hover:bg-white/5 transition text-sm font-medium text-white w-full"
                            iconClassName="w-5 h-5 text-neutral-400"
                        />
                    </div>
                </div>
            </BottomSheet>

            {openAddToPlaylist && (
                <AddToPlaylistModal track={track} isOpen onClose={() => setOpenAddToPlaylist(false)} />
            )}
        </>
    );
}
