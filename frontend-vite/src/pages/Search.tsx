import { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Play, Heart, PlusCircle, Music2, Clock, Sparkles, ListMusic, Disc, Users } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import Skeleton from '../components/Skeleton';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface AlbumHit { id: string; title: string; artist: string; cover_url: string }
interface PlaylistHit { id: string; title: string; cover_url: string }
interface ArtistHit { id: string; name: string; photo: string }

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const routerQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [query, setQuery] = useState(routerQuery);
    const [inputValue, setInputValue] = useState(routerQuery);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [results, setResults] = useState<Track[]>(() => {
        const cached = localStorage.getItem('last_search_results');
        return cached ? JSON.parse(cached) : [];
    });
    const [albums, setAlbums] = useState<AlbumHit[]>([]);
    const [playlists, setPlaylists] = useState<PlaylistHit[]>([]);
    const [artistHits, setArtistHits] = useState<ArtistHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    const playTrack = usePlayerStore(s => s.playTrack);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const recentSearches = usePlayerStore(s => s.recentSearches);
    const playHistory = usePlayerStore(s => s.playHistory);
    const addRecentSearch = usePlayerStore(s => s.addRecentSearch);

    const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
    const [browseLoading, setBrowseLoading] = useState(false);

    useEffect(() => {
        if (query) localStorage.setItem('last_search_query', query);
        if (results.length > 0) localStorage.setItem('last_search_results', JSON.stringify(results));
    }, [query, results]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setAlbums([]);
            setPlaylists([]);
            setArtistHits([]);
            return;
        }
        setLoading(true);
        try {
            const data = await libraryService.universalSearch(searchQuery);
            setResults(data.songs);
            setAlbums(data.albums);
            setPlaylists(data.playlists);
            setArtistHits(data.artists);
            if (data.songs.length < 5) setHasMore(false);
            else setHasMore(true);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = async () => {
        if (!loading && hasMore && query && results.length > 0) {
            try {
                const moreTracks = await libraryService.search(query);
                setResults(prev => {
                    const existingIds = new Set(prev.map(t => t.id));
                    const newTracks = moreTracks.filter(t => !existingIds.has(t.id));
                    if (newTracks.length === 0) setHasMore(false);
                    return [...prev, ...newTracks];
                });
            } catch (e) {
                console.error("Load more error", e);
            }
        }
    };

    const lastElementRef = useInfiniteScroll(loadMore, loading);

    useEffect(() => {
        if (routerQuery !== query) {
            setQuery(routerQuery);
            setInputValue(routerQuery);
        }
        if (routerQuery.trim()) {
            performSearch(routerQuery);
        } else if (!routerQuery && !query) {
            setResults([]);
            setAlbums([]);
            setPlaylists([]);
            setArtistHits([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routerQuery]);

    useEffect(() => {
        if (!routerQuery && !query) {
            setBrowseLoading(true);
            libraryService.getBrowseContent()
                .then(data => {
                    setBrowseData(data);
                    setBrowseLoading(false);
                })
                .catch(() => setBrowseLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routerQuery, query]);

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const handleRecentSearchClick = (q: string) => {
        addRecentSearch(q);
        navigate(`/search?q=${encodeURIComponent(q)}`);
    };

    const playCollection = async (id: string, isAlbum: boolean) => {
        try {
            const data = isAlbum ? await libraryService.getAlbum(id) : await libraryService.getPlaylist(id);
            if (data && data.tracks.length > 0) {
                playTrack(data.tracks[0], data.tracks);
            }
        } catch (e) {
            console.error("Failed to play collection", e);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 no-scrollbar pb-24">
            {/* Search Header Info */}
            <div className="flex items-center justify-between mb-6 border-b border-cyan-500/15 pb-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-white">
                        {query ? `Kết quả tìm kiếm cho "${query}"` : 'Tìm Kiếm Khám Phá Âm Nhạc'}
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1">Bài hát, ca sĩ, album, playlist từ YouTube Music</p>
                </div>
            </div>

            {/* Results */}
            {loading && results.length === 0 && albums.length === 0 && playlists.length === 0 ? (
                <div className="space-y-8 animate-pulse">
                    <Skeleton className="h-8 w-48 mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="aspect-square rounded-xl animate-pulse" />)}
                    </div>
                </div>
            ) : (results.length > 0 || albums.length > 0 || playlists.length > 0 || artistHits.length > 0) ? (
                <div className="space-y-8 fade-in">
                    {/* Artists */}
                    {artistHits.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-purple-400" />
                                <h2 className="text-xl md:text-2xl font-bold">Nghệ Sĩ</h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                {artistHits.map(artist => (
                                    <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.id} className="flex-shrink-0 w-32 md:w-40 text-center group">
                                        <div className="relative mb-2">
                                            <CoverImage src={artist.photo} alt={artist.name} className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-lg object-cover group-hover:shadow-xl transition" fallbackText={artist.name[0]} />
                                        </div>
                                        <p className="font-bold truncate text-[11px] md:text-base">{artist.name}</p>
                                        <p className="text-[10px] md:text-sm text-[#a7a7a7]">Nghệ sĩ</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Albums */}
                    {albums.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Disc className="w-5 h-5 text-blue-400" />
                                <h2 className="text-xl md:text-2xl font-bold">Album</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {albums.map(album => (
                                    <div key={album.id} onClick={() => playCollection(album.id, true)}
                                        className="bg-[#1f1f1f]/30 hover:bg-[#1f1f1f]/85 p-3 rounded-2xl transition group cursor-pointer border border-white/5">
                                        <div className="relative mb-3">
                                            <CoverImage src={album.cover_url} alt={album.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={album.title?.substring(0, 2).toUpperCase()} />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white text-sm mb-0.5 truncate">{album.title}</h3>
                                        <p className="text-xs text-neutral-400 truncate">{album.artist}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Playlists */}
                    {playlists.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ListMusic className="w-5 h-5 text-green-400" />
                                <h2 className="text-xl md:text-2xl font-bold">Playlist</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                {playlists.map(playlist => (
                                    <div key={playlist.id} onClick={() => playCollection(playlist.id, false)}
                                        className="bg-[#1f1f1f]/30 hover:bg-[#1f1f1f]/85 p-3 rounded-2xl transition group cursor-pointer border border-white/5">
                                        <div className="relative mb-3">
                                            <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={playlist.title?.substring(0, 2).toUpperCase()} />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white text-sm mb-0.5 truncate">{playlist.title}</h3>
                                        <p className="text-xs text-neutral-400 truncate">Playlist</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Songs */}
                    {results.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Music2 className="w-5 h-5 text-cyan-400" />
                                <h2 className="text-xl md:text-2xl font-bold">Bài Hát</h2>
                            </div>
                            <div className="space-y-2">
                                {results.map((track, index) => (
                                    <div
                                        key={`${track.id}-${index}`}
                                        className="flex items-center gap-4 p-2 rounded-md hover:bg-white/10 transition group cursor-pointer"
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
                                        <div className="flex items-center gap-3 ml-4">
                                            <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className={`transition opacity-0 group-hover:opacity-100 ${likedTracks.has(track.id) ? 'text-[#FF0000] opacity-100' : 'text-neutral-400 hover:text-white'}`}>
                                                <Heart className={`w-5 h-5 ${likedTracks.has(track.id) ? 'fill-[#FF0000]' : ''}`} />
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

                            <div ref={lastElementRef} className="py-8">
                                {loading && (
                                    <div className="space-y-4 animate-pulse">
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
                    )}
                </div>
            ) : !query ? (
                /* Pre-search content */
                <div className="space-y-8 fade-in">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-neutral-400" />
                                <h2 className="text-xl font-bold">Recent Searches</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleRecentSearchClick(q)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition group"
                                    >
                                        <SearchIcon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white" />
                                        <span>{q}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recently Played */}
                    {playHistory.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Music2 className="w-5 h-5 text-green-500" />
                                <h2 className="text-xl font-bold">Recently Played</h2>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                {playHistory.slice(0, 10).map((track, i) => (
                                    <div key={`${track.id}-${i}`}
                                        onClick={() => { playTrack(track, playHistory); }}
                                        className="flex-shrink-0 w-40 bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer border border-white/5"
                                    >
                                        <div className="relative mb-3">
                                            <CoverImage src={track.cover_url} alt={track.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={track.title?.substring(0, 2).toUpperCase()} />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white text-sm mb-0.5 truncate">{track.title}</h3>
                                        <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Browse Content */}
                    {browseLoading ? (
                        <div className="space-y-8">
                            {[1, 2].map(i => (
                                <div key={i}>
                                    <Skeleton className="h-8 w-48 mb-4" />
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                            .slice(0, 3)
                            .map(([category, items]) => (
                                <div key={category}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                        <h2 className="text-xl font-bold">{category}</h2>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    ) : (
                        <div className="text-center py-20">
                            <SearchIcon className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
                            <h2 className="text-xl font-bold mb-2">Search for music</h2>
                            <p className="text-neutral-400">Find your favorite songs, artists, albums, and playlists.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-20">
                    <SearchIcon className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
                    <h2 className="text-xl font-bold mb-2">No results found</h2>
                    <p className="text-neutral-400">Try a different search term.</p>
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
