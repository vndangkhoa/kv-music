import { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Play, Heart, PlusCircle, Loader2, Music2, Disc, User } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { libraryService } from '../services/library';
import { Track } from '../types';
import CoverImage from '../components/CoverImage';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import Skeleton from '../components/Skeleton';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

// Helper to extract unique items
function extractUniqueItems(tracks: Track[], key: 'artist' | 'album') {
    const seen = new Set();
    const items: { name: string, image?: string, id: string }[] = [];

    tracks.forEach(t => {
        const val = t[key];
        if (val && !seen.has(val)) {
            seen.add(val);
            items.push({
                name: val,
                image: t.cover_url, // Use track cover as proxy for now
                id: `${key}-${val}` // robust id
            });
        }
    });
    return items.slice(0, 5); // Limit to top 5
}

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const routerQuery = searchParams.get('q') || '';

    // Initialize state from local storage or router
    const [query, setQuery] = useState(() => {
        return routerQuery || localStorage.getItem('last_search_query') || '';
    });

    const [results, setResults] = useState<Track[]>(() => {
        const cached = localStorage.getItem('last_search_results');
        return cached ? JSON.parse(cached) : [];
    });

    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const { playTrack, likedTracks, toggleLike } = usePlayer();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Derived State for Categories
    const relatedArtists = extractUniqueItems(results, 'artist');
    const relatedAlbums = extractUniqueItems(results, 'album');

    // Persistence Effect
    useEffect(() => {
        if (query) localStorage.setItem('last_search_query', query);
        if (results.length > 0) localStorage.setItem('last_search_results', JSON.stringify(results));
    }, [query, results]);

    // Perform Search
    const performSearch = useCallback(async (searchQuery: string, isLoadMore = false) => {
        if (!searchQuery.trim()) {
            if (!isLoadMore) setResults([]);
            return;
        }

        if (!isLoadMore) setLoading(true);

        try {
            // "Smart Crawling" - fetching data
            const tracks = await libraryService.search(searchQuery);

            if (isLoadMore) {
                setResults(prev => {
                    const existingIds = new Set(prev.map(t => t.id));
                    const newTracks = tracks.filter(t => !existingIds.has(t.id));
                    if (newTracks.length === 0) setHasMore(false);
                    return [...prev, ...newTracks];
                });
            } else {
                setResults(tracks);
                if (tracks.length < 5) setHasMore(false);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = () => {
        if (!loading && hasMore && query) {
            performSearch(query, true);
        }
    };

    const lastElementRef = useInfiniteScroll(loadMore, loading);

    // Sync URL with State
    useEffect(() => {
        if (routerQuery && routerQuery !== query) {
            setQuery(routerQuery);
            performSearch(routerQuery);
        } else if (!routerQuery && query && results.length === 0) {
            // If nothing in URL but we have a stored query + no results, fetch
            // But if we have results from storage, maybe don't fetch immediately?
            // Let's refetch to be fresh if nothing in URL strictly (or just rely on storage)
            // For now, if we have results, we show them.
            if (!results.length) performSearch(query);
            // Update URL to match restored query
            setSearchParams({ q: query }, { replace: true });
        }
    }, [routerQuery]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (value.trim()) setSearchParams({ q: value });
            performSearch(value);
        }, 500);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSearchParams({ q: query });
        performSearch(query);
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-24">
            {/* Search Bar */}
            <form onSubmit={handleSubmit} className="mb-6 sticky top-0 z-20 bg-gradient-to-b from-[#1e1e1e] to-transparent pb-4">
                <div className="relative max-w-xl">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        placeholder="What do you want to listen to?"
                        className="w-full pl-12 pr-4 py-3 bg-white text-black rounded-full font-medium placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                    />
                </div>
            </form>

            {loading && results.length === 0 ? (
                <div className="space-y-8 animate-pulse">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
                    </div>
                </div>
            ) : results.length > 0 ? (
                <div className="space-y-8 fade-in">

                    {/* Top Result - Related Artists */}
                    {relatedArtists.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Artists</h2>
                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                {relatedArtists.map(artist => (
                                    <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.id} className="flex-shrink-0 w-32 md:w-40 text-center group">
                                        <div className="relative mb-2">
                                            <CoverImage src={artist.image} alt={artist.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-lg object-cover group-hover:shadow-xl transition" fallbackText={artist.name[0]} />
                                        </div>
                                        <p className="font-bold truncate text-[11px] md:text-base">{artist.name}</p>
                                        <p className="text-[10px] md:text-sm text-[#a7a7a7]">Artist</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Related Albums */}
                    {relatedAlbums.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">Albums</h2>
                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                {relatedAlbums.map(album => (
                                    <Link to={`/album/search-${encodeURIComponent(album.name)}`} key={album.id} className="flex-shrink-0 w-32 md:w-40 group">
                                        <div className="relative mb-2">
                                             <CoverImage src={album.image} alt={album.name} className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-lg object-cover group-hover:shadow-xl transition" fallbackText={album.name[0]} />
                                        </div>
                                        <p className="font-bold truncate text-[11px] md:text-base">{album.name}</p>
                                        <p className="text-[10px] md:text-sm text-[#a7a7a7]">Album</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Songs List */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Songs</h2>
                        <div className="space-y-2">
                            {results.map((track, index) => (
                                <div
                                    key={`${track.id}-${index}`}
                                    className="flex items-center gap-4 p-2 rounded-md hover:bg-spotify-card-hover transition group cursor-pointer"
                                    onClick={() => playTrack(track, results)}
                                >
                                    <div className="w-8 text-center text-neutral-400 group-hover:hidden">{index + 1}</div>
                                    <div className="w-8 hidden group-hover:flex items-center justify-center text-white">
                                        <Play className="w-4 h-4 fill-current" />
                                    </div>
                                     <CoverImage src={track.cover_url} alt={track.title} className="w-10 h-10 rounded-lg" fallbackText="♪" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{track.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                                    </div>
                                    <p className="hidden md:block text-sm text-neutral-400 truncate max-w-[200px]">{track.album}</p>
                                    <div className="flex items-center gap-3 ml-4">
                                        <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className={`transition opacity-0 group-hover:opacity-100 ${likedTracks.has(track.id) ? 'text-[#1DB954] opacity-100' : 'text-neutral-400 hover:text-white'}`}>
                                            <Heart className={`w-5 h-5 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedTrack(track); }} className="text-neutral-400 hover:text-white transition opacity-0 group-hover:opacity-100">
                                            <PlusCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <span className="text-sm text-neutral-400 w-12 text-right">
                                        {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Infinite Scroll & Skeleton */}
                    <div ref={lastElementRef} className="py-8">
                        {loading && (
                            <div className="space-y-4 animate-pulse">
                                <Skeleton className="h-8 w-48 mb-4" />
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-4 p-2">
                                            <Skeleton className="w-8 h-8 rounded" />
                                            <Skeleton className="w-10 h-10 rounded" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-1/3" />
                                                <Skeleton className="h-3 w-1/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20">
                    <SearchIcon className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Search for music</h2>
                    <p className="text-neutral-400">Find your favorite songs, artists, and albums.</p>
                </div>
            )}

            {selectedTrack && (
                <AddToPlaylistModal
                    track={selectedTrack}
                    isOpen={true}
                    onClose={() => setSelectedTrack(null)}
                />
            )}
        </div>
    );
}
