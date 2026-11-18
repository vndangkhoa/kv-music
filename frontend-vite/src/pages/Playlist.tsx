import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Bookmark, MoreVertical, Shuffle, ListPlus, Share2 } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { dbService, Playlist as PlaylistType } from '../services/db';
import { libraryService, streamUrl } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import TrackRow from '../components/TrackRow';
import DownloadMenu from '../components/DownloadMenu';
import Skeleton from '../components/Skeleton';
import Recommendations from '../components/Recommendations';
import { GENERATED_CONTENT } from '../data/seed_data';
import { toast } from '../stores/toastStore';

type PlaylistData = PlaylistType | StaticPlaylist;

export default function Playlist() {
    const { id: playlistId } = useParams<{ id: string }>();
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingTracks, setLoadingTracks] = useState(false);
    const [isUserPlaylist, setIsUserPlaylist] = useState(false);
    const [saved, setSaved] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

    const playTrack = usePlayerStore(s => s.playTrack);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const addToQueue = usePlayerStore(s => s.addToQueue);
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);

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
        if (!playlistId) return;

        const loadPlaylist = async () => {
            const userPlaylist = userPlaylists.find(p => p.id === playlistId);
            if (userPlaylist) {
                setPlaylist(userPlaylist);
                setIsUserPlaylist(!playlistId.startsWith('playlist-') && !playlistId.startsWith('discovery-'));
                setLoading(false);
                if (userPlaylist.tracks.length > 0) return;
            }

            const seedItem = Object.values(GENERATED_CONTENT).find(p => p.id === playlistId);
            if (seedItem) {
                setPlaylist({
                    id: seedItem.id,
                    title: seedItem.title,
                    description: seedItem.description,
                    cover_url: seedItem.cover_url,
                    tracks: seedItem.tracks || [],
                    type: 'Playlist',
                } as StaticPlaylist);
                setLoading(false);

                if (seedItem.tracks && seedItem.tracks.length > 0) return;
                setLoadingTracks(true);
            } else if (!userPlaylist) {
                setLoading(true);
            }

            await hydrateTracks(playlistId);
        };

        const hydrateTracks = async (id: string, attempt = 0) => {
            try {
                const dbPlaylist = await dbService.getPlaylist(id);
                if (dbPlaylist) {
                    setPlaylist(dbPlaylist);
                    setIsUserPlaylist(true);
                    setLoading(false);
                    setLoadingTracks(false);
                    return;
                }

                const apiPlaylist = await libraryService.getPlaylist(id);
                if (apiPlaylist && apiPlaylist.tracks.length > 0) {
                    const normalizedTracks = apiPlaylist.tracks.map((track: Track) => {
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
                    setPlaylist({ ...apiPlaylist, tracks: normalizedTracks });
                    setIsUserPlaylist(false);
                    setLoading(false);
                } else if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 1000));
                    await hydrateTracks(id, attempt + 1);
                } else {
                    setLoading(false);
                }
                setLoadingTracks(false);
            } catch {
                setLoading(false);
                setLoadingTracks(false);
            }
        };

        loadPlaylist();
    }, [playlistId, userPlaylists]);

    const handleMainPlay = () => {
        if (!playlist || playlist.tracks.length === 0) return;
        if (currentTrack && playlist.tracks.some(t => t.id === currentTrack.id)) {
            togglePlay();
        } else {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    const handleRemoveTrack = async (track: Track) => {
        if (!playlist || !isUserPlaylist) return;
        await dbService.removeFromPlaylist(playlist.id, track.id);
        await refreshLibrary();
        setPlaylist(prev =>
            prev ? { ...prev, tracks: prev.tracks.filter(t => t.id !== track.id) } : prev
        );
        toast(`Removed "${track.title}"`);
    };

    const handleShare = async () => {
        if (!playlist) return;
        setMenuOpen(false);
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: playlist.title, url });
            } catch {
                /* cancelled */
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                toast('Playlist link copied');
            } catch {
                toast('Could not copy link');
            }
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-10 space-y-6">
                <div className="flex flex-col lg:flex-row gap-10">
                    <Skeleton className="w-[264px] h-[264px] rounded-[8px] mx-auto lg:mx-0" />
                    <div className="flex-1 space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-8">
                <div className="text-center space-y-3">
                    <h2 className="text-xl font-bold text-white">Playlist not found</h2>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center h-9 px-5 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const cover = playlist.cover_url || playlist.tracks[0]?.cover_url;
    const isPlaylistPlaying =
        isPlaying && currentTrack && playlist.tracks.some(t => t.id === currentTrack.id);
    const totalSeconds = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seedForRecs = playlist.tracks[0]?.artist || playlist.title;

    return (
        <div className="min-h-full bg-transparent text-white relative">
            {/* 49vh Blurred Ambient Backdrop */}
            {cover && (
                <div className="absolute inset-x-0 top-0 h-[49vh] min-h-[340px] overflow-hidden pointer-events-none select-none">
                    <img
                        src={cover}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover blur-[80px] scale-110 opacity-45"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#030303]/70 to-[#030303]" />
                </div>
            )}

            <div className="relative z-10 max-w-[1478px] mx-auto px-4 md:px-10 pt-8 md:pt-14 pb-28 space-y-14">
                <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
                    {/* Left Sticky Column */}
                    <aside className="w-full lg:w-[340px] xl:w-[380px] lg:sticky lg:top-20 flex flex-col items-center text-center flex-shrink-0">
                        <div className="w-[216px] h-[216px] sm:w-[264px] sm:h-[264px] rounded-[8px] overflow-hidden shadow-2xl bg-[#181818]">
                            <CoverImage
                                src={cover}
                                alt={playlist.title}
                                className="w-full h-full object-cover"
                                fallbackText="PL"
                            />
                        </div>

                        <h1
                            className="text-[24px] sm:text-[28px] font-bold text-white leading-[1.2] mt-5 line-clamp-2"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            {playlist.title}
                        </h1>

                        <p className="text-sm text-white/70 mt-2">
                            Playlist • {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
                            {totalMinutes > 0 ? ` • ${totalMinutes} minutes` : ''}
                        </p>

                        {'description' in playlist && playlist.description && (
                            <p className="text-sm text-white/60 mt-2 line-clamp-2 max-w-xs">
                                {playlist.description}
                            </p>
                        )}

                        {/* Centered Action Button Triad */}
                        <div className="flex items-center justify-center gap-5 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setSaved(s => !s);
                                    toast(saved ? 'Removed from library' : 'Saved playlist to library');
                                }}
                                aria-label={saved ? 'Saved playlist' : 'Save playlist'}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                            >
                                <Bookmark className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
                            </button>

                            <button
                                type="button"
                                onClick={handleMainPlay}
                                disabled={playlist.tracks.length === 0}
                                aria-label={isPlaylistPlaying ? 'Pause playlist' : 'Play playlist'}
                                className="w-16 h-16 rounded-full bg-[#F1F1F1] hover:bg-white text-[#030303] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition disabled:opacity-50"
                            >
                                {isPlaylistPlaying ? (
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
                                    aria-label="More playlist actions"
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
                                                if (playlist.tracks.length > 0) {
                                                    if (!shuffle) toggleShuffle();
                                                    const rand = Math.floor(Math.random() * playlist.tracks.length);
                                                    playTrack(playlist.tracks[rand], playlist.tracks);
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
                                                if (playlist.tracks.length > 0) {
                                                    addToQueue(playlist.tracks);
                                                    toast(`Added ${playlist.tracks.length} songs to queue`);
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
                                                tracks={playlist.tracks}
                                                label="Download playlist"
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
                        {loadingTracks && playlist.tracks.length === 0 ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
                                ))}
                            </div>
                        ) : playlist.tracks.length === 0 ? (
                            <div className="p-10 text-center bg-[#181818] border border-white/10 rounded-[8px] space-y-3">
                                <p className="text-sm text-white/70">This playlist has no tracks yet.</p>
                                <Link
                                    to="/search"
                                    className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-white text-[#030303] text-sm font-medium hover:bg-white/90 transition"
                                >
                                    Find tracks to add
                                </Link>
                            </div>
                        ) : (
                            playlist.tracks.map((track, idx) => (
                                <TrackRow
                                    key={`${track.id}-${idx}`}
                                    track={track}
                                    index={idx}
                                    queue={playlist.tracks}
                                    onRemoveFromPlaylist={isUserPlaylist ? handleRemoveTrack : undefined}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Recommendations Shelf */}
                <Recommendations
                    seed={seedForRecs}
                    seedType="playlist"
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
