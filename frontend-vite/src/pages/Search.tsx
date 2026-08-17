import { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Music2, Clock, Sparkles, ListMusic, Disc, Users } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import Skeleton from '../components/Skeleton';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { safeStorage } from '../utils/safeStorage';

interface AlbumHit { id: string; title: string; artist: string; cover_url: string }
interface PlaylistHit { id: string; title: string; cover_url: string }
interface ArtistHit { id: string; name: string; photo: string }

type SearchTab = 'everything' | 'tracks' | 'people' | 'albums' | 'playlists';

export default function Search() {
    const [searchParams] = useSearchParams();
    const routerQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [query, setQuery] = useState(routerQuery);
    const [activeTab, setActiveTab] = useState<SearchTab>('everything');
    const [results, setResults] = useState<Track[]>(() => {
        try {
            const cached = safeStorage.getItem('last_search_results');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [albums, setAlbums] = useState<AlbumHit[]>([]);
    const [playlists, setPlaylists] = useState<PlaylistHit[]>([]);
    const [artistHits, setArtistHits] = useState<ArtistHit[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [inputValue, setInputValue] = useState(routerQuery);

    const playTrack = usePlayerStore(s => s.playTrack);
    const recentSearches = usePlayerStore(s => s.recentSearches);
    const addRecentSearch = usePlayerStore(s => s.addRecentSearch);

    const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});

    useEffect(() => {
        if (query) safeStorage.setItem('last_search_query', query);
        if (results.length > 0) safeStorage.setItem('last_search_results', JSON.stringify(results));
    }, [query, results]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setAlbums([]);
            setPlaylists([]);
            setArtistHits([]);
            setSearchError(null);
            return;
        }
        setLoading(true);
        setSearchError(null);
        try {
            const data = await libraryService.universalSearch(searchQuery);
            setResults(data.songs);
            setAlbums(data.albums);
            setPlaylists(data.playlists);
            setArtistHits(data.artists);
            setHasMore(data.songs.length >= 5);
            if (data.songs.length === 0 && data.albums.length === 0 && data.playlists.length === 0 && data.artists.length === 0) {
                setSearchError('No results — the search service may be temporarily blocked by YouTube. Try again or use a different keyword.');
            }
        } catch (error) {
            console.error("Search error:", error);
            setSearchError('Search failed — please check your connection and try again.');
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
    }, [routerQuery, performSearch]);

    useEffect(() => {
        if (!routerQuery && !query) {
            libraryService.getBrowseContent()
                .then(data => setBrowseData(data))
                .catch(() => {});
        }
    }, [routerQuery, query]);

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
        <div className="min-h-full text-white bg-[#121212] overflow-y-auto no-scrollbar pb-24">
            <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
                {/* Search Header & Filter Tabs */}
                <div className="pb-3 border-b border-white/10 space-y-3">
                    {/* In-page search input — works on mobile too (no need to
                        hunt for the header magnifier) */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const v = inputValue.trim();
                            if (v) {
                                addRecentSearch(v);
                                navigate(`/search?q=${encodeURIComponent(v)}`);
                            }
                        }}
                        className="relative flex items-center w-full max-w-xl bg-[#242424] rounded border border-white/10 focus-within:border-[#ff5500] transition"
                    >
                        <SearchIcon className="w-4 h-4 text-neutral-500 ml-3 flex-shrink-0" />
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Search tracks, artists, albums, playlists..."
                            className="w-full pl-2.5 pr-3 py-2.5 bg-transparent text-white placeholder-neutral-500 text-sm font-medium focus:outline-none"
                        />
                        {inputValue && (
                            <button
                                type="button"
                                onClick={() => setInputValue('')}
                                className="pr-3 text-neutral-500 hover:text-white transition text-lg leading-none"
                                aria-label="Clear"
                            >
                                ×
                            </button>
                        )}
                        <button type="submit" className="pr-3 text-neutral-400 hover:text-white transition" aria-label="Search">
                            <SearchIcon className="w-4 h-4" />
                        </button>
                    </form>

                    <h1 className="text-2xl font-extrabold text-white">
                        {query ? `Search results for "${query}"` : 'Search SoundCloud'}
                    </h1>

                    {searchError && (
                        <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2a1a0a] border border-[#ff5500]/40 text-amber-200 text-xs">
                            <span>{searchError}</span>
                            <button
                                onClick={() => performSearch(query)}
                                className="px-3 py-1 rounded-full bg-[#ff5500] text-white font-bold hover:bg-[#ff7a00] transition"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {query && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            {(['everything', 'tracks', 'people', 'albums', 'playlists'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition ${
                                        activeTab === tab
                                            ? 'bg-[#ff5500] text-white shadow'
                                            : 'bg-white/5 text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {loading && results.length === 0 ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                    </div>
                ) : (results.length > 0 || albums.length > 0 || playlists.length > 0 || artistHits.length > 0) ? (
                    <div className="space-y-8">
                        {/* People / Creators */}
                        {(activeTab === 'everything' || activeTab === 'people') && artistHits.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-white/5">
                                    <Users className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">People</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {artistHits.map(artist => (
                                        <Link to={`/artist/${encodeURIComponent(artist.name)}`} key={artist.id} className="bg-[#181818] p-3 rounded-lg border border-white/5 hover:border-white/10 text-center group transition">
                                            <CoverImage src={artist.photo} alt={artist.name} className="w-20 h-20 rounded-full mx-auto mb-2 object-cover border-2 border-white/10 group-hover:border-[#ff5500]" fallbackText={artist.name[0]} />
                                            <p className="font-bold text-white text-xs truncate group-hover:text-[#ff5500] transition">{artist.name}</p>
                                            <p className="text-[10px] text-neutral-400">Creator</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tracks Stream with SoundCloud Waveforms */}
                        {(activeTab === 'everything' || activeTab === 'tracks') && results.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-white/5">
                                    <Music2 className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Tracks</h2>
                                </div>
                                <div className="space-y-3">
                                    {results.map((track, index) => (
                                        <SoundCloudTrackCard key={`${track.id}-${index}`} track={track} queue={results} />
                                    ))}
                                </div>

                                <div ref={lastElementRef} className="py-4">
                                    {loading && <Skeleton className="h-24 w-full rounded-lg" />}
                                </div>
                            </div>
                        )}

                        {/* Albums */}
                        {(activeTab === 'everything' || activeTab === 'albums') && albums.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-white/5">
                                    <Disc className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Albums</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {albums.map(album => (
                                        <div key={album.id} onClick={() => playCollection(album.id, true)} className="bg-[#181818] p-2.5 rounded-lg border border-white/5 hover:border-white/10 cursor-pointer group transition">
                                            <CoverImage src={album.cover_url} alt={album.title} className="w-full aspect-square rounded object-cover mb-2 group-hover:scale-105 transition" fallbackText="AL" />
                                            <h3 className="font-bold text-white text-xs truncate group-hover:text-[#ff5500] transition">{album.title}</h3>
                                            <p className="text-[10px] text-neutral-400 truncate">{album.artist}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Playlists */}
                        {(activeTab === 'everything' || activeTab === 'playlists') && playlists.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-white/5">
                                    <ListMusic className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Playlists</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {playlists.map(playlist => (
                                        <div key={playlist.id} onClick={() => playCollection(playlist.id, false)} className="bg-[#181818] p-2.5 rounded-lg border border-white/5 hover:border-white/10 cursor-pointer group transition">
                                            <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square rounded object-cover mb-2 group-hover:scale-105 transition" fallbackText="PL" />
                                            <h3 className="font-bold text-white text-xs truncate group-hover:text-[#ff5500] transition">{playlist.title}</h3>
                                            <p className="text-[10px] text-neutral-400">Playlist</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : !query ? (
                    <div className="space-y-6">
                        {recentSearches.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Recent Searches</h2>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleRecentSearchClick(q)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border border-white/10 hover:border-[#ff5500] rounded-full text-xs font-medium text-neutral-300 hover:text-white transition"
                                        >
                                            <SearchIcon className="w-3.5 h-3.5 text-neutral-500" />
                                            <span>{q}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Object.keys(browseData).length > 0 && (
                            <div className="space-y-6">
                                {Object.entries(browseData).slice(0, 2).map(([category, items]) => (
                                    <div key={category}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-4 h-4 text-[#ff5500]" />
                                            <h2 className="text-sm font-extrabold text-white">{category}</h2>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {items.slice(0, 8).map((item: any) => (
                                                <Link to={`/playlist/${item.id}`} key={item.id}>
                                                    <div className="bg-[#181818] p-2.5 rounded-lg border border-white/5 hover:border-white/10 transition group">
                                                        <CoverImage src={item.cover_url} alt={item.title} className="w-full aspect-square rounded object-cover mb-2 group-hover:scale-105 transition" fallbackText="SC" />
                                                        <h3 className="font-bold text-white text-xs truncate group-hover:text-[#ff5500] transition">{item.title}</h3>
                                                        <p className="text-[10px] text-neutral-400 line-clamp-1">{item.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <SearchIcon className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
                        <h2 className="text-lg font-bold text-white mb-1">No results found for "{query}"</h2>
                        <p className="text-xs text-neutral-400">Try searching for a different song, artist, or tag.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
