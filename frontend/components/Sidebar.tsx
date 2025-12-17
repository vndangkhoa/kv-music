"use client";

import { Home, Search, Library, Plus, Heart } from "lucide-react";
import Link from "next/link";
import { usePlayer } from "@/context/PlayerContext";
import { useState } from "react";
import CreatePlaylistModal from "./CreatePlaylistModal";
import { dbService } from "@/services/db";
import { useLibrary } from "@/context/LibraryContext";

export default function Sidebar() {
    const { likedTracks } = usePlayer();
    const { userPlaylists, libraryItems, refreshLibrary: refresh, activeFilter, setActiveFilter } = useLibrary();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refresh();
    };

    const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Delete this playlist?")) {
            await dbService.deletePlaylist(id);
            refresh();
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
        <aside className="hidden md:flex flex-col w-[280px] bg-black h-full gap-2 p-2">
            <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
                <Link href="/" className="flex items-center gap-4 text-spotify-text-muted hover:text-white transition cursor-pointer">
                    <Home className="w-6 h-6" />
                    <span className="font-bold">Home</span>
                </Link>
                <Link href="/search" className="flex items-center gap-4 text-spotify-text-muted hover:text-white transition cursor-pointer">
                    <Search className="w-6 h-6" />
                    <span className="font-bold">Search</span>
                </Link>
            </div>

            <div className="bg-[#121212] rounded-lg flex-1 flex flex-col overflow-hidden">
                <div className="p-4 shadow-md z-10">
                    <div className="flex items-center justify-between text-spotify-text-muted mb-4">
                        <Link href="/library" className="flex items-center gap-2 hover:text-white transition cursor-pointer">
                            <Library className="w-6 h-6" />
                            <span className="font-bold">Your Library</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsCreateModalOpen(true)} className="hover:text-white hover:scale-110 transition">
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    {/* Filters */}
                    <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                        {['Playlists', 'Artists', 'Albums'].map((filter) => {
                            const key = filter.toLowerCase() as any;
                            const isActive = activeFilter === key;
                            return (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(isActive ? 'all' : key)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition whitespace-nowrap ${isActive ? 'bg-white text-black' : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'}`}
                                >
                                    {filter}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 no-scrollbar">
                    {/* Liked Songs (Always top if 'Playlists' or 'All') */}
                    {showPlaylists && (
                        <Link href="/collection/tracks">
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer group mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-blue-300 rounded flex items-center justify-center">
                                    <Heart className="w-6 h-6 text-white fill-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Liked Songs</h3>
                                    <p className="text-sm text-spotify-text-muted">Playlist • {likedTracks.size} songs</p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* User Playlists */}
                    {showPlaylists && userPlaylists.map((playlist) => (
                        <div key={playlist.id} className="group relative flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                            <Link href={`/playlist?id=${playlist.id}`} className="flex-1 flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center overflow-hidden">
                                    {playlist.cover_url && !playlist.cover_url.includes("placehold") ? (
                                        <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl">🎵</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                                    <p className="text-sm text-spotify-text-muted truncate">Playlist • You</p>
                                </div>
                            </Link>
                            <button
                                onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                                className="absolute right-2 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* Fake/Browse Playlists */}
                    {showPlaylists && browsePlaylists.map((playlist) => (
                        <div key={playlist.id} className="group relative flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                            <Link href={`/playlist?id=${playlist.id}`} className="flex-1 flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center overflow-hidden">
                                    {playlist.cover_url && !playlist.cover_url.includes("placehold") ? (
                                        <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl">🎵</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{playlist.title}</h3>
                                    <p className="text-sm text-spotify-text-muted truncate">Playlist • Made for you</p>
                                </div>
                            </Link>
                        </div>
                    ))}

                    {/* Artists */}
                    {showArtists && artists.map((artist) => (
                        <Link href={`/search?q=${encodeURIComponent(artist.title)}`} key={artist.id}>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                                <div className="w-12 h-12 bg-[#282828] rounded-full flex items-center justify-center overflow-hidden relative">
                                    {artist.cover_url ? (
                                        <img src={artist.cover_url} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    ) : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{artist.title}</h3>
                                    <p className="text-sm text-spotify-text-muted truncate">Artist</p>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Albums */}
                    {showAlbums && albums.map((album) => (
                        <Link href={`/ search ? q = ${encodeURIComponent(album.title)} `} key={album.id}>
                            <div className="flex items-center gap-3 p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer">
                                <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center overflow-hidden relative">
                                    {album.cover_url ? (
                                        <img src={album.cover_url} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                                    ) : (
                                        <span className="text-xl">💿</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium truncate">{album.title}</h3>
                                    <p className="text-sm text-spotify-text-muted truncate">Album • {album.creator || 'Spotify'}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
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

