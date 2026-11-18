import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { libraryService, streamUrl } from '../services/library';
import { usePlayerStore } from '../stores/playerStore';
import { Play, Pause, Bookmark, MoreVertical, Shuffle, ListPlus, Share2 } from 'lucide-react';
import { Track } from '../types';
import CoverImage from '../components/CoverImage';
import TrackRow, { YtmCarousel, YtmMediaCard } from '../components/TrackRow';
import Recommendations from '../components/Recommendations';
import DownloadMenu from '../components/DownloadMenu';
import { formatCount } from '../utils/format';
import { toast } from '../stores/toastStore';

export default function Album() {
    const { id } = useParams();
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const playTrack = usePlayerStore(s => s.playTrack);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const addToQueue = usePlayerStore(s => s.addToQueue);

    const [tracks, setTracks] = useState<Track[]>([]);
    const [albumInfo, setAlbumInfo] = useState<{ title: string; artist: string; cover?: string; year?: string } | null>(null);
    const [moreByArtist, setMoreByArtist] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                menuTriggerRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const fetchAlbum = async () => {
            const queryId = decodeURIComponent(id);
            try {
                const album = await libraryService.getAlbum(queryId);

                if (album) {
                    const normalizedTracks = album.tracks.map((track) => {
                        let videoId = track.id;
                        if (track.id.includes('discovery-') || track.id.includes('artist-')) {
                            const parts = track.id.split('-');
                            for (const part of parts) {
                                if (part.length === 11 && /^[a-zA-Z0-9_-]+$/.test(part)) {
                                    videoId = part;
                                    break;
                                }
                            }
                        }
                        return { ...track, id: videoId, url: `${streamUrl(videoId)}` };
                    });
                    setTracks(normalizedTracks);
                    setAlbumInfo({
                        title: album.title,
                        artist: album.creator || normalizedTracks[0]?.artist || 'Unknown Artist',
                        cover: album.cover_url || normalizedTracks[0]?.cover_url,
                        year: '2024',
                    });

                    try {
                        const artistQuery = album.creator || normalizedTracks[0]?.artist || '';
                        if (artistQuery) {
                            const suggestions = await libraryService.search(artistQuery);
                            const currentIds = new Set(normalizedTracks.map(t => t.id));
                            setMoreByArtist(suggestions.filter(t => !currentIds.has(t.id)).slice(0, 12));
                        }
                    } catch {
                        /* ignore */
                    }
                } else {
                    const cleanTitle = queryId.replace(/^search-|^album-/, '');
                    const results = await libraryService.search(queryId);
                    setTracks(results);
                    setAlbumInfo({
                        title: cleanTitle,
                        artist: results.length > 0 ? results[0].artist : 'Unknown Artist',
                        cover: results.length > 0 ? results[0].cover_url : undefined,
                        year: '2024',
                    });
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchAlbum();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!albumInfo) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
                <p className="text-lg font-bold text-white mb-2">Album not found</p>
                <Link to="/" className="h-9 px-5 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 inline-flex items-center">
                    Back to Home
                </Link>
            </div>
        );
    }

    const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const formattedDuration =
        totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)} hr ${totalMinutes % 60} min`
            : `${totalMinutes} minutes`;

    const isAlbumPlaying = isPlaying && currentTrack && tracks.some(t => t.id === currentTrack.id);

    const handleMainPlay = () => {
        if (tracks.length === 0) return;
        if (currentTrack && tracks.some(t => t.id === currentTrack.id)) {
            togglePlay();
        } else {
            playTrack(tracks[0], tracks);
        }
    };

    const handleShare = async () => {
        setMenuOpen(false);
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: albumInfo.title, text: `${albumInfo.title} • ${albumInfo.artist}`, url });
            } catch {
                /* cancelled */
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast('Album link copied');
            } catch {
                toast('Could not copy link');
            }
        }
    };

    return (
        <div className="min-h-full bg-transparent text-white relative">
            {/* 49vh Blurred Ambient Cover Backdrop */}
            {albumInfo.cover && (
                <div className="absolute inset-x-0 top-0 h-[49vh] min-h-[340px] overflow-hidden pointer-events-none select-none">
                    <img
                        src={albumInfo.cover}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover blur-[80px] scale-110 opacity-45"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#030303]/70 to-[#030303]" />
                </div>
            )}

            <div className="relative z-10 max-w-[1478px] mx-auto px-4 md:px-10 pt-8 md:pt-14 pb-28 space-y-14">
                {/* Two-Column YTM Detail Split */}
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
                    {/* Left Sticky Metadata Column */}
                    <aside className="w-full lg:w-[340px] xl:w-[380px] lg:sticky lg:top-20 flex flex-col items-center text-center flex-shrink-0">
                        <Link
                            to={`/artist/${encodeURIComponent(albumInfo.artist)}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-white hover:underline mb-4"
                        >
                            {albumInfo.cover && (
                                <img
                                    src={albumInfo.cover}
                                    alt=""
                                    className="w-5 h-5 rounded-full object-cover"
                                />
                            )}
                            <span>{albumInfo.artist}</span>
                        </Link>

                        <div
                            onClick={() => {
                                if (tracks.length > 0) {
                                    playTrack(tracks[0], tracks);
                                    setIsFullScreenOpen(true);
                                }
                            }}
                            className="w-[216px] h-[216px] sm:w-[264px] sm:h-[264px] rounded-[8px] overflow-hidden shadow-2xl bg-[#181818] cursor-pointer group"
                        >
                            <CoverImage
                                src={albumInfo.cover}
                                alt={albumInfo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                fallbackText="AL"
                            />
                        </div>

                        <h1
                            className="text-[24px] sm:text-[28px] font-bold text-white leading-[1.2] mt-5 line-clamp-2"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            {albumInfo.title}
                        </h1>

                        <p className="text-sm text-white/70 mt-2">
                            Album • {albumInfo.year}
                        </p>
                        <p className="text-sm text-white/70 mt-0.5">
                            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
                            {totalMinutes > 0 ? ` • ${formattedDuration}` : ''}
                        </p>

                        {/* Action Button Triad */}
                        <div className="flex items-center justify-center gap-5 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setSaved(s => !s);
                                    toast(saved ? 'Removed from library' : 'Saved album to library');
                                }}
                                aria-label={saved ? 'Saved to library' : 'Save album to library'}
                                title={saved ? 'Saved' : 'Save to library'}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                            >
                                <Bookmark className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
                            </button>

                            <button
                                type="button"
                                onClick={handleMainPlay}
                                disabled={tracks.length === 0}
                                aria-label={isAlbumPlaying ? 'Pause album' : 'Play album'}
                                className="w-16 h-16 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-50"
                            >
                                {isAlbumPlaying ? (
                                    <Pause className="w-7 h-7 fill-current" />
                                ) : (
                                    <Play className="w-7 h-7 fill-current ml-0.5" />
                                )}
                            </button>

                            <div ref={menuRef} className="relative">
                                <button
                                    ref={menuTriggerRef}
                                    type="button"
                                    onClick={() => setMenuOpen(o => !o)}
                                    aria-label="More album actions"
                                    aria-haspopup="menu"
                                    aria-expanded={menuOpen}
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {menuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute right-0 top-full mt-2 w-52 py-1.5 rounded-[8px] bg-[#212121] border border-white/10 shadow-2xl z-30 text-left"
                                    >
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                if (tracks.length > 0) {
                                                    if (!shuffle) toggleShuffle();
                                                    const rand = Math.floor(Math.random() * tracks.length);
                                                    playTrack(tracks[rand], tracks);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-sm text-white hover:bg-white/[0.06] flex items-center gap-3"
                                        >
                                            <Shuffle className="w-4 h-4 text-white/80" />
                                            <span>Shuffle play</span>
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setMenuOpen(false);
                                                if (tracks.length > 0) {
                                                    addToQueue(tracks);
                                                    toast(`Added ${tracks.length} songs to queue`);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-sm text-white hover:bg-white/[0.06] flex items-center gap-3"
                                        >
                                            <ListPlus className="w-4 h-4 text-white/80" />
                                            <span>Add to queue</span>
                                        </button>
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleShare}
                                            className="w-full px-4 py-2.5 text-sm text-white hover:bg-white/[0.06] flex items-center gap-3"
                                        >
                                            <Share2 className="w-4 h-4 text-white/80" />
                                            <span>Share</span>
                                        </button>
                                        <div className="px-4 py-2 hover:bg-white/[0.06]">
                                            <DownloadMenu
                                                tracks={tracks}
                                                label="Download album"
                                                className="text-sm text-white w-full"
                                                iconClassName="w-4 h-4 text-white/80"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Right Scrollable Tracklist Column */}
                    <div className="flex-1 min-w-0 w-full space-y-1">
                        {tracks.map((track, i) => (
                            <TrackRow
                                key={`${track.id}-${i}`}
                                track={track}
                                index={i}
                                queue={tracks}
                                hideCover
                                subtitleOverride={
                                    track.view_count && track.view_count > 0
                                        ? `${track.artist} • ${formatCount(track.view_count)} plays`
                                        : track.artist
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* More by Artist Shelf */}
                {moreByArtist.length > 0 && (
                    <YtmCarousel
                        title={`More by ${albumInfo.artist}`}
                        itemCount={moreByArtist.length}
                        actionPill={{ label: 'Artist page', to: `/artist/${encodeURIComponent(albumInfo.artist)}` }}
                        trackClassName="gap-4 md:gap-6"
                    >
                        {moreByArtist.map((track, idx) => (
                            <div
                                key={`more-${track.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${moreByArtist.length}`}
                                className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    title={track.title}
                                    subtitle={track.artist}
                                    imageUrl={track.cover_url}
                                    onClick={() => playTrack(track, moreByArtist)}
                                    onPlay={() => playTrack(track, moreByArtist)}
                                    fallbackText="♪"
                                />
                            </div>
                        ))}
                    </YtmCarousel>
                )}

                {/* You Might Also Like Recommendations */}
                <Recommendations
                    seed={albumInfo.artist}
                    seedType="album"
                    limit={10}
                    title="You might also like"
                    showTracks={true}
                    showAlbums={true}
                    showPlaylists={true}
                />
            </div>
        </div>
    );
}
