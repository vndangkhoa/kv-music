import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Plus, Trash2, Play, Disc3, Users, Clock, Music, RotateCcw, LogIn, UserPlus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import TrackRow, { YtmMediaCard, YtmDropdown, type YtmDropdownOption } from '../components/TrackRow';
import ArtistAvatar from '../components/ArtistAvatar';
import Skeleton from '../components/Skeleton';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { usePagedList } from '../hooks/usePagedList';
import { isUserOwnedPlaylist } from '../services/db';
import { libraryService } from '../services/library';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { toast } from '../stores/toastStore';
import type { Playlist } from '../types';

type LibraryTabKey = 'all' | 'playlists' | 'liked' | 'albums' | 'artists' | 'recent';
type SortOrder = 'recent' | 'az';

const SORT_OPTIONS: YtmDropdownOption<SortOrder>[] = [
    { value: 'recent', label: 'Recently added' },
    { value: 'az', label: 'A–Z' },
];

export default function Library() {
    const navigate = useNavigate();
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const followedArtists = useLibraryStore(s => s.followedArtists);
    const savedAlbums = useLibraryStore(s => s.savedAlbums);
    const removedPlaylistIds = useLibraryStore(s => s.removedPlaylistIds);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const createPlaylist = useLibraryStore(s => s.createPlaylist);
    const deletePlaylist = useLibraryStore(s => s.deletePlaylist);
    const restoreDefaultPlaylists = useLibraryStore(s => s.restoreDefaultPlaylists);
    const hydrateSeedTracks = useLibraryStore(s => s.hydrateSeedTracks);
    const deriveSavedAlbums = useLibraryStore(s => s.deriveSavedAlbums);
    const activeFilter = useLibraryStore(s => s.activeFilter);
    const setActiveFilter = useLibraryStore(s => s.setActiveFilter);

    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const openAuthModal = useAuthStore(s => s.openAuthModal);

    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playHistory = usePlayerStore(s => s.playHistory);
    const playTrack = usePlayerStore(s => s.playTrack);
    const startAutoSync = useLibraryStore(s => s.startAutoSync);

    const [localTab, setLocalTab] = useState<LibraryTabKey>(activeFilter || 'all');
    const [sortBy, setSortBy] = useState<SortOrder>('recent');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Playlist | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (activeFilter && localTab !== 'recent') {
            setLocalTab(activeFilter);
        }
    }, [activeFilter]);

    const { containerRef, pullProps, indicator } = usePullToRefresh(refreshLibrary);

    useEffect(() => {
        refreshLibrary();
        hydrateSeedTracks();
        deriveSavedAlbums(playHistory);

        const stopSync = startAutoSync();
        return () => stopSync();
    }, []);

    const handleTabChange = (key: LibraryTabKey) => {
        setLocalTab(key);
        if (key !== 'recent') {
            setActiveFilter(key);
        }
    };

    const handleRemovePlaylist = async (e: React.MouseEvent, playlist: Playlist) => {
        e.preventDefault();
        e.stopPropagation();
        if (isUserOwnedPlaylist(playlist)) {
            setConfirmDelete(playlist);
            return;
        }
        try {
            await deletePlaylist(playlist.id);
            toast(`Removed "${playlist.title}" from library`);
        } catch {
            toast('Could not remove playlist');
        }
    };

    const handleConfirmDeleteOwned = async () => {
        if (!confirmDelete || deleting) return;
        const target = confirmDelete;
        setDeleting(true);
        try {
            await deletePlaylist(target.id);
            toast(`Deleted "${target.title}"`);
            setConfirmDelete(null);
        } catch {
            toast('Could not delete playlist');
        } finally {
            setDeleting(false);
        }
    };

    const handleRestoreDefaults = async () => {
        try {
            await restoreDefaultPlaylists();
            toast('Default playlists restored');
        } catch {
            toast('Could not restore playlists');
        }
    };

    const handleCreatePlaylist = async (name: string, description?: string) => {
        try {
            const created = await createPlaylist(name, description);
            toast(`Created "${created.title}"`);
            navigate(`/playlist/${encodeURIComponent(created.id)}`);
        } catch (err) {
            toast('Could not create playlist');
            throw err;
        }
    };

    const playCollection = async (id: string, isAlbum: boolean) => {
        try {
            const data = isAlbum ? await libraryService.getAlbum(id) : await libraryService.getPlaylist(id);
            if (data && data.tracks.length > 0) {
                playTrack(data.tracks[0], data.tracks);
            }
        } catch {
            /* ignore */
        }
    };

    const playArtist = async (artistName: string) => {
        try {
            const songs = await libraryService.search(artistName);
            if (songs.length > 0) playTrack(songs[0], songs);
        } catch {
            /* ignore */
        }
    };

    const sortedPlaylists = useMemo(() => {
        const list = [...userPlaylists];
        list.sort((a, b) => {
            const aOwned = isUserOwnedPlaylist(a);
            const bOwned = isUserOwnedPlaylist(b);
            if (aOwned !== bOwned) return aOwned ? -1 : 1;
            if (sortBy === 'az') {
                return a.title.localeCompare(b.title);
            }
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return list;
    }, [userPlaylists, sortBy]);

    const sortedAlbums = useMemo(() => {
        const list = [...savedAlbums];
        if (sortBy === 'az') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }
        return list;
    }, [savedAlbums, sortBy]);

    const sortedArtists = useMemo(() => {
        const list = [...followedArtists];
        if (sortBy === 'az') {
            list.sort((a, b) => a.localeCompare(b));
        }
        return list;
    }, [followedArtists, sortBy]);

    const sortedLiked = useMemo(() => {
        const list = [...likedTracksData];
        if (sortBy === 'az') {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }
        return list;
    }, [likedTracksData, sortBy]);

    const recent = useMemo(() => playHistory.slice(0, 15), [playHistory]);

    const {
        visible: visibleLikes,
        total: totalLikes,
        hasMore: hasMoreLikes,
        sentinelRef: likesSentinelRef,
    } = usePagedList(sortedLiked, 8, 6);

    const {
        visible: visibleRecent,
        total: totalRecent,
        hasMore: hasMoreRecent,
        sentinelRef: recentSentinelRef,
    } = usePagedList(recent, 8, 6);

    const filterChips: { key: LibraryTabKey; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'playlists', label: 'Playlists' },
        { key: 'liked', label: 'Songs' },
        { key: 'albums', label: 'Albums' },
        { key: 'artists', label: 'Artists' },
        { key: 'recent', label: 'History' },
    ];

    const showPlaylists = localTab === 'all' || localTab === 'playlists';
    const showSongs = localTab === 'all' || localTab === 'liked';
    const showAlbums = localTab === 'all' || localTab === 'albums';
    const showArtists = localTab === 'all' || localTab === 'artists';
    const showRecent = localTab === 'all' || localTab === 'recent';

    return (
        <div
            ref={containerRef}
            {...pullProps}
            className="min-h-full bg-transparent text-white"
        >
            {indicator}

            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-8">
                {/* Header & Toolbar */}
                <header className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1
                            className="text-[28px] sm:text-[32px] md:text-[34px] font-bold tracking-tight text-white leading-[1.15]"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            Library
                        </h1>

                        <div className="flex items-center gap-3">
                            <YtmDropdown
                                value={sortBy}
                                options={SORT_OPTIONS}
                                onChange={setSortBy}
                                ariaLabel="Sort library"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium text-white inline-flex items-center gap-1.5 transition"
                            >
                                <Plus className="w-4 h-4" />
                                <span>New playlist</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <div
                        role="tablist"
                        aria-label="Library category filters"
                        className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
                    >
                        {filterChips.map(({ key, label }) => {
                            const isActive = localTab === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => handleTabChange(isActive && key !== 'all' ? 'all' : key)}
                                    className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                                        isActive
                                            ? 'bg-white text-[#030303]'
                                            : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {!isLoggedIn && (
                    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 rounded-[10px] bg-[#181818] border border-white/10">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">
                                Sync your playlists across devices
                            </p>
                            <p className="text-xs text-white/60 mt-0.5">
                                Create an account or sign in to save your playlists and removals to your profile.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => openAuthModal('login')}
                                className="h-8 px-4 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white inline-flex items-center gap-1.5 transition"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Sign in</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => openAuthModal('register')}
                                className="h-8 px-4 rounded-full bg-white text-[#030303] hover:bg-white/90 text-xs font-medium inline-flex items-center gap-1.5 transition"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Create account</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 1. Playlists Grid (includes Pinned Liked Music auto-playlist) */}
                {showPlaylists && (
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2
                                className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Playlists
                            </h2>
                            <div className="flex items-center gap-3">
                                {removedPlaylistIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => void handleRestoreDefaults()}
                                        className="h-7 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 hover:text-white inline-flex items-center gap-1.5 transition"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Restore defaults</span>
                                    </button>
                                )}
                                <span className="text-xs text-white/60 tabular-nums">
                                    {sortedPlaylists.length + 1} items
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {/* Pinned Liked Music Auto-Playlist */}
                            <Link
                                to="/collection/tracks"
                                className="group flex flex-col w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-[6px]"
                            >
                                <div className="relative w-full aspect-square rounded-[6px] overflow-hidden bg-gradient-to-br from-purple-600 via-fuchsia-600 to-red-500 flex items-center justify-center shadow-lg">
                                    <ThumbsUp className="w-14 h-14 text-white fill-current drop-shadow-md transition-transform duration-300 group-hover:scale-105" />
                                    {likedTracksData.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                playTrack(likedTracksData[0], likedTracksData);
                                            }}
                                            aria-label="Play Liked Music"
                                            className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-black/80 hover:bg-black hover:scale-105 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all"
                                        >
                                            <Play className="w-5 h-5 fill-current ml-0.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-2.5 min-w-0">
                                    <h3 className="text-[14px] md:text-[15px] font-medium text-white leading-[1.25] line-clamp-2 group-hover:underline">
                                        Liked Music
                                    </h3>
                                    <p className="text-[14px] text-white/70 leading-[1.3] line-clamp-2 mt-1">
                                        Auto playlist • {likedTracksData.length} {likedTracksData.length === 1 ? 'song' : 'songs'}
                                    </p>
                                </div>
                            </Link>

                            {/* User & Seed Playlists */}
                            {sortedPlaylists.map((playlist) => {
                                const isOwned = isUserOwnedPlaylist(playlist);
                                return (
                                    <YtmMediaCard
                                        key={playlist.id}
                                        title={playlist.title}
                                        subtitle={
                                            isOwned
                                                ? `Your playlist • ${playlist.tracks?.length || 0} songs`
                                                : `Playlist • ${playlist.tracks?.length || 0} songs`
                                        }
                                        imageUrl={playlist.cover_url}
                                        to={`/playlist/${encodeURIComponent(playlist.id)}`}
                                        onPlay={() =>
                                            playlist.tracks && playlist.tracks.length > 0
                                                ? playTrack(playlist.tracks[0], playlist.tracks)
                                                : playCollection(playlist.id, false)
                                        }
                                        fallbackText={playlist.title?.substring(0, 2).toUpperCase() || 'PL'}
                                        topRightSlot={
                                            <button
                                                type="button"
                                                onClick={(e) => void handleRemovePlaylist(e, playlist)}
                                                aria-label={
                                                    isOwned
                                                        ? `Delete ${playlist.title}`
                                                        : `Remove ${playlist.title} from library`
                                                }
                                                title={isOwned ? 'Delete playlist' : 'Remove from library'}
                                                className="w-8 h-8 rounded-full bg-black/75 hover:bg-[#ff4e45] text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        }
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 2. Saved Albums */}
                {showAlbums && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2
                                className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Albums
                            </h2>
                            <span className="text-xs text-white/60 tabular-nums">{sortedAlbums.length}</span>
                        </div>

                        {sortedAlbums.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {sortedAlbums.map((album) => (
                                    <YtmMediaCard
                                        key={album.id}
                                        title={album.title}
                                        subtitle={`Album • ${album.artist}`}
                                        imageUrl={album.cover_url}
                                        to={`/album/${encodeURIComponent(album.title)}`}
                                        onPlay={() => playCollection(album.title, true)}
                                        fallbackText={album.title?.substring(0, 2).toUpperCase() || 'AL'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-10 text-center space-y-2">
                                <Disc3 className="w-9 h-9 text-white/30 mx-auto" />
                                <p className="text-sm font-medium text-white">No saved albums yet</p>
                                <p className="text-xs text-white/60">Albums from your listening history will appear here.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* 3. Followed Artists */}
                {showArtists && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2
                                className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Artists
                            </h2>
                            <span className="text-xs text-white/60 tabular-nums">{sortedArtists.length}</span>
                        </div>

                        {sortedArtists.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {sortedArtists.map((artistName) => (
                                    <Link
                                        key={artistName}
                                        to={`/artist/${encodeURIComponent(artistName)}`}
                                        className="group flex flex-col items-center text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-white rounded-[6px]"
                                    >
                                        <div className="relative w-full aspect-square rounded-full overflow-hidden bg-[#181818]">
                                            <ArtistAvatar
                                                artistName={artistName}
                                                className="w-full h-full rounded-full border-0"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    playArtist(artistName);
                                                }}
                                                aria-label={`Play ${artistName}`}
                                                className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-black/80 hover:bg-black hover:scale-105 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all"
                                            >
                                                <Play className="w-5 h-5 fill-current ml-0.5" />
                                            </button>
                                        </div>
                                        <h3 className="text-[14px] md:text-[15px] font-medium text-white mt-2.5 truncate max-w-full group-hover:underline">
                                            {artistName}
                                        </h3>
                                        <p className="text-[14px] text-white/70 mt-0.5">Artist</p>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-10 text-center space-y-2">
                                <Users className="w-9 h-9 text-white/30 mx-auto" />
                                <p className="text-sm font-medium text-white">No subscribed artists yet</p>
                                <p className="text-xs text-white/60">Subscribe to artists to keep them in your library.</p>
                            </div>
                        )}
                    </section>
                )}

                {/* 4. Songs (Liked Tracks) */}
                {showSongs && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <h2
                                className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Songs
                            </h2>
                            {sortedLiked.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => playTrack(sortedLiked[0], sortedLiked)}
                                    className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 inline-flex items-center gap-2 transition"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Play all</span>
                                </button>
                            )}
                        </div>

                        {sortedLiked.length > 0 ? (
                            <div className="space-y-0.5">
                                {visibleLikes.map((track, i) => (
                                    <TrackRow
                                        key={`lib-like-${track.id}-${i}`}
                                        track={track}
                                        queue={sortedLiked}
                                    />
                                ))}
                                {hasMoreLikes && (
                                    <>
                                        <div ref={likesSentinelRef} className="pt-2" aria-hidden>
                                            <Skeleton className="h-14 w-full rounded-[6px]" />
                                        </div>
                                        <p className="text-center text-xs text-white/50 pt-1">
                                            Showing {visibleLikes.length} of {totalLikes} songs
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-10 text-center space-y-3">
                                <Music className="w-9 h-9 text-white/30 mx-auto" />
                                <p className="text-base font-bold text-white">Explore your favorites</p>
                                <p className="text-sm text-white/60">Like songs to build your Liked Music collection.</p>
                                <Link
                                    to="/feed"
                                    className="inline-flex items-center justify-center h-9 px-5 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                >
                                    Explore music
                                </Link>
                            </div>
                        )}
                    </section>
                )}

                {/* 5. Listening History */}
                {showRecent && (
                    <section className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <h2
                                className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                History
                            </h2>
                            {recent.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => playTrack(recent[0], recent)}
                                    className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                >
                                    Play all
                                </button>
                            )}
                        </div>

                        {recent.length > 0 ? (
                            <div className="space-y-0.5">
                                {visibleRecent.map((track, i) => (
                                    <TrackRow
                                        key={`lib-recent-${track.id}-${i}`}
                                        track={track}
                                        queue={playHistory}
                                    />
                                ))}
                                {hasMoreRecent && (
                                    <>
                                        <div ref={recentSentinelRef} className="pt-2" aria-hidden>
                                            <Skeleton className="h-14 w-full rounded-[6px]" />
                                        </div>
                                        <p className="text-center text-xs text-white/50 pt-1">
                                            Showing {visibleRecent.length} of {totalRecent} recent songs
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-10 text-center space-y-2">
                                <Clock className="w-9 h-9 text-white/30 mx-auto" />
                                <p className="text-sm font-medium text-white">No listening history yet</p>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <CreatePlaylistModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreatePlaylist}
            />

            <ConfirmDialog
                isOpen={Boolean(confirmDelete)}
                title="Delete playlist?"
                message={
                    confirmDelete
                        ? `Permanently delete "${confirmDelete.title}"? This action cannot be undone.`
                        : ''
                }
                confirmLabel="Delete"
                busy={deleting}
                onConfirm={handleConfirmDeleteOwned}
                onCancel={() => {
                    if (!deleting) setConfirmDelete(null);
                }}
            />
        </div>
    );
}
