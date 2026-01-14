"use client";

import { useState } from "react";
import { dbService } from "@/services/db";
import { useLibrary } from "@/context/LibraryContext";
import Link from "next/link";
import { Plus } from "lucide-react";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import CoverImage from "@/components/CoverImage";

export default function LibraryPage() {
    const { userPlaylists: playlists, libraryItems, refreshLibrary: refresh, activeFilter: activeTab, setActiveFilter: setActiveTab } = useLibrary();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refresh();
    };

    const showPlaylists = activeTab === 'all' || activeTab === 'playlists';
    const showAlbums = activeTab === 'all' || activeTab === 'albums';
    const showArtists = activeTab === 'all' || activeTab === 'artists';

    // Filter items based on type
    const albums = libraryItems.filter(item => item.type === 'Album');
    const artists = libraryItems.filter(item => item.type === 'Artist');
    const browsePlaylists = libraryItems.filter(item => item.type === 'Playlist');

    return (
        <div className="bg-gradient-to-b from-[#1e1e1e] to-black min-h-screen p-4 pb-24">
            <div className="flex justify-between items-center mb-6 pt-4">
                <h1 className="text-2xl font-bold text-white">Your Library</h1>
                <button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="text-white w-6 h-6" />
                </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap ${activeTab === 'all' ? 'bg-[#2a2a2a] text-white border-white/10' : 'bg-[#121212] text-spotify-text-muted border-white/5'}`}
                >
                    All
                </button>
                <button
                    onClick={() => setActiveTab('playlists')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap ${activeTab === 'playlists' ? 'bg-[#2a2a2a] text-white border-white/10' : 'bg-[#121212] text-spotify-text-muted border-white/5'}`}
                >
                    Playlists
                </button>
                <button
                    onClick={() => setActiveTab('albums')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap ${activeTab === 'albums' ? 'bg-[#2a2a2a] text-white border-white/10' : 'bg-[#121212] text-spotify-text-muted border-white/5'}`}
                >
                    Albums
                </button>
                <button
                    onClick={() => setActiveTab('artists')}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition whitespace-nowrap ${activeTab === 'artists' ? 'bg-[#2a2a2a] text-white border-white/10' : 'bg-[#121212] text-spotify-text-muted border-white/5'}`}
                >
                    Artists
                </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                {/* Playlists & Liked Songs */}
                {showPlaylists && (
                    <>
                        <Link href="/collection/tracks">
                            <div className="bg-gradient-to-br from-indigo-700 to-blue-500 rounded-md p-4 aspect-square flex flex-col justify-end relative overflow-hidden shadow-lg">
                                <h3 className="text-white font-bold text-lg z-10">Liked Songs</h3>
                                <p className="text-white/80 text-xs z-10">Auto-generated</p>
                            </div>
                        </Link>

                        {playlists.map((playlist) => (
                            <Link href={`/playlist?id=${playlist.id}`} key={playlist.id}>
                                <div className="bg-[#181818] p-2 md:p-3 rounded-md hover:bg-[#282828] transition aspect-[3/4] flex flex-col">
                                    <div className="aspect-square w-full mb-2 md:mb-3 overflow-hidden rounded-md shadow-lg">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full h-full object-cover"
                                            fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                        />
                                    </div>
                                    <h3 className="text-white font-bold text-xs md:text-sm truncate">{playlist.title}</h3>
                                    <p className="text-[#a7a7a7] text-[10px] md:text-xs">Playlist • You</p>
                                </div>
                            </Link>
                        ))}

                        {browsePlaylists.map((playlist) => (
                            <Link href={`/playlist?id=${playlist.id}`} key={playlist.id}>
                                <div className="bg-[#181818] p-2 md:p-3 rounded-md hover:bg-[#282828] transition aspect-[3/4] flex flex-col">
                                    <div className="aspect-square w-full mb-2 md:mb-3 overflow-hidden rounded-md shadow-lg">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full h-full object-cover"
                                            fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                        />
                                    </div>
                                    <h3 className="text-white font-bold text-xs md:text-sm truncate">{playlist.title}</h3>
                                    <p className="text-[#a7a7a7] text-[10px] md:text-xs">Playlist • Made for you</p>
                                </div>
                            </Link>
                        ))}
                    </>
                )}

                {/* Artists Content (Circular Images) */}
                {showArtists && artists.map((artist) => (
                    <Link href={`/artist?name=${encodeURIComponent(artist.title)}`} key={artist.id}>
                        <div className="bg-[#181818] p-2 md:p-3 rounded-md hover:bg-[#282828] transition aspect-[3/4] flex flex-col items-center text-center">
                            <div className="aspect-square w-full mb-2 md:mb-3 overflow-hidden rounded-full shadow-lg">
                                <CoverImage
                                    src={artist.cover_url}
                                    alt={artist.title}
                                    className="w-full h-full object-cover rounded-full"
                                    fallbackText={artist.title?.substring(0, 2).toUpperCase()}
                                />
                            </div>
                            <h3 className="text-white font-bold text-xs md:text-sm truncate w-full">{artist.title}</h3>
                            <p className="text-[#a7a7a7] text-[10px] md:text-xs">Artist</p>
                        </div>
                    </Link>
                ))}

                {/* Albums Content */}
                {showAlbums && albums.map((album) => (
                    <Link href={`/playlist?id=${album.id}`} key={album.id}>
                        <div className="bg-[#181818] p-2 md:p-3 rounded-md hover:bg-[#282828] transition aspect-[3/4] flex flex-col">
                            <div className="aspect-square w-full mb-2 md:mb-3 overflow-hidden rounded-md shadow-lg">
                                <CoverImage
                                    src={album.cover_url}
                                    alt={album.title}
                                    className="w-full h-full object-cover"
                                    fallbackText={album.title?.substring(0, 2).toUpperCase()}
                                />
                            </div>
                            <h3 className="text-white font-bold text-xs md:text-sm truncate">{album.title}</h3>
                            <p className="text-[#a7a7a7] text-[10px] md:text-xs">Album • {album.creator || 'Spotify'}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />
        </div>
    );
}
