import { Home, Search, Library, Plus, Heart, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useState } from "react";
import CreatePlaylistModal from "./CreatePlaylistModal";
import { dbService } from "../services/db";
import Logo from "./Logo";
import CoverImage from "./CoverImage";
import SettingsModal from "./SettingsModal";

export default function Sidebar() {
    const { likedTracks } = usePlayer();
    const { userPlaylists, libraryItems, refreshLibrary, activeFilter, setActiveFilter } = useLibrary();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refreshLibrary();
    };

    const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Delete this playlist?")) {
            await dbService.deletePlaylist(id);
            refreshLibrary();
        }
    };

    // Filtering Logic
    const showPlaylists = activeFilter === 'all' || activeFilter === 'playlists';
    const showArtists = activeFilter === 'all' || activeFilter === 'artists';
    const showAlbums = activeFilter === 'all' || activeFilter === 'albums';

    const artists = libraryItems.filter(i => i.type === 'Artist');
    const albums = libraryItems.filter(i => i.type === 'Album');
    const browsePlaylists = libraryItems.filter(i => i.type === 'Playlist');

    return (
        <aside className="hidden fold:flex flex-col w-[240px] bg-spotify-sidebar backdrop-blur-xl border-r border-white/5 h-full gap-2 p-4 flex-shrink-0 transition-colors duration-500 z-50">
            <div className="flex flex-col gap-6">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-1 text-white hover:text-white transition cursor-pointer px-2">
                    <Logo />
                </Link>

                <div className="flex flex-col gap-2">
                    <Link
                        to="/"
                        className={`flex items-center gap-4 p-3 rounded-lg transition cursor-pointer font-medium ${isActive('/') ? 'bg-spotify-card-hover text-spotify-highlight' : 'text-neutral-400 hover:text-white hover:bg-spotify-card-hover'}`}
                    >
                        <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
                        <span>Home</span>
                    </Link>
                    <Link
                        to="/search"
                        className={`flex items-center gap-4 p-3 rounded-lg transition cursor-pointer font-medium ${isActive('/search') ? 'bg-spotify-card-hover text-spotify-highlight' : 'text-neutral-400 hover:text-white hover:bg-spotify-card-hover'}`}
                    >
                        <Search className={`w-6 h-6 ${isActive('/search') ? 'stroke-[2.5px]' : ''}`} />
                        <span>Search</span>
                    </Link>
                    <Link
                        to="/library"
                        className={`flex items-center gap-4 p-3 rounded-lg transition cursor-pointer font-medium ${isActive('/library') ? 'bg-spotify-card-hover text-spotify-highlight' : 'text-neutral-400 hover:text-white hover:bg-spotify-card-hover'}`}
                    >
                        <Library className={`w-6 h-6 ${isActive('/library') ? 'fill-current' : ''}`} />
                        <span>Library</span>
                    </Link>
                </div>
            </div>

            <div className="border-t border-white/10 my-2 mx-2"></div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-2 mb-4">
                    {/* Filters - YTM Style (Pills) */}
                    {/* Filters */}
                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                        {(['Playlists', 'Artists', 'Albums'] as const).map((filter) => {
                            const key = filter.toLowerCase() as 'playlists' | 'artists' | 'albums';
                            const isActive = activeFilter === key;
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(isActive ? 'all' : key)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition whitespace-nowrap ${isActive ? 'bg-white text-black' : 'bg-spotify-card text-white hover:bg-spotify-card-hover'}`}
                                >
                                    {filter}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 no-scrollbar">
                    {/* Liked Songs */}
                    {showPlaylists && (
                        <Link to="/collection/tracks">
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer group mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-blue-300 rounded flex items-center justify-center">
                                    <Heart className="w-6 h-6 text-white fill-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Liked Songs</h3>
                                    <p className="text-sm text-neutral-400">Playlist • {likedTracks.size} songs</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* User Playlists */}
                    {showPlaylists && userPlaylists.map((playlist) => (
                        <div key={playlist.id} className="group relative flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                            <Link to={`/playlist?id=${playlist.id}`} className="flex-1 flex items-center gap-3">
                                <CoverImage
                                    src={playlist.cover_url}
                                    alt={playlist.title || ''}
                                    className="w-12 h-12 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                                    <p className="text-sm text-neutral-400 truncate">Playlist • You</p>
                                </div>
                            </Link>
                            <button
                                onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                className="absolute right-2 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* Browse Playlists */}
                    {showPlaylists && browsePlaylists.slice(0, 10).map((playlist) => (
                        <div key={playlist.id} className="group relative flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                            <Link to={`/playlist?id=${playlist.id}`} className="flex-1 flex items-center gap-3">
                                <CoverImage
                                    src={playlist.cover_url}
                                    alt={playlist.title || ''}
                                    className="w-12 h-12 rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                                    <p className="text-sm text-neutral-400 truncate">Playlist • Made for you</p>
                                </div>
                            </Link>
                        </div>
                    ))}

                    {/* Artists */}
                    {showArtists && artists.slice(0, 10).map((artist) => (
                        <Link to={`/artist/${encodeURIComponent(artist.title)}`} key={artist.id}>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                                <CoverImage
                                    src={artist.cover_url}
                                    alt={artist.title}
                                    className="w-12 h-12 rounded-md"
                                    fallbackText={artist.title?.substring(0, 2).toUpperCase()}
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{artist.title}</h3>
                                    <p className="text-sm text-neutral-400 truncate">Artist</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Albums */}
                    {showAlbums && albums.slice(0, 10).map((album) => (
                        <Link to={`/search?q=${encodeURIComponent(album.title)}`} key={album.id}>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                                <CoverImage
                                    src={album.cover_url}
                                    alt={album.title}
                                    className="w-12 h-12 rounded"
                                    fallbackText="💿"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{album.title}</h3>
                                    <p className="text-sm text-neutral-400 truncate">Album • {album.creator || 'Spotify'}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Settings Section */}
            <div className="bg-spotify-card rounded-lg p-2 mt-auto">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-md transition-all duration-300 text-neutral-400 hover:text-white hover:bg-spotify-card-hover"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-bold">Settings</span>
                </button>
            </div>

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </aside>
    );
}
