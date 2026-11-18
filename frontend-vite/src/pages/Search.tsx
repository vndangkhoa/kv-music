import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search as SearchIcon, Play, Shuffle, Radio, ChevronRight, X } from 'lucide-react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import TrackRow, { YtmMediaCard } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { safeStorage } from '../utils/safeStorage';

interface AlbumHit {
    id: string;
    title: string;
    artist: string;
    cover_url: string;
}
interface PlaylistHit {
    id: string;
    title: string;
    cover_url: string;
}
interface ArtistHit {
    id: string;
    name: string;
    photo: string;
}

type SearchTab = 'All' | 'Songs' | 'Artists' | 'Albums' | 'Playlists';

const SEARCH_TABS: SearchTab[] = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'];

export default function Search() {
    const [searchParams] = useSearchParams();
    const routerQuery = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [query, setQuery] = useState(routerQuery);
    const [activeTab, setActiveTab] = useState<SearchTab>('All');
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

    const isInputFocusedRef = useRef(false);
    const isComposingRef = useRef(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchSeqRef = useRef(0);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    useEffect(() => {
        if (query) safeStorage.setItem('last_search_query', query);
        if (results.length > 0) safeStorage.setItem('last_search_results', JSON.stringify(results));
    }, [query, results]);

    const performSearch = useCallback(async (searchQuery: string) => {
        const seq = ++searchSeqRef.current;
        if (!searchQuery.trim()) {
            setResults([]);
            setAlbums([]);
            setPlaylists([]);
            setArtistHits([]);
            setSearchError(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setSearchError(null);
        try {
            const data = await libraryService.universalSearch(searchQuery);
            if (seq !== searchSeqRef.current) return;
            setResults(data.songs);
            setAlbums(data.albums);
            setPlaylists(data.playlists);
            setArtistHits(data.artists);
            setHasMore(data.songs.length >= 5);
            if (
                data.songs.length === 0 &&
                data.albums.length === 0 &&
                data.playlists.length === 0 &&
                data.artists.length === 0
            ) {
                setSearchError('No results found. Try another keyword or try again.');
            }
        } catch (error) {
            if (seq !== searchSeqRef.current) return;
            console.error('Search error:', error);
            setSearchError('Search failed — please check your connection and try again.');
        } finally {
            if (seq === searchSeqRef.current) {
                setLoading(false);
            }
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
                console.error('Load more error', e);
            }
        }
    };

    const lastElementRef = useInfiniteScroll(loadMore, loading);

    useEffect(() => {
        setQuery(routerQuery);
        if (!isInputFocusedRef.current && !isComposingRef.current) {
            setInputValue(routerQuery);
        }
        if (routerQuery.trim()) {
            performSearch(routerQuery);
        } else {
            searchSeqRef.current++;
            setResults([]);
            setAlbums([]);
            setPlaylists([]);
            setArtistHits([]);
            setSearchError(null);
            setLoading(false);
        }
    }, [routerQuery, performSearch]);

    const scheduleInPageSearch = useCallback(
        (val: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            const trimmed = val.trim();
            debounceRef.current = setTimeout(() => {
                if (trimmed) {
                    setQuery(trimmed);
                    navigate(`/search?q=${encodeURIComponent(trimmed)}`, { replace: true });
                } else {
                    searchSeqRef.current++;
                    setQuery('');
                    setResults([]);
                    setAlbums([]);
                    setPlaylists([]);
                    setArtistHits([]);
                    setSearchError(null);
                    setLoading(false);
                    navigate('/search', { replace: true });
                }
            }, 450);
        },
        [navigate]
    );

    const handleInputChange = (val: string) => {
        setInputValue(val);
        if (isComposingRef.current) return;
        scheduleInPageSearch(val);
    };

    const handleClearInput = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        searchSeqRef.current++;
        setInputValue('');
        setQuery('');
        setResults([]);
        setAlbums([]);
        setPlaylists([]);
        setArtistHits([]);
        setSearchError(null);
        setLoading(false);
        navigate('/search', { replace: true });
    };

    useEffect(() => {
        if (!routerQuery && !query) {
            libraryService
                .getBrowseContent()
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
            console.error('Failed to play collection', e);
        }
    };

    const playArtist = async (artistName: string, shuffled = false) => {
        try {
            const songs = await libraryService.search(artistName);
            const list = songs.length > 0 ? songs : results;
            if (list.length > 0) {
                if (shuffled) {
                    const copy = [...list].sort(() => Math.random() - 0.5);
                    playTrack(copy[0], copy);
                } else {
                    playTrack(list[0], list);
                }
            }
        } catch {
            if (results.length > 0) playTrack(results[0], results);
        }
    };

    const topArtist = artistHits[0];
    const topSong = results[0];
    const isTopArtistMatch = useMemo(() => {
        if (!topArtist) return false;
        if (!topSong) return true;
        const q = query.trim().toLowerCase();
        return topArtist.name.toLowerCase().includes(q) || q.includes(topArtist.name.toLowerCase());
    }, [topArtist, topSong, query]);

    const topCover = isTopArtistMatch
        ? topArtist?.photo
        : topSong?.cover_url || albums[0]?.cover_url || playlists[0]?.cover_url;

    const hasAnyResults = results.length > 0 || albums.length > 0 || playlists.length > 0 || artistHits.length > 0;

    return (
        <div className="min-h-full bg-transparent text-white">
            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-8">
                {/* Search Input (mobile-friendly in-page bar) & Filter Chips */}
                <div className="space-y-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (debounceRef.current) clearTimeout(debounceRef.current);
                            const v = inputValue.trim();
                            if (v) {
                                addRecentSearch(v);
                                setQuery(v);
                                navigate(`/search?q=${encodeURIComponent(v)}`);
                            }
                        }}
                        className="relative flex items-center w-full max-w-[860px] h-10 bg-white/10 border border-white/15 rounded-[8px] focus-within:bg-[#030303] focus-within:border-white/30 transition md:hidden"
                    >
                        <SearchIcon className="w-4 h-4 text-white/60 ml-3 flex-shrink-0" />
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onCompositionStart={() => {
                                isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => {
                                isComposingRef.current = false;
                                scheduleInPageSearch((e.target as HTMLInputElement).value);
                            }}
                            onFocus={() => {
                                isInputFocusedRef.current = true;
                            }}
                            onBlur={() => {
                                isInputFocusedRef.current = false;
                            }}
                            placeholder="Search songs, albums, artists, playlists"
                            className="w-full px-3 py-2 bg-transparent text-white placeholder-white/50 text-base focus:outline-none"
                        />
                        {inputValue && (
                            <button
                                type="button"
                                onClick={handleClearInput}
                                className="p-2 text-white/60 hover:text-white transition"
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </form>

                    {query && (
                        <div
                            role="tablist"
                            aria-label="Search category filter"
                            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
                        >
                            {SEARCH_TABS.map(tab => {
                                const isActive = activeTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(isActive && tab !== 'All' ? 'All' : tab)}
                                        className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                                            isActive
                                                ? 'bg-white text-[#030303]'
                                                : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {searchError && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-[8px] bg-[#212121] border border-white/15 text-sm text-white/80">
                            <span>{searchError}</span>
                            <button
                                type="button"
                                onClick={() => performSearch(query)}
                                className="h-8 px-4 rounded-full bg-white text-[#030303] text-sm font-medium hover:bg-white/90 transition"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Results */}
                {loading && results.length === 0 ? (
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full rounded-[8px]" />
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
                            ))}
                        </div>
                    </div>
                ) : hasAnyResults ? (
                    <div className="space-y-10">
                        {/* Top Result Hero Card (ytmusic-card-shelf-renderer) */}
                        {activeTab === 'All' && (topArtist || topSong) && (
                            <section aria-label="Top result" className="space-y-3">
                                <h2
                                    className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                    style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                >
                                    Top result
                                </h2>

                                <div className="relative rounded-[8px] overflow-hidden border border-white/10 bg-[#181818]">
                                    {topCover && (
                                        <img
                                            src={topCover}
                                            alt=""
                                            aria-hidden="true"
                                            className="absolute inset-0 w-full h-full object-cover blur-[60px] opacity-40 scale-110 pointer-events-none"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#030303]/70 to-[#030303]/95 pointer-events-none" />

                                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
                                        {/* Left Primary Entity */}
                                        <div className="p-5 sm:p-6 flex flex-col justify-between gap-5">
                                            <div className="flex items-center gap-4 min-w-0">
                                                {isTopArtistMatch && topArtist ? (
                                                    <Link
                                                        to={`/artist/${encodeURIComponent(topArtist.name)}`}
                                                        className="w-20 h-20 sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-[#212121] shadow-xl"
                                                    >
                                                        <CoverImage
                                                            src={topArtist.photo}
                                                            alt={topArtist.name}
                                                            className="w-full h-full object-cover"
                                                            fallbackText={topArtist.name[0]}
                                                        />
                                                    </Link>
                                                ) : (
                                                    <div
                                                        onClick={() => topSong && playTrack(topSong, results)}
                                                        className="w-20 h-20 sm:w-[100px] sm:h-[100px] rounded-[6px] overflow-hidden flex-shrink-0 bg-[#212121] shadow-xl cursor-pointer"
                                                    >
                                                        <CoverImage
                                                            src={topCover}
                                                            alt={topSong?.title || query}
                                                            className="w-full h-full object-cover"
                                                            fallbackText="♪"
                                                        />
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    {isTopArtistMatch && topArtist ? (
                                                        <Link
                                                            to={`/artist/${encodeURIComponent(topArtist.name)}`}
                                                            className="group inline-flex items-center gap-1 max-w-full"
                                                        >
                                                            <h3
                                                                className="text-[22px] sm:text-[24px] font-bold text-white leading-tight truncate group-hover:underline"
                                                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                                            >
                                                                {topArtist.name}
                                                            </h3>
                                                            <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
                                                        </Link>
                                                    ) : (
                                                        <h3
                                                            className="text-[22px] sm:text-[24px] font-bold text-white leading-tight line-clamp-2"
                                                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                                        >
                                                            {topSong?.title}
                                                        </h3>
                                                    )}
                                                    <p className="text-sm text-white/70 mt-1 truncate">
                                                        {isTopArtistMatch && topArtist
                                                            ? 'Artist'
                                                            : `Song • ${topSong?.artist || 'Unknown Artist'}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isTopArtistMatch && topArtist) {
                                                            playArtist(topArtist.name, true);
                                                        } else if (topSong) {
                                                            playTrack(topSong, results);
                                                        }
                                                    }}
                                                    className="h-9 px-5 rounded-full bg-white text-[#030303] hover:bg-white/90 text-sm font-medium inline-flex items-center gap-2 transition active:scale-95"
                                                >
                                                    {isTopArtistMatch ? (
                                                        <>
                                                            <Shuffle className="w-4 h-4" />
                                                            <span>Shuffle</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-4 h-4 fill-current" />
                                                            <span>Play</span>
                                                        </>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isTopArtistMatch && topArtist) {
                                                            playArtist(topArtist.name, false);
                                                        } else if (topSong) {
                                                            playTrack(topSong, results);
                                                        }
                                                    }}
                                                    className="h-9 px-5 rounded-full border border-white/30 text-white hover:bg-white/10 text-sm font-medium inline-flex items-center gap-2 transition"
                                                >
                                                    <Radio className="w-4 h-4" />
                                                    <span>Mix</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Right Undercards Stack (up to 3 top tracks) */}
                                        {results.length > 0 && (
                                            <div className="bg-white/[0.04] p-4 space-y-1 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col justify-center">
                                                {results.slice(0, 3).map((track, idx) => (
                                                    <TrackRow
                                                        key={`top-undercard-${track.id}-${idx}`}
                                                        track={track}
                                                        queue={results}
                                                        compact
                                                        disableSwipe
                                                        className={idx === 2 ? 'border-b-0' : ''}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Songs */}
                        {(activeTab === 'All' || activeTab === 'Songs') && results.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <h2
                                        className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                    >
                                        Songs
                                    </h2>
                                    {activeTab === 'All' && results.length > 5 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('Songs')}
                                            className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                        >
                                            Show all
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-0.5">
                                    {(activeTab === 'All' ? results.slice(0, 6) : results).map((track, index) => (
                                        <TrackRow
                                            key={`${track.id}-${index}`}
                                            track={track}
                                            queue={results}
                                        />
                                    ))}
                                </div>

                                {activeTab === 'Songs' && (
                                    <div ref={lastElementRef} className="py-4">
                                        {loading && <Skeleton className="h-14 w-full rounded-[6px]" />}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Artists */}
                        {(activeTab === 'All' || activeTab === 'Artists') && artistHits.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h2
                                        className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                    >
                                        Artists
                                    </h2>
                                    {activeTab === 'All' && artistHits.length > 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('Artists')}
                                            className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                        >
                                            Show all
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                    {(activeTab === 'All' ? artistHits.slice(0, 6) : artistHits).map(artist => (
                                        <YtmMediaCard
                                            key={artist.id}
                                            variant="artist"
                                            title={artist.name}
                                            subtitle="Artist"
                                            imageUrl={artist.photo}
                                            to={`/artist/${encodeURIComponent(artist.name)}`}
                                            onPlay={() => playArtist(artist.name)}
                                            fallbackText={artist.name[0]}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Albums */}
                        {(activeTab === 'All' || activeTab === 'Albums') && albums.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h2
                                        className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                    >
                                        Albums
                                    </h2>
                                    {activeTab === 'All' && albums.length > 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('Albums')}
                                            className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                        >
                                            Show all
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                    {(activeTab === 'All' ? albums.slice(0, 6) : albums).map(album => (
                                        <YtmMediaCard
                                            key={album.id}
                                            title={album.title}
                                            subtitle={`Album • ${album.artist}`}
                                            imageUrl={album.cover_url}
                                            to={`/album/${encodeURIComponent(album.id)}`}
                                            onPlay={() => playCollection(album.id, true)}
                                            fallbackText="AL"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Community Playlists */}
                        {(activeTab === 'All' || activeTab === 'Playlists') && playlists.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h2
                                        className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                                        style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                    >
                                        Community playlists
                                    </h2>
                                    {activeTab === 'All' && playlists.length > 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('Playlists')}
                                            className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                                        >
                                            Show all
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                    {(activeTab === 'All' ? playlists.slice(0, 6) : playlists).map(playlist => (
                                        <YtmMediaCard
                                            key={playlist.id}
                                            title={playlist.title}
                                            subtitle="Playlist"
                                            imageUrl={playlist.cover_url}
                                            to={`/playlist/${encodeURIComponent(playlist.id)}`}
                                            onPlay={() => playCollection(playlist.id, false)}
                                            fallbackText="PL"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                ) : !query ? (
                    <div className="space-y-8">
                        {recentSearches.length > 0 && (
                            <section className="space-y-3">
                                <h2
                                    className="text-[18px] md:text-[20px] font-bold text-white"
                                    style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                >
                                    Recent searches
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {recentSearches.map((q, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleRecentSearchClick(q)}
                                            className="inline-flex items-center gap-2 h-8 px-3.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-[8px] text-sm font-medium text-white transition"
                                        >
                                            <SearchIcon className="w-3.5 h-3.5 text-white/60" />
                                            <span>{q}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {Object.keys(browseData).length > 0 && (
                            <div className="space-y-8">
                                {Object.entries(browseData)
                                    .slice(0, 2)
                                    .map(([category, items]) => (
                                        <section key={category} className="space-y-4">
                                            <h2
                                                className="text-[20px] md:text-[24px] font-bold text-white"
                                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                                            >
                                                {category}
                                            </h2>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                                {items.slice(0, 6).map((item: StaticPlaylist) => (
                                                    <YtmMediaCard
                                                        key={item.id}
                                                        title={item.title}
                                                        subtitle={item.description || 'Playlist'}
                                                        imageUrl={item.cover_url}
                                                        to={
                                                            item.type === 'Album'
                                                                ? `/album/${encodeURIComponent(item.id)}`
                                                                : `/playlist/${encodeURIComponent(item.id)}`
                                                        }
                                                        onPlay={() => playCollection(item.id, item.type === 'Album')}
                                                        fallbackText="♪"
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 space-y-2">
                        <SearchIcon className="w-12 h-12 mx-auto text-white/30 mb-3" />
                        <h2 className="text-lg font-bold text-white">No results found for "{query}"</h2>
                        <p className="text-sm text-white/60">Try searching for a different song, artist, album, or playlist.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
