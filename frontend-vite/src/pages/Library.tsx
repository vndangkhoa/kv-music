import { Link } from 'react-router-dom';
import { Music, Disc3, Users, Heart, Clock, Play, Trash2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import CoverImage from '../components/CoverImage';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import { dbService } from '../services/db';
import { getArtistCoverUrl } from '../services/library';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

type LibraryFilter = 'all' | 'liked' | 'playlists' | 'albums' | 'artists' | 'recent';

export default function Library() {
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const followedArtists = useLibraryStore(s => s.followedArtists);
    const savedAlbums = useLibraryStore(s => s.savedAlbums);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const hydrateSeedTracks = useLibraryStore(s => s.hydrateSeedTracks);
    const deriveSavedAlbums = useLibraryStore(s => s.deriveSavedAlbums);
    const activeFilter = useLibraryStore(s => s.activeFilter);
    const setActiveFilter = useLibraryStore(s => s.setActiveFilter);

    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playHistory = usePlayerStore(s => s.playHistory);
    const playTrack = usePlayerStore(s => s.playTrack);

    const startAutoSync = useLibraryStore(s => s.startAutoSync);
    const isSyncing = useLibraryStore(s => s.isSyncing);

    const { containerRef, pullProps, indicator } = usePullToRefresh(refreshLibrary);

    useEffect(() => {
        refreshLibrary();
        hydrateSeedTracks();
        deriveSavedAlbums(playHistory);

        const stopSync = startAutoSync();
        return () => stopSync();
    }, []);

    const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this playlist from your library?')) {
            await dbService.deletePlaylist(id);
            refreshLibrary();
        }
    };

    const tabs: { key: LibraryFilter; label: string; icon: typeof Music; count: number }[] = [
        { key: 'all', label: 'Overview', icon: Music, count: userPlaylists.length + savedAlbums.length + followedArtists.length + likedTracksData.length },
        { key: 'liked', label: 'Likes', icon: Heart, count: likedTracksData.length },
        { key: 'playlists', label: 'Playlists', icon: Music, count: userPlaylists.length },
        { key: 'albums', label: 'Albums', icon: Disc3, count: savedAlbums.length },
        { key: 'artists', label: 'Following', icon: Users, count: followedArtists.length },
        { key: 'recent', label: 'History', icon: Clock, count: playHistory.length },
    ];

    const filter = activeFilter as LibraryFilter;
    const showPlaylists = filter === 'all' || filter === 'playlists';
    const showLiked = filter === 'all' || filter === 'liked';
    const showAlbums = filter === 'all' || filter === 'albums';
    const showArtists = filter === 'all' || filter === 'artists';
    const showRecent = filter === 'all' || filter === 'recent';

    const playAllLiked = () => {
        if (likedTracksData.length > 0) playTrack(likedTracksData[0], likedTracksData);
    };

    const recent = playHistory.slice(0, 10);

    return (
        <div className="min-h-full text-white bg-[#121212]">
            <div
                ref={containerRef}
                {...pullProps}
                className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6 overflow-y-auto no-scrollbar"
                style={{ minHeight: '100%' }}
            >
                {indicator}

                {/* SoundCloud Library Header & Sub-nav Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Library</h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff5500]/10 border border-[#ff5500]/30 text-[#ff5500] text-[10px] font-extrabold uppercase tracking-wider">
                            <span className={`w-1.5 h-1.5 rounded-full bg-[#ff5500] ${isSyncing ? 'animate-ping' : ''}`} />
                            Always Fresh
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        {tabs.map(({ key, label, count }) => (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key as any)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition ${
                                    filter === key
                                        ? 'bg-[#ff5500] text-white shadow-md'
                                        : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                                }`}
                            >
                                {label} ({count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2-Column Responsive Layout */}
                <div className="flex gap-8">
                    {/* Left Column Content */}
                    <div className="flex-1 min-w-0 space-y-8">
                    {/* 1. Likes Section */}
                    {showLiked && (
                        <section>
                            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-[#ff5500]" fill="currentColor" />
                                    <h2 className="text-lg font-extrabold text-white">Likes</h2>
                                </div>
                                {likedTracksData.length > 0 && (
                                    <button
                                        onClick={playAllLiked}
                                        className="flex items-center gap-1.5 px-4 py-1 bg-[#ff5500] hover:bg-[#ff7a00] text-white text-xs font-bold rounded-full transition active:scale-95 shadow"
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                        Play All
                                    </button>
                                )}
                            </div>
                            {likedTracksData.length > 0 ? (
                                <div className="space-y-3">
                                    {likedTracksData.map((track, i) => (
                                        <SoundCloudTrackCard key={`${track.id}-${i}`} track={track} queue={likedTracksData} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#181818] border border-white/10 rounded-xl p-8 text-center space-y-2">
                                    <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
                                    <p className="text-sm font-bold text-neutral-300">No liked tracks yet</p>
                                    <p className="text-xs text-neutral-500">Tap the heart on any track to save it here</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 2. Playlists Section */}
                    {showPlaylists && (
                        <section>
                            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
                                <div className="flex items-center gap-2">
                                    <Music className="w-5 h-5 text-[#ff5500]" />
                                    <h2 className="text-lg font-extrabold text-white">Featured & User Playlists</h2>
                                </div>
                            </div>
                            {userPlaylists.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {userPlaylists.map((playlist) => (
                                        <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="group flex flex-col bg-[#181818] hover:bg-[#202020] p-3 rounded-xl border border-white/5 hover:border-white/20 transition shadow-sm">
                                            <div className="relative mb-3 overflow-hidden rounded-lg aspect-square bg-neutral-900">
                                                <CoverImage
                                                    src={playlist.cover_url}
                                                    alt={playlist.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                    fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-[#ff5500] text-white rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition">
                                                        <Play className="w-6 h-6 fill-current ml-0.5" />
                                                    </div>
                                                </div>

                                                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-full text-[10px] font-extrabold text-white">
                                                    {playlist.tracks?.length || 0} tracks
                                                </span>

                                                {!playlist.id.startsWith('playlist-') && !playlist.id.startsWith('discovery-') && (
                                                    <button
                                                        onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                                        className="absolute top-2 right-2 w-7 h-7 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                                                        title="Delete Playlist"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <h3 className="font-extrabold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-[#ff5500] transition">{playlist.title}</h3>
                                            <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1 font-medium">{playlist.description || 'SoundCloud Playlist'}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#181818] border border-white/10 rounded-xl p-8 text-center space-y-3">
                                    <Music className="w-10 h-10 text-neutral-600 mx-auto" />
                                    <p className="text-sm font-bold text-neutral-300">No playlists found</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 3. Albums Section */}
                    {showAlbums && (
                        <section>
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
                                <Disc3 className="w-5 h-5 text-[#ff5500]" />
                                <h2 className="text-lg font-extrabold text-white">Saved Albums</h2>
                            </div>
                            {savedAlbums.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {savedAlbums.map((album) => (
                                        <Link to={`/album/${encodeURIComponent(album.title)}`} key={album.id} className="group flex flex-col bg-[#181818] hover:bg-[#202020] p-3 rounded-xl border border-white/5 hover:border-white/20 transition shadow-sm">
                                            <div className="relative mb-3 overflow-hidden rounded-lg aspect-square bg-neutral-900">
                                                <CoverImage
                                                    src={album.cover_url}
                                                    alt={album.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                    fallbackText={album.title?.substring(0, 2).toUpperCase()}
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-[#ff5500] text-white rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition">
                                                        <Play className="w-6 h-6 fill-current ml-0.5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="font-extrabold text-white text-xs sm:text-sm line-clamp-1 group-hover:text-[#ff5500] transition">{album.title}</h3>
                                            <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1 font-medium">{album.artist}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#181818] border border-white/10 rounded-xl p-8 text-center space-y-2">
                                    <Disc3 className="w-8 h-8 text-neutral-600 mx-auto" />
                                    <p className="text-sm font-bold text-neutral-300">No albums saved</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 4. Following Artists Section */}
                    {showArtists && (
                        <section>
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
                                <Users className="w-5 h-5 text-[#ff5500]" />
                                <h2 className="text-lg font-extrabold text-white">Following Creators ({followedArtists.length})</h2>
                            </div>
                            {followedArtists.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                    {followedArtists.map((artistName) => (
                                        <Link to={`/artist/${encodeURIComponent(artistName)}`} key={artistName} className="group text-center flex flex-col items-center bg-[#181818] hover:bg-[#202020] p-3 rounded-xl border border-white/5 hover:border-white/20 transition">
                                            <CoverImage
                                                src={getArtistCoverUrl(artistName)}
                                                alt={artistName}
                                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-white/10 group-hover:border-[#ff5500] transition shadow"
                                                fallbackText={artistName?.substring(0, 2).toUpperCase()}
                                            />
                                            <h3 className="font-extrabold text-white truncate text-xs mt-2.5 group-hover:text-[#ff5500] transition max-w-full">{artistName}</h3>
                                            <span className="text-[10px] text-[#ff5500] font-semibold flex items-center gap-1 mt-0.5">
                                                <CheckCircle2 className="w-3 h-3" /> Creator
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#181818] border border-white/10 rounded-xl p-8 text-center space-y-2">
                                    <Users className="w-8 h-8 text-neutral-600 mx-auto" />
                                    <p className="text-sm font-bold text-neutral-300">Not following any creators yet</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 5. History Section */}
                    {showRecent && (
                        <section>
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
                                <Clock className="w-5 h-5 text-[#ff5500]" />
                                <h2 className="text-lg font-extrabold text-white">Listening History</h2>
                            </div>
                            {recent.length > 0 ? (
                                <div className="space-y-3">
                                    {recent.map((track, i) => (
                                        <SoundCloudTrackCard key={`recent-${track.id}-${i}`} track={track} queue={playHistory} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#181818] border border-white/10 rounded-xl p-8 text-center space-y-2">
                                    <Clock className="w-8 h-8 text-neutral-600 mx-auto" />
                                    <p className="text-sm font-bold text-neutral-300">No listening history yet</p>
                                </div>
                            )}
                        </section>
                    )}
                    </div>

                    {/* Right Desktop Sidebar */}
                    <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
                        <SoundCloudSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
}
