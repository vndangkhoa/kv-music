import React, { useState, useCallback, useRef, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
    Play,
    Pause,
    ThumbsUp,
    MoreVertical,
    Share2,
    ListPlus,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Trash2,
} from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from './CoverImage';
import BottomSheet from './BottomSheet';
import AddToPlaylistModal from './AddToPlaylistModal';
import DownloadMenu from './DownloadMenu';
import { toast } from '../stores/toastStore';
import { formatCount } from '../utils/format';
import { haptic } from '../utils/haptic';
import type { Track } from '../types';

export function formatDuration(seconds?: number): string {
    if (!seconds || seconds <= 0 || !Number.isFinite(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface TrackRowProps {
    track: Track;
    index?: number;
    queue?: Track[];
    showStats?: boolean;
    onPlay?: (track: Track, queue: Track[]) => void;
    repostedBy?: string;
    className?: string;
    compact?: boolean;
    hideCover?: boolean;
    rankDelta?: 'up' | 'down' | 'neutral';
    subtitleOverride?: string;
    disableSwipe?: boolean;
    onRemoveFromPlaylist?: (track: Track) => void;
}

export default function TrackRow({
    track,
    index,
    queue,
    showStats = true,
    onPlay,
    repostedBy,
    className = '',
    compact = false,
    hideCover = false,
    rankDelta,
    subtitleOverride,
    disableSwipe = false,
    onRemoveFromPlaylist,
}: TrackRowProps) {
    const isCurrent = usePlayerStore(s => s.currentTrack?.id === track.id);
    const isPlaying = usePlayerStore(s => (s.currentTrack?.id === track.id ? s.isPlaying : false));
    const playTrack = usePlayerStore(s => s.playTrack);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const likedTracks = usePlayerStore(s => s.likedTracks);

    const [openSheet, setOpenSheet] = useState(false);
    const [openAddToPlaylist, setOpenAddToPlaylist] = useState(false);
    const [swipeOpen, setSwipeOpen] = useState(false);

    const isLiked = likedTracks.has(track.id);
    const x = useMotionValue(0);
    const revealedOpacity = useTransform(x, [0, -8], [0, 1]);

    const handlePlay = useCallback(() => {
        if (swipeOpen) {
            x.set(0);
            setSwipeOpen(false);
            return;
        }
        if (isCurrent) {
            togglePlay();
            return;
        }
        const targetQueue = queue && queue.length > 0 ? queue : [track];
        if (onPlay) onPlay(track, targetQueue);
        else playTrack(track, targetQueue);
    }, [swipeOpen, x, isCurrent, togglePlay, queue, track, onPlay, playTrack]);

    const handleLike = useCallback(async () => {
        await toggleLike(track);
        toast(isLiked ? 'Removed from Liked music' : 'Saved to Liked music');
        haptic(8);
    }, [track, toggleLike, isLiked]);

    const handleShare = useCallback(async () => {
        const url = `${window.location.origin}/track/${encodeURIComponent(track.id)}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: track.title, text: `${track.title} - ${track.artist}`, url });
            } catch {
                /* cancelled */
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast('Link copied to clipboard');
            } catch {
                toast('Could not copy link');
            }
        }
    }, [track]);

    const formattedDur = formatDuration(track.duration);

    const renderRankIndicator = () => {
        if (!rankDelta) return null;
        if (rankDelta === 'up') {
            return <span className="text-[10px] leading-none text-[#2ba640]" aria-label="Rank up">▲</span>;
        }
        if (rankDelta === 'down') {
            return <span className="text-[10px] leading-none text-[#ff4e45]" aria-label="Rank down">▼</span>;
        }
        return <span className="text-[10px] leading-none text-[#909090]" aria-label="Unchanged">•</span>;
    };

    const rowInner = (
        <div className="flex items-center gap-3 w-full min-w-0">
            {/* Optional Rank Index */}
            {index !== undefined && (
                <div
                    className={`${
                        rankDelta ? 'w-11' : 'w-6'
                    } flex-shrink-0 flex items-center justify-center gap-1.5 text-center text-sm font-medium text-white/70 tabular-nums`}
                >
                    {isCurrent && isPlaying && hideCover ? (
                        <div className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
                            <div className="w-[2.5px] bg-white rounded-full animate-soundwave-1" />
                            <div className="w-[2.5px] bg-white rounded-full animate-soundwave-2" />
                            <div className="w-[2.5px] bg-white rounded-full animate-soundwave-3" />
                        </div>
                    ) : (
                        <>
                            {rankDelta && (
                                <span className="group-hover:hidden flex items-center">{renderRankIndicator()}</span>
                            )}
                            <span className="group-hover:hidden text-sm font-medium text-white/70 tabular-nums">
                                {index + 1}
                            </span>
                            <span className="hidden group-hover:flex items-center justify-center text-white">
                                {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                )}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* 48px Square Cover with Hover / Playing Overlay */}
            {!hideCover && (
                <div className="relative w-12 h-12 rounded-[4px] overflow-hidden flex-shrink-0 bg-[#181818]">
                    <CoverImage
                        src={track.cover_url}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        fallbackText="♪"
                    />
                    <div
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                            isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    >
                        {isCurrent && isPlaying ? (
                            <>
                                <div className="flex items-end gap-[2px] h-4 group-hover:hidden" aria-hidden="true">
                                    <div className="w-[2.5px] bg-white rounded-full animate-soundwave-1" />
                                    <div className="w-[2.5px] bg-white rounded-full animate-soundwave-2" />
                                    <div className="w-[2.5px] bg-white rounded-full animate-soundwave-3" />
                                </div>
                                <Pause className="w-5 h-5 text-white fill-current hidden group-hover:block" />
                            </>
                        ) : (
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                        )}
                    </div>
                </div>
            )}

            {/* Center Stacked Lockup */}
            <div className="min-w-0 flex-1">
                <p
                    className={`text-[14px] font-medium leading-[1.25] truncate ${
                        isCurrent ? 'text-white font-semibold' : 'text-white'
                    }`}
                >
                    {track.title}
                </p>
                <div className="text-[14px] text-white/70 truncate leading-[1.3] mt-0.5 flex items-center gap-1">
                    {subtitleOverride ? (
                        <span className="truncate">{subtitleOverride}</span>
                    ) : (
                        <>
                            {track.artist ? (
                                <Link
                                    to={`/artist/${encodeURIComponent(track.artist)}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline hover:text-white transition-colors truncate"
                                >
                                    {track.artist}
                                </Link>
                            ) : (
                                <span>Unknown Artist</span>
                            )}
                            {track.album && !compact && (
                                <span className="truncate"> • {track.album}</span>
                            )}
                            {showStats && !compact && track.view_count != null && track.view_count > 0 && (
                                <span className="hidden md:inline flex-shrink-0">
                                    {' '}• {formatCount(track.view_count)} plays
                                </span>
                            )}
                            {repostedBy && (
                                <span className="hidden sm:inline flex-shrink-0 text-white/50">
                                    {' '}• {repostedBy}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right Action Cluster + Duration */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <div
                    className={`hidden sm:flex items-center gap-0.5 transition-opacity ${
                        isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLike();
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                            isLiked ? 'text-white hover:bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        aria-label={isLiked ? `Unlike ${track.title}` : `Like ${track.title}`}
                        title={isLiked ? 'Remove from Liked music' : 'Like'}
                    >
                        <ThumbsUp className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
                    </button>

                    {!compact && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenAddToPlaylist(true);
                                }}
                                className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                aria-label={`Add ${track.title} to playlist`}
                                title="Save to playlist"
                            >
                                <ListPlus className="w-4 h-4" />
                            </button>

                            <div
                                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <DownloadMenu
                                    tracks={[track]}
                                    className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 justify-center transition"
                                    iconClassName="w-4 h-4"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare();
                                }}
                                className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                aria-label={`Share ${track.title}`}
                                title="Share"
                            >
                                <Share2 className="w-4 h-4" />
                            </button>

                            {onRemoveFromPlaylist && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFromPlaylist(track);
                                    }}
                                    className="w-8 h-8 rounded-full text-white/70 hover:text-[#ff4e45] hover:bg-white/10 flex items-center justify-center transition opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                                    aria-label={`Remove ${track.title} from playlist`}
                                    title="Remove from playlist"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {formattedDur && (
                    <span className="text-[13px] text-white/70 tabular-nums w-11 text-right flex-shrink-0">
                        {formattedDur}
                    </span>
                )}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpenSheet(true);
                    }}
                    className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition flex-shrink-0"
                    aria-label={`More actions for ${track.title}`}
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const rowClasses = `min-h-[56px] px-3 py-2 rounded-[6px] flex items-center cursor-pointer transition-colors ${
        isCurrent ? 'bg-white/10' : 'hover:bg-white/[0.06]'
    } ${compact ? '' : 'border-b border-white/[0.08]'} ${className}`;

    return (
        <>
            {disableSwipe ? (
                <div className={`relative group ${rowClasses}`} onClick={handlePlay}>
                    {rowInner}
                </div>
            ) : (
                <div className="relative overflow-hidden group rounded-[6px]">
                    {/* Revealed swipe-left actions */}
                    <motion.div
                        style={{ opacity: revealedOpacity }}
                        aria-hidden={!swipeOpen}
                        className="absolute inset-y-0 right-0 flex"
                    >
                        <button
                            type="button"
                            tabIndex={swipeOpen ? 0 : -1}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleLike();
                                x.set(0);
                                setSwipeOpen(false);
                            }}
                            className={`w-16 flex items-center justify-center transition ${
                                isLiked ? 'bg-white text-[#030303]' : 'bg-[#282828] text-white'
                            }`}
                            aria-label={`Like ${track.title}`}
                        >
                            <ThumbsUp className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            type="button"
                            tabIndex={swipeOpen ? 0 : -1}
                            onClick={(e) => {
                                e.stopPropagation();
                                x.set(0);
                                setSwipeOpen(false);
                                setOpenAddToPlaylist(true);
                            }}
                            className="w-16 flex items-center justify-center bg-[#212121] text-white border-l border-white/10"
                            aria-label={`Add ${track.title} to playlist`}
                        >
                            <ListPlus className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            tabIndex={swipeOpen ? 0 : -1}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShare();
                                x.set(0);
                                setSwipeOpen(false);
                            }}
                            className="w-16 flex items-center justify-center bg-[#181818] text-white border-l border-white/10"
                            aria-label={`Share ${track.title}`}
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </motion.div>

                    <motion.div
                        className={`relative ${rowClasses}`}
                        style={{ x }}
                        drag="x"
                        dragConstraints={{ left: -192, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(_e, info) => {
                            if (info.offset.x < -60 || info.velocity.x < -500) {
                                haptic(8);
                                x.set(-192);
                                setSwipeOpen(true);
                            } else {
                                x.set(0);
                                setSwipeOpen(false);
                            }
                        }}
                        onClick={handlePlay}
                    >
                        {rowInner}
                    </motion.div>
                </div>
            )}

            <BottomSheet isOpen={openSheet} onClose={() => setOpenSheet(false)} title={track.title}>
                <div className="flex flex-col gap-1 pb-4">
                    <div className="flex items-center gap-3 px-2 py-3 border-b border-white/10 mb-1">
                        <CoverImage src={track.cover_url} alt={track.title} className="w-12 h-12 rounded-[4px] object-cover flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{track.title}</p>
                            <p className="text-xs text-white/70 truncate">
                                {track.artist}{track.album ? ` • ${track.album}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            handleLike();
                            setOpenSheet(false);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition text-sm font-medium text-white text-left"
                    >
                        <ThumbsUp className="w-5 h-5 text-white/80" fill={isLiked ? 'currentColor' : 'none'} />
                        {isLiked ? 'Remove from Liked music' : 'Add to Liked music'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOpenSheet(false);
                            setOpenAddToPlaylist(true);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition text-sm font-medium text-white text-left"
                    >
                        <ListPlus className="w-5 h-5 text-white/80" />
                        Save to playlist
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handleShare();
                            setOpenSheet(false);
                        }}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition text-sm font-medium text-white text-left"
                    >
                        <Share2 className="w-5 h-5 text-white/80" />
                        Share
                    </button>
                    {onRemoveFromPlaylist && (
                        <button
                            type="button"
                            onClick={() => {
                                onRemoveFromPlaylist(track);
                                setOpenSheet(false);
                            }}
                            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/[0.06] transition text-sm font-medium text-[#ff4e45] text-left"
                        >
                            <Trash2 className="w-5 h-5" />
                            Remove from playlist
                        </button>
                    )}
                    <div className="flex items-center px-3 py-2">
                        <DownloadMenu
                            tracks={[track]}
                            label="Download"
                            className="flex items-center gap-3 py-1 rounded-lg hover:bg-white/[0.06] transition text-sm font-medium text-white w-full"
                            iconClassName="w-5 h-5 text-white/80"
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

export interface YtmMediaCardProps {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    to?: string;
    onClick?: () => void;
    onPlay?: (e: React.MouseEvent) => void;
    variant?: 'square' | 'artist' | 'video';
    fallbackText?: string;
    topRightSlot?: React.ReactNode;
    bottomLeftBadge?: React.ReactNode;
    className?: string;
}

export function YtmMediaCard({
    title,
    subtitle,
    imageUrl,
    to,
    onClick,
    onPlay,
    variant = 'square',
    fallbackText = '♪',
    topRightSlot,
    bottomLeftBadge,
    className = '',
}: YtmMediaCardProps) {
    const isArtist = variant === 'artist';
    const aspectClass =
        variant === 'video' ? 'aspect-video rounded-[6px]' : isArtist ? 'aspect-square rounded-full' : 'aspect-square rounded-[6px]';

    const cardBody = (
        <div className={`group flex flex-col w-full ${className}`}>
            <div className={`relative w-full ${aspectClass} overflow-hidden bg-[#181818]`}>
                <CoverImage
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    fallbackText={fallbackText}
                />
                <div
                    className={`absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none ${
                        isArtist ? 'rounded-full' : ''
                    }`}
                />
                {bottomLeftBadge && (
                    <div className="absolute bottom-2 left-2 z-10">{bottomLeftBadge}</div>
                )}
                {topRightSlot && (
                    <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        {topRightSlot}
                    </div>
                )}
                {onPlay && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onPlay(e);
                        }}
                        aria-label={`Play ${title}`}
                        className={`absolute ${
                            isArtist ? 'bottom-3 right-3' : 'bottom-2.5 right-2.5'
                        } w-11 h-11 rounded-full bg-black/80 hover:bg-black hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all z-10`}
                    >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                )}
            </div>

            <div className={`mt-2.5 min-w-0 ${isArtist ? 'text-center px-1' : ''}`}>
                <h3 className="text-[14px] md:text-[15px] font-medium text-white leading-[1.25] line-clamp-2 group-hover:underline">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[14px] text-white/70 leading-[1.3] line-clamp-2 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );

    if (to) {
        return (
            <Link to={to} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-[6px]">
                {cardBody}
            </Link>
        );
    }

    if (onClick) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }}
                className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-[6px]"
            >
                {cardBody}
            </div>
        );
    }

    return cardBody;
}

export interface YtmCarouselProps {
    title: string;
    eyebrow?: string;
    leadingAvatar?: string;
    actionPill?: { label: string; onClick?: () => void; to?: string };
    headerRightExtra?: React.ReactNode;
    children: React.ReactNode;
    itemCount: number;
    trackClassName?: string;
    className?: string;
    id?: string;
}

export function YtmCarousel({
    title,
    eyebrow,
    leadingAvatar,
    actionPill,
    headerRightExtra,
    children,
    itemCount,
    trackClassName = 'gap-4 md:gap-6',
    className = '',
    id,
}: YtmCarouselProps) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const prevBtnRef = useRef<HTMLButtonElement | null>(null);
    const nextBtnRef = useRef<HTMLButtonElement | null>(null);
    const userInteractedRef = useRef(false);
    const lastSettledIndexRef = useRef(0);

    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);
    const [statusAnnouncement, setStatusAnnouncement] = useState('');

    const syncButtons = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        const nextCanPrev = el.scrollLeft > 4;
        const nextCanNext = maxScroll - el.scrollLeft > 4;

        setCanPrev((prev) => {
            if (prev && !nextCanPrev && document.activeElement === prevBtnRef.current && nextCanNext) {
                nextBtnRef.current?.focus();
            }
            return nextCanPrev;
        });
        setCanNext((prev) => {
            if (prev && !nextCanNext && document.activeElement === nextBtnRef.current && nextCanPrev) {
                prevBtnRef.current?.focus();
            }
            return nextCanNext;
        });
    }, []);

    const handleSettled = useCallback(() => {
        syncButtons();
        const el = trackRef.current;
        if (!el || !userInteractedRef.current) return;

        const childrenArr = Array.from(el.children) as HTMLElement[];
        if (childrenArr.length === 0) return;

        let nearestIdx = 0;
        let minDelta = Infinity;
        childrenArr.forEach((child, idx) => {
            const delta = Math.abs(child.offsetLeft - el.scrollLeft);
            if (delta < minDelta) {
                minDelta = delta;
                nearestIdx = idx;
            }
        });

        if (nearestIdx !== lastSettledIndexRef.current) {
            lastSettledIndexRef.current = nearestIdx;
            setStatusAnnouncement(`Slide ${nearestIdx + 1} of ${childrenArr.length}`);
        }
    }, [syncButtons]);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        syncButtons();

        const supportsScrollEnd = 'onscrollend' in window;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const onScroll = () => {
            syncButtons();
            if (!supportsScrollEnd) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(handleSettled, 140);
            }
        };

        const onScrollEnd = () => handleSettled();

        el.addEventListener('scroll', onScroll, { passive: true });
        if (supportsScrollEnd) {
            el.addEventListener('scrollend', onScrollEnd);
        }

        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncButtons) : null;
        ro?.observe(el);

        return () => {
            el.removeEventListener('scroll', onScroll);
            if (supportsScrollEnd) {
                el.removeEventListener('scrollend', onScrollEnd);
            }
            if (debounceTimer) clearTimeout(debounceTimer);
            ro?.disconnect();
        };
    }, [syncButtons, handleSettled, itemCount]);

    const scrollByStep = (direction: -1 | 1) => {
        const el = trackRef.current;
        if (!el) return;
        userInteractedRef.current = true;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const childrenArr = Array.from(el.children) as HTMLElement[];

        let delta = direction * Math.max(el.clientWidth * 0.85, 280);
        if (childrenArr.length > 0) {
            if (direction === 1) {
                const target = childrenArr.find((c) => c.offsetLeft > el.scrollLeft + 24);
                if (target) {
                    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
                    const nextTarget = childrenArr.find(
                        (c) => c.offsetLeft + c.offsetWidth > el.scrollLeft + el.clientWidth - 8
                    );
                    const chosen = nextTarget || target;
                    delta = Math.min(maxScroll, chosen.offsetLeft) - el.scrollLeft;
                    if (delta <= 8) delta = el.clientWidth * 0.85;
                }
            } else {
                const candidates = childrenArr.filter((c) => c.offsetLeft < el.scrollLeft - 24);
                if (candidates.length > 0) {
                    const targetLeft = Math.max(0, el.scrollLeft - el.clientWidth * 0.85);
                    let best = candidates[0];
                    for (const c of candidates) {
                        if (Math.abs(c.offsetLeft - targetLeft) < Math.abs(best.offsetLeft - targetLeft)) {
                            best = c;
                        }
                    }
                    delta = best.offsetLeft - el.scrollLeft;
                }
            }
        }

        el.scrollBy({
            left: delta,
            behavior: reducedMotion ? 'auto' : 'smooth',
        });
    };

    const headingId = useId();

    return (
        <section
            id={id}
            aria-roledescription="carousel"
            aria-labelledby={headingId}
            className={`space-y-4 ${className}`}
        >
            {/* Controls & Header precede track in DOM order */}
            <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    {leadingAvatar && (
                        <CoverImage
                            src={leadingAvatar}
                            alt=""
                            className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                        />
                    )}
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-xs uppercase tracking-wider text-white/70 font-normal mb-1 truncate">
                                {eyebrow}
                            </p>
                        )}
                        <h2
                            id={headingId}
                            className="text-[22px] sm:text-[24px] md:text-[28px] font-bold tracking-tight text-white leading-[1.2] truncate"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            {title}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {headerRightExtra}
                    {actionPill && (
                        actionPill.to ? (
                            <Link
                                to={actionPill.to}
                                className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 inline-flex items-center justify-center transition whitespace-nowrap"
                            >
                                {actionPill.label}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={actionPill.onClick}
                                className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 inline-flex items-center justify-center transition whitespace-nowrap"
                            >
                                {actionPill.label}
                            </button>
                        )
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            ref={prevBtnRef}
                            type="button"
                            aria-label="Previous"
                            disabled={!canPrev}
                            onClick={() => scrollByStep(-1)}
                            style={{ touchAction: 'manipulation' }}
                            className="w-9 h-9 rounded-full border border-white/20 text-white hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-default flex items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            ref={nextBtnRef}
                            type="button"
                            aria-label="Next"
                            disabled={!canNext}
                            onClick={() => scrollByStep(1)}
                            style={{ touchAction: 'manipulation' }}
                            className="w-9 h-9 rounded-full border border-white/20 text-white hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-default flex items-center justify-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div
                ref={trackRef}
                role="group"
                aria-label={`${title} items`}
                onPointerDown={() => {
                    userInteractedRef.current = true;
                }}
                onKeyDown={() => {
                    userInteractedRef.current = true;
                }}
                style={{
                    scrollSnapType: 'x mandatory',
                    overscrollBehaviorX: 'contain',
                    touchAction: 'manipulation',
                }}
                className={`relative flex overflow-x-auto no-scrollbar pb-1 ${trackClassName}`}
            >
                {children}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
                {statusAnnouncement}
            </p>
        </section>
    );
}

export interface YtmDropdownOption<T extends string> {
    value: T;
    label: string;
}

export function YtmDropdown<T extends string>({
    value,
    options,
    onChange,
    ariaLabel,
}: {
    value: T;
    options: YtmDropdownOption<T>[];
    onChange: (value: T) => void;
    ariaLabel: string;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const triggerId = useId();

    const activeOption = options.find((o) => o.value === value) || options[0];

    useEffect(() => {
        if (!open) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [open]);

    const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setTimeout(() => itemRefs.current[0]?.focus(), 0);
        }
    };

    const handleMenuKeyDown = (e: React.KeyboardEvent, idx: number) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            itemRefs.current[(idx + 1) % options.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            itemRefs.current[(idx - 1 + options.length) % options.length]?.focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            itemRefs.current[0]?.focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            itemRefs.current[options.length - 1]?.focus();
        } else if (e.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                ref={triggerRef}
                id={triggerId}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={handleTriggerKeyDown}
                className="h-9 pl-4 pr-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium text-white inline-flex items-center gap-2 transition"
            >
                <span>{activeOption?.label}</span>
                <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    role="menu"
                    aria-labelledby={triggerId}
                    className="absolute left-0 top-full mt-2 min-w-[180px] py-1.5 rounded-[8px] bg-[#212121] border border-white/10 shadow-2xl z-40"
                >
                    {options.map((opt, idx) => {
                        const isSelected = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                ref={(el) => {
                                    itemRefs.current[idx] = el;
                                }}
                                role="menuitem"
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                    triggerRef.current?.focus();
                                }}
                                onKeyDown={(e) => handleMenuKeyDown(e, idx)}
                                className={`w-full text-left px-4 py-2 text-sm transition flex items-center justify-between ${
                                    isSelected
                                        ? 'bg-white/10 text-white font-medium'
                                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                                }`}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
