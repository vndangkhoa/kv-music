import { Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import CoverImage from '../components/CoverImage';
import CreatePlaylistModal from '../components/CreatePlaylistModal';
import { dbService } from '../services/db';
import { libraryService } from '../services/library';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import Skeleton from '../components/Skeleton';

export default function Library() {
    const { userPlaylists, libraryItems, refreshLibrary, activeFilter, setActiveFilter } = useLibrary();
    const { likedTracks } = usePlayer();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Discovery State
    const [discoveryItems, setDiscoveryItems] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const handleCreatePlaylist = async (name: string) => {
        await dbService.createPlaylist(name);
        refreshLibrary();
    };

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'playlists', label: 'Playlists' },
        { key: 'artists', label: 'Artists' },
        { key: 'albums', label: 'Albums' },
    ] as const;

    // Filter Logic: Local Items
    const filteredLocalItems = useMemo(() => {
        return libraryItems.filter(item => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'playlists') return item.type === 'Playlist';
            if (activeFilter === 'artists') return item.type === 'Artist';
            if (activeFilter === 'albums') return item.type === 'Album';
            return true;
        });
    }, [libraryItems, activeFilter]);

    // Infinite Information
    const filteredDiscoveryItems = useMemo(() => {
        return discoveryItems.filter(item => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'playlists') return item.type === 'Playlist';
            if (activeFilter === 'artists') return item.type === 'Artist';
            if (activeFilter === 'albums') return item.type === 'Album';
            return true;
        });
    }, [discoveryItems, activeFilter]);

    const displayItems = [...filteredLocalItems, ...filteredDiscoveryItems];

    // Load More (Discovery)
    const loadMore = async () => {
        if (isFetching) return;
        setIsFetching(true);

        // Simulate network delay for UX
        await new Promise(r => setTimeout(r, 800));

        const moreContent = await libraryService.discoverContent(activeFilter);
        setDiscoveryItems(prev => [...prev, ...moreContent]);
        setIsFetching(false);
    };

    const lastElementRef = useInfiniteScroll(loadMore, isFetching);

    // Reset discovery on filter change? Optional, but maybe good to keep it fresh
    useEffect(() => {
        // We can keep discovery items but maybe filter them? 
        // Or clear them to finding new specific ones?
        // Let's clear to find specific ones if switching tabs.
        // setDiscoveryItems([]); 
        // Actually, let's just append. If I switch to Artists, I want artists.
        // But if I switch back to All, I want see what I had.
        // Simple approach: Keep them, but `discoverContent` takes type.
    }, [activeFilter]);

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-24">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-4">Your Library</h1>

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
            {(activeFilter === 'all' || activeFilter === 'playlists') && (
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
                        <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg">
                            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                        </div>
                    </div>
                </Link>
            )}

            {/* User Playlists */}
            {(activeFilter === 'all' || activeFilter === 'playlists') && userPlaylists.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3">Your Playlists</h2>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {userPlaylists.map((playlist) => (
                            <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                                <div className="bg-transparent md:bg-spotify-card p-0 md:p-3 rounded-xl hover:bg-spotify-card-hover transition group cursor-pointer">
                                    <div className="relative mb-2 md:mb-3">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg">
                                                <Play className="w-4 h-4 md:w-5 md:h-5 text-black fill-black ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold truncate text-[11px] md:text-base">{playlist.title}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 line-clamp-1">{playlist.tracks.length} songs</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Library Grid (Local + Discovery) */}
            {displayItems.length > 0 && (
                <div>
                    {(activeFilter === 'all' || activeFilter !== 'playlists') && <h2 className="text-lg font-bold mb-3">Saved & Discovered</h2>}
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {displayItems.map((item, index) => (
                            <Link
                                to={
                                    item.type === 'Playlist' ? `/playlist/${item.id}` :
                                        item.type === 'Artist' ? `/artist/${encodeURIComponent(item.title)}` :
                                            `/search?q=${encodeURIComponent(item.title)}` // Albums link to search for now as we don't have dedicated album page yet, wait we do have Album.tsx but routing might need check.
                                    // Actually Album.tsx exists.
                                    // item.type === 'Album' ? `/album/${item.id}` : ...
                                    // But item.id for discovery is random.
                                    // Let's stick to Search for generic album discovery navigation or update Album page to fetch by title.
                                    // Search is safest for discovered items.
                                }
                                key={`${item.id}-${index}`}
                                ref={index === displayItems.length - 1 ? lastElementRef : null}
                            >
                                <div className="bg-transparent md:bg-spotify-card p-0 md:p-3 rounded-xl hover:bg-spotify-card-hover transition group cursor-pointer h-full">
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={item.cover_url}
                                            alt={item.title}
                                            className={`w-full aspect-square shadow-lg rounded-xl`}
                                            fallbackText={item.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition">
                                            <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg">
                                                <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold truncate text-[11px] md:text-base">{item.title}</h3>
                                    <p className="text-[10px] md:text-xs text-neutral-400 capitalize line-clamp-1">{item.type}{item.creator ? ` • ${item.creator}` : ''}</p>
                                </div>
                            </Link>
                        ))}

                        {/* Loading Skeletons */}
                        {isFetching && Array.from({ length: 10 }).map((_, i) => (
                            <div key={`skel-${i}`} className="p-3">
                                <Skeleton className="w-full aspect-square rounded-md mb-3" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State (Only if absolutely nothing) */}
            {displayItems.length === 0 && userPlaylists.length === 0 && !isFetching && (
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
                    {/* Trigger discovery manually if empty */}
                    <button
                        onClick={loadMore}
                        className="block mx-auto mt-4 text-sm text-neutral-400 hover:text-white underline"
                    >
                        Browse Recommended
                    </button>
                </div>
            )}

            <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
            />
        </div>
    );
}
