import { useState } from 'react';
import { Home, Compass, Library, Plus, Trash2, Heart, Music } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { useLayout } from '../context/LayoutContext';
import CreatePlaylistModal from './CreatePlaylistModal';
import { dbService } from '../services/db';
import CoverImage from './CoverImage';

export default function Sidebar() {
    const { likedTracks } = usePlayer();
    const { userPlaylists, followedArtists, savedAlbums, refreshLibrary, activeFilter, setActiveFilter } = useLibrary();
    const { isSidebarOpen } = useLayout();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    const handleCreatePlaylist = async (name: string) => {
        const newPlaylist = await dbService.createPlaylist(name);
        refreshLibrary();
        setIsCreateModalOpen(false);
        if (newPlaylist) navigate(`/playlist/${newPlaylist.id}`);
    };

    const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this playlist?')) {
            await dbService.deletePlaylist(id);
            refreshLibrary();
        }
    };

    const showPlaylists = activeFilter === 'all' || activeFilter === 'playlists';
    const showArtists = activeFilter === 'all' || activeFilter === 'artists';
    const showAlbums = activeFilter === 'all' || activeFilter === 'albums';

    if (!isSidebarOpen) return null;

    return (
        <aside className="hidden fold:flex flex-col w-[260px] h-full bg-[#121212] border-r border-white/[0.06] flex-shrink-0 overflow-hidden select-none animate-in slide-in-from-left duration-200">
            {/* Quick Nav */}
            <div className="px-3 pt-3 pb-2">
                <div className="flex flex-col gap-0.5">
                    {[
                        { to: '/', icon: Home, label: 'Home' },
                        { to: '/explore', icon: Compass, label: 'Explore' },
                        { to: '/library', icon: Library, label: 'Library' },
                    ].map(({ to, icon: Icon, label }) => (
                        <Link
                            key={to}
                            to={to}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition ${
                                isActive(to)
                                    ? 'bg-white/10 text-white'
                                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Icon className="w-[18px] h-[18px] flex-shrink-0 opacity-70" />
                            <span>{label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="h-px bg-white/[0.06] mx-3" />

            {/* Liked Songs */}
            <div className="px-3 py-2">
                <Link to="/collection/tracks" className="block group">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                        isActive('/collection/tracks')
                            ? 'bg-white/10'
                            : 'hover:bg-white/5'
                    }`}>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                            <Heart className="w-4 h-4 text-white fill-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[13px] font-semibold text-white truncate">Liked Songs</h3>
                            <p className="text-[11px] text-neutral-500">{likedTracks.size} songs</p>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="h-px bg-white/[0.06] mx-3" />

            {/* Library Content */}
            <div className="flex-1 flex flex-col overflow-hidden pt-2">
                {/* Section Header + Filter */}
                <div className="px-3 mb-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Your Library</span>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="p-1 -mr-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/10 transition"
                            title="Create Playlist"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-1.5">
                        {(['Playlists', 'Artists', 'Albums'] as const).map((filter) => {
                            const key = filter.toLowerCase() as 'playlists' | 'artists' | 'albums';
                            const active = activeFilter === key;
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(active ? 'all' : key)}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                                        active
                                            ? 'bg-white text-black'
                                            : 'bg-white/[0.06] text-neutral-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {filter}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="space-y-0.5">
                        {/* Playlists */}
                        {showPlaylists && userPlaylists.map((playlist) => {
                            const active = isActive(`/playlist/${playlist.id}`);
                            return (
                                <div key={playlist.id} className={`group relative rounded-lg transition ${active ? 'bg-white/10' : ''}`}>
                                    <Link
                                        to={`/playlist/${playlist.id}`}
                                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition"
                                    >
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-9 h-9 rounded-md flex-shrink-0 object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[13px] font-medium text-white truncate">{playlist.title}</h3>
                                            <p className="text-[11px] text-neutral-500">Playlist</p>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-white rounded-md hover:bg-white/10 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}

                        {/* Artists */}
                        {showArtists && followedArtists.map((artistName) => (
                            <Link
                                key={artistName}
                                to={`/artist/${encodeURIComponent(artistName)}`}
                                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition"
                            >
                                <CoverImage
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=random&color=fff&size=128&rounded=true&bold=true&font-size=0.33`}
                                    alt={artistName}
                                    className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                                    fallbackText={artistName?.substring(0, 2).toUpperCase()}
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[13px] font-medium text-white truncate">{artistName}</h3>
                                    <p className="text-[11px] text-neutral-500">Artist</p>
                                </div>
                            </Link>
                        ))}

                        {/* Albums */}
                        {showAlbums && savedAlbums.map((album) => (
                            <Link
                                key={album.id}
                                to={`/album/${album.id}`}
                                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition"
                            >
                                <CoverImage
                                    src={album.cover_url}
                                    alt={album.title}
                                    className="w-9 h-9 rounded-md flex-shrink-0 object-cover"
                                    fallbackText="&#128191;"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[13px] font-medium text-white truncate">{album.title}</h3>
                                    <p className="text-[11px] text-neutral-500 truncate">{album.artist || 'Album'}</p>
                                </div>
                            </Link>
                        ))}

                        {/* Empty state */}
                        {userPlaylists.length === 0 && followedArtists.length === 0 && savedAlbums.length === 0 && (
                            <div className="text-center py-8 px-4">
                                <Music className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                                <p className="text-xs text-neutral-500">Nothing here yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />
        </aside>
    );
}
