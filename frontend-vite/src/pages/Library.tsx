import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Music, Disc3, Users, Clock, Sparkles, Flame, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { useAuthStore } from '../stores/authStore';
import CoverImage from '../components/CoverImage';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { dbService } from '../services/db';
import LoginModal from '../components/LoginModal';
import { libraryService, getArtistCoverUrl } from '../services/library';
import { StaticPlaylist } from '../types';
import Skeleton from '../components/Skeleton';

interface GradientColor {
    from: string;
    to: string;
}

function getAvatarGradient(avatarColor: string): string {
    try {
        const parsed: GradientColor = JSON.parse(avatarColor);
        return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
    } catch {
        return 'linear-gradient(135deg, #ff6b6b, #ee5a24)';
    }
}

export default function Library() {
    const navigate = useNavigate();
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const followedArtists = useLibraryStore(s => s.followedArtists);
    const savedAlbums = useLibraryStore(s => s.savedAlbums);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const hydrateSeedTracks = useLibraryStore(s => s.hydrateSeedTracks);
    const activeFilter = useLibraryStore(s => s.activeFilter);
    const setActiveFilter = useLibraryStore(s => s.setActiveFilter);
    const deriveSavedAlbums = useLibraryStore(s => s.deriveSavedAlbums);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const playHistory = usePlayerStore(s => s.playHistory);
    const user = useAuthStore(s => s.user);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
    const [browseLoading, setBrowseLoading] = useState(false);

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refreshLibrary();
    };

    useEffect(() => {
        refreshLibrary();
        hydrateSeedTracks();
        deriveSavedAlbums(playHistory);
    }, []);

    // Auto-refresh library every 15 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            refreshLibrary();
            deriveSavedAlbums(playHistory);
        }, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const userLibraryItems = userPlaylists.length + followedArtists.length + savedAlbums.length;

    useEffect(() => {
        if (Object.keys(browseData).length === 0) {
            setBrowseLoading(true);
            libraryService.getBrowseContent()
                .then(data => {
                    setBrowseData(data);
                    setBrowseLoading(false);
                })
                .catch(() => setBrowseLoading(false));
        }
    }, []);

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'playlists', label: 'Playlists' },
        { key: 'artists', label: 'Artists' },
        { key: 'albums', label: 'Albums' },
    ] as const;

    const showAll = activeFilter === 'all';
    const showPlaylists = showAll || activeFilter === 'playlists';
    const showArtists = showAll || activeFilter === 'artists';
    const showAlbums = showAll || activeFilter === 'albums';

    const totalItems = userPlaylists.length + followedArtists.length + savedAlbums.length + likedTracks.size;

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-24">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl md:text-3xl font-bold">Your Library</h1>
                    <button onClick={() => navigate('/search')} className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full transition">
                        <Search className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {filters.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setActiveFilter(filter.key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeFilter === filter.key ? 'bg-white text-black' : 'bg-spotify-card text-white hover:bg-spotify-card-hover'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Header - Only when logged in */}
            {isLoggedIn && user && (
                <div className="mb-6 flex items-center gap-4 p-4 bg-[#1a1a2e]/60 backdrop-blur-sm rounded-2xl border border-white/5">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
                        style={{ background: getAvatarGradient(user.avatarColor) }}
                    >
                        {user.name.trim()[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-white truncate">{user.name}</h2>
                        <p className="text-sm text-neutral-400">Your music at a glance</p>
                    </div>
                    <div className="hidden md:flex gap-6 text-center">
                        <div>
                            <p className="text-lg font-bold text-white">{likedTracks.size}</p>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Liked</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{userPlaylists.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Playlists</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{followedArtists.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Artists</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-white">{playHistory.length}</p>
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider">History</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Logged out prompt */}
            {!isLoggedIn && (
                <div className="mb-6 p-6 bg-[#1a1a2e]/40 backdrop-blur-sm rounded-2xl border border-white/5 text-center">
                    <p className="text-neutral-400 mb-3">Sign in to see your full library stats</p>
                    <button
                        onClick={() => setIsLoginOpen(true)}
                        className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition text-sm"
                    >
                        Create Profile
                    </button>
                </div>
            )}

            {/* Create Playlist Button - Compact */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-spotify-card hover:bg-spotify-card-hover rounded-full transition text-sm font-medium border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Playlist</span>
                </button>
            </div>

            {/* Liked Songs Card */}
            {showPlaylists && (
                <Link to="/collection/tracks">
                    <div className="mb-4 flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-800/30 to-blue-600/30 rounded-lg hover:from-indigo-800/50 hover:to-blue-600/50 transition group cursor-pointer">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-700 to-blue-300 rounded flex items-center justify-center shadow-lg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg">Liked Songs</h3>
                            <p className="text-sm text-neutral-400">{likedTracks.size} songs</p>
                        </div>
                        <div className="w-12 h-12 bg-[#FF0000] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                </Link>
            )}

            {/* Your Playlists Section */}
            {showPlaylists && userPlaylists.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Your Playlists</h2>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {userPlaylists.map((playlist) => (
                            <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                                <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer border border-white/5 relative h-full flex flex-col justify-between">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white truncate text-[11px] md:text-base">{playlist.title}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 line-clamp-1">
                                        {playlist.tracks.length > 0
                                            ? `${playlist.tracks.length} songs`
                                            : playlist.id.startsWith('discovery-') ? 'Playlist' : `${playlist.tracks.length} songs`
                                        }
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Followed Artists Section */}
            {showArtists && followedArtists.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Followed Artists</h2>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {followedArtists.map((artistName) => (
                            <Link to={`/artist/${encodeURIComponent(artistName)}`} key={artistName}>
                                <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer border border-white/5 relative h-full flex flex-col justify-between">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={getArtistCoverUrl(artistName)}
                                            alt={artistName}
                                            className="w-full aspect-square rounded-full shadow-lg"
                                            fallbackText={artistName?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full flex items-center justify-center">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white truncate text-[11px] md:text-base">{artistName}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 capitalize line-clamp-1">Artist</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Saved Albums Section */}
            {showAlbums && savedAlbums.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Saved Albums</h2>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {savedAlbums.map((album) => (
                            <Link to={`/album/${album.id}`} key={album.id}>
                                <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer border border-white/5 relative h-full flex flex-col justify-between">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={album.cover_url}
                                            alt={album.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={album.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white truncate text-[11px] md:text-base">{album.title}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 capitalize line-clamp-1">{album.artist}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Recently Played Section */}
            {(showAll || activeFilter === 'playlists' || showAlbums) && playHistory.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Recently Played</h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {playHistory.slice(0, 12).map((track, index) => (
                            <div key={`${track.id}-${index}`} className="flex-shrink-0 w-[140px] md:w-[160px]">
                                <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer border border-white/5">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={track.cover_url}
                                            alt={track.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={track.title?.substring(0, 2).toUpperCase()}
                                        />
                                    </div>
                                    <h3 className="font-bold text-white truncate text-[11px] md:text-sm">{track.title}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 truncate">{track.artist}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Browse Content (always shown) */}
            {browseLoading ? (
                <div className="space-y-8">
                    {[1, 2].map(i => (
                        <div key={i}>
                            <Skeleton className="h-8 w-48 mb-4" />
                            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="space-y-3">
                                        <Skeleton className="w-full aspect-square rounded-2xl" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : Object.keys(browseData).length > 0 ? (
                Object.entries(browseData)
                    .filter(([, items]) => items.length > 0)
                    .slice(0, 4)
                    .map(([category, items]) => (
                        <div key={category} className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                {category.toLowerCase().includes('playlist') ? <Flame className="w-5 h-5 text-orange-400" /> :
                                 category.toLowerCase().includes('album') ? <Disc3 className="w-5 h-5 text-blue-400" /> :
                                 <Sparkles className="w-5 h-5 text-purple-400" />}
                                <h2 className="text-xl font-bold">{category}</h2>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {items.slice(0, 8).map((item: any) => (
                                    <Link to={`/playlist/${item.id}`} key={item.id}>
                                        <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer h-full flex flex-col border border-white/5">
                                            <div className="relative mb-3">
                                                <CoverImage src={item.cover_url} alt={item.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={item.title?.substring(0, 2).toUpperCase()} />
                                            </div>
                                            <h3 className="font-bold text-white text-sm mb-0.5 truncate">{item.title}</h3>
                                            <p className="text-xs text-neutral-400 line-clamp-2">{item.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))
            ) : userLibraryItems === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 mx-auto mb-4 bg-[#282828] rounded-full flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Your library is empty</h2>
                    <p className="text-neutral-400 mb-6">Create a playlist or listen to music to build your library.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                    >
                        Create Playlist
                    </button>
                </div>
            ) : null}

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </div>
    );
}
