import { useEffect, useState } from 'react';
import { Play, ArrowUpDown, Clock, Music2, User } from "lucide-react";
import { Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';

type SortOption = 'recent' | 'alpha-asc' | 'alpha-desc' | 'artist';

export default function Home() {
    const [timeOfDay, setTimeOfDay] = useState("Good evening");
    const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [heroPlaylist, setHeroPlaylist] = useState<StaticPlaylist | null>(null);
    const { playTrack, playHistory, setIsFullScreenOpen, currentTrack } = usePlayer();

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay("Good morning");
        else if (hour < 18) setTimeOfDay("Good afternoon");
        else setTimeOfDay("Good evening");

        // Cache First Strategy for "Super Fast" loading
        const cached = localStorage.getItem('ytm_browse_cache_v6');
        if (cached) {
            setBrowseData(JSON.parse(cached));
            setLoading(false);
        }

        setLoading(true);
        libraryService.getBrowseContent()
            .then(data => {
                setBrowseData(data);
                setLoading(false);
                // Update Cache
                localStorage.setItem('ytm_browse_cache_v6', JSON.stringify(data));

                // Pick a random playlist for the hero section
                const allPlaylists = Object.values(data).flat().filter(p => p.type === 'Playlist');
                if (allPlaylists.length > 0) {
                    const randomIdx = Math.floor(Math.random() * allPlaylists.length);
                    setHeroPlaylist(allPlaylists[randomIdx]);
                }
            })
            .catch(err => {
                console.error("Error fetching browse:", err);
                setLoading(false);
            });
    }, []);

    const sortPlaylists = (playlists: StaticPlaylist[]) => {
        const sorted = [...playlists];
        switch (sortBy) {
            case 'alpha-asc':
                return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'alpha-desc':
                return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            case 'artist':
                return sorted.sort((a, b) => (a.creator || '').localeCompare(b.creator || ''));
            case 'recent':
            default:
                return sorted;
        }
    };

    const sortOptions = [
        { value: 'recent', label: 'Recently Added', icon: Clock },
        { value: 'alpha-asc', label: 'Alphabetical (A-Z)', icon: ArrowUpDown },
        { value: 'alpha-desc', label: 'Alphabetical (Z-A)', icon: ArrowUpDown },
        { value: 'artist', label: 'Artist Name', icon: User },
    ];

    return (
        <div className="h-full overflow-y-auto p-6 no-scrollbar pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">{timeOfDay}</h1>

                {/* Sort Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-2 px-4 py-2 bg-spotify-card hover:bg-spotify-card-hover rounded-full text-sm font-medium transition"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                        Sort
                    </button>

                    {showSortMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-lg shadow-xl z-50 py-1 border border-[#383838]">
                            {sortOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSortBy(option.value as SortOption);
                                        setShowSortMenu(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#3a3a3a] transition ${sortBy === option.value ? 'text-[#1DB954]' : 'text-white'}`}
                                >
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                    {sortBy === option.value && (
                                        <span className="ml-auto text-[#1DB954]">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hero Section */}
            {loading ? (
                <div className="mb-8 w-full h-80 bg-spotify-card rounded-xl flex items-center p-8 animate-pulse">
                    <Skeleton className="w-56 h-56 rounded-md shadow-2xl mr-8" />
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
            ) : heroPlaylist && (
                <Link to={`/playlist/${heroPlaylist.id}`}>
                    <div className="mb-8 w-full h-auto md:h-80 bg-gradient-to-r from-[#2a2a2a] to-[#181818] rounded-xl flex flex-col md:flex-row items-center p-6 md:p-8 hover:bg-[#2a2a2a] transition duration-300 group cursor-pointer shadow-2xl">
                        <div className="relative mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                            <CoverImage
                                src={heroPlaylist.cover_url}
                                alt={heroPlaylist.title}
                                className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl group-hover:scale-105 transition duration-500"
                                fallbackText="VB"
                            />
                        </div>
                        <div className="flex flex-col text-center md:text-left overflow-hidden">
                            <span className="text-xs font-bold tracking-wider uppercase mb-2">Featured Playlist</span>
                            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight line-clamp-2 md:line-clamp-3" title={heroPlaylist.title}>{heroPlaylist.title}</h2>
                            <p className="text-[#a7a7a7] text-sm md:text-base line-clamp-2 md:line-clamp-3 max-w-2xl mb-6">
                                {heroPlaylist.description}
                            </p>
                            <div className="mt-auto inline-flex items-center gap-2 bg-[#1DB954] text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition self-center md:self-start">
                                <Play className="fill-black" />
                                Play Now
                            </div>
                        </div>
                    </div>
                </Link>
            )}

            {/* Recently Listened */}
            <RecentlyListenedSection playHistory={playHistory} playTrack={playTrack} />

            {/* Made For You */}
            <MadeForYouSection />

            {/* Artist Vietnam */}
            <ArtistVietnamSection />

            {/* Top Albums Section (NEW) */}
            {loading ? (
                <div className="mb-8">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(j => (
                            <div key={j} className="space-y-3">
                                <Skeleton className="w-full aspect-square rounded-md" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : browseData["Top Albums"] && browseData["Top Albums"].length > 0 && (() => {
                const seen = new Set<string>();
                const uniqueAlbums = (browseData["Top Albums"] as any[]).filter(a => {
                    if (seen.has(a.id)) return false;
                    seen.add(a.id);
                    return true;
                });
                return (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold capitalize hover:underline cursor-pointer">Top Albums</h2>
                    </div>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                        {uniqueAlbums.slice(0, 15).map((album) => (
                            <Link to={`/album/${album.id}`} key={album.id}>
                                <div className="bg-transparent md:bg-spotify-card p-0 md:p-3 rounded-xl hover:bg-spotify-card-hover transition duration-300 group cursor-pointer relative h-full flex flex-col">
                                    <div className="relative mb-2 md:mb-3">
                                        <CoverImage
                                            src={album.cover_url}
                                            alt={album.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={album.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                playTrack(album as any);
                                            }}
                                            className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl cursor-pointer"
                                        >
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                                                <Play className="fill-black text-black ml-0.5 w-4 h-4 md:w-5 md:h-5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold mb-0.5 truncate text-[11px] md:text-base">{album.title}</h3>
                                    <p className="text-[10px] md:text-xs text-[#a7a7a7] line-clamp-1">{album.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
                );
            })()}

            {/* Browse Lists */}
            {loading ? (
                <div className="space-y-8">
                    {[1, 2].map(i => (
                        <div key={i}>
                            <Skeleton className="h-8 w-48 mb-4" />
                            <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map(j => (
                                    <div key={j} className="space-y-3">
                                        <Skeleton className="w-full aspect-square rounded-md" />
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
                    .filter(([category, items]) => category !== "Top Albums" && (items as any[]).length > 0)
                    .map(([category, playlists]) => {
                        const seen = new Set<string>();
                        const uniquePlaylists = (playlists as any[]).filter(p => {
                            if (seen.has(p.id)) return false;
                            seen.add(p.id);
                            return true;
                        });
                        return (
                        <div key={category} className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold capitalize hover:underline cursor-pointer">{category}</h2>
                                <Link to={`/section?category=${encodeURIComponent(category)}`}>
                                    <span className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider hover:text-white cursor-pointer">Show all</span>
                                </Link>
                            </div>

                            {/* USER REQUEST: Bigger Grid, Smaller Text, Smaller Gap */}
                            <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-6">
                                {sortPlaylists(uniquePlaylists).slice(0, 15).map((playlist) => (
                                    <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                                        <div className="bg-transparent md:bg-spotify-card p-0 md:p-4 rounded-xl hover:bg-spotify-card-hover transition duration-300 group cursor-pointer relative h-full flex flex-col">
                                            <div className="relative mb-2 md:mb-4">
                                                <CoverImage
                                                    src={playlist.cover_url}
                                                    alt={playlist.title}
                                                    className="w-full aspect-square rounded-xl shadow-lg"
                                                    fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                                />
                                                <div
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        playTrack(playlist as any);
                                                    }}
                                                    className="absolute bottom-1 right-1 md:bottom-2 md:right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 md:w-12 md:h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                                                        <Play className="fill-black text-black ml-0.5 w-4 h-4 md:w-6 md:h-6" />
                                                    </div>
                                                </div>
                                            </div>
                                            <h3 className="font-bold mb-0.5 truncate text-[11px] md:text-base">{playlist.title}</h3>
                                            <p className="text-[10px] md:text-sm text-[#a7a7a7] line-clamp-2">{playlist.description}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        );
                    })
            ) : (
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold mb-4">Ready to explore?</h2>
                    <p className="text-[#a7a7a7]">Browse content is loading or empty. Try searching for music.</p>
                </div>
            )}
        </div>
    );
}

// Recently Listened Section
function RecentlyListenedSection({ playHistory, playTrack }: { playHistory: Track[], playTrack: (track: Track, queue?: Track[]) => void }) {
    const { setIsFullScreenOpen, currentTrack } = usePlayer();
    if (playHistory.length === 0) return null;

    return (
        <div className="mb-8 animate-in">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[#1DB954]" />
                <h2 className="text-2xl font-bold">Recently Listened</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {playHistory.slice(0, 10).map((track, i) => (
                    <div
                        key={`${track.id}-${i}`}
                        onClick={() => {
                            playTrack(track, playHistory);
                        }}
                        className="flex-shrink-0 w-40 bg-spotify-card rounded-xl overflow-hidden hover:bg-spotify-card-hover transition duration-300 group cursor-pointer"
                    >
                        <div className="relative">
                            <CoverImage
                                src={track.cover_url}
                                alt={track.title}
                                className="w-40 h-40"
                                fallbackText={track.title?.substring(0, 2).toUpperCase()}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                                    <Play className="fill-black text-black ml-1 w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="font-medium text-sm truncate">{track.title}</h3>
                            <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Made For You Section
function MadeForYouSection() {
    const { playHistory, playTrack, setIsFullScreenOpen, currentTrack } = usePlayer();
    const [recommendations, setRecommendations] = useState<Track[]>([]);
    const [seedTrack, setSeedTrack] = useState<Track | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (playHistory.length > 0) {
            const seed = playHistory[0];
            setSeedTrack(seed);
            setLoading(true);

            libraryService.getRecommendations(seed.artist)
                .then(tracks => {
                    setRecommendations(tracks);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [playHistory.length > 0 ? playHistory[0]?.id : null]);

    if (playHistory.length === 0) return null;
    if (!loading && recommendations.length === 0) return null;

    return (
        <div className="mb-8 animate-in">
            <div className="flex items-center gap-2 mb-2">
                <Music2 className="w-5 h-5 text-[#1DB954]" />
                <h2 className="text-2xl font-bold">Made For You</h2>
            </div>
            <p className="text-sm text-[#a7a7a7] mb-4">
                {seedTrack ? <>Because you listened to <span className="text-white font-medium">{seedTrack.artist}</span></> : "Recommended for you"}
            </p>

            {loading ? (
                <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="w-full aspect-square rounded-md" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-6">
                    {recommendations.slice(0, 10).map((track, i) => (
                        <div key={i} onClick={() => {
                            playTrack(track, recommendations);
                        }} className="bg-transparent md:bg-spotify-card p-0 md:p-4 rounded-xl hover:bg-spotify-card-hover transition duration-300 group cursor-pointer relative h-full flex flex-col">
                            <div className="relative mb-2 md:mb-4">
                                <CoverImage
                                    src={track.cover_url}
                                    alt={track.title}
                                    className="w-full aspect-square rounded-xl shadow-lg"
                                    fallbackText={track.title?.substring(0, 2).toUpperCase()}
                                />
                                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                                    <div className="w-8 h-8 md:w-12 md:h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                                        <Play className="fill-black text-black ml-0.5 w-4 h-4 md:w-6 md:h-6" />
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-bold mb-0.5 truncate text-[11px] md:text-base">{track.title}</h3>
                            <p className="text-[10px] md:text-sm text-[#a7a7a7] line-clamp-2">{track.artist}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Artist Vietnam Section
// Artist Vietnam Section (Optimized & Personalized)
function ArtistVietnamSection() {
    const { playHistory } = usePlayer();

    // Expanded pool of popular artists for discovery/fallback
    const POPULAR_ARTISTS = [
        "Sơn Tùng M-TP", "HIEUTHUHAI", "Đen Vâu", "Hoàng Dũng",
        "Vũ.", "MONO", "Tlinh", "Erik", "Binz", "JustaTee",
        "Rhymastic", "Low G", "MCK", "Min", "Amee", "Karik",
        "Suboi", "Bích Phương", "Trúc Nhân", "Đức Phúc"
    ];

    const [artists, setArtists] = useState<string[]>([]);
    const [artistPhotos, setArtistPhotos] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Determine Artist List (Personalized + Discovery)
        const deriveArtists = () => {
            const historyArtists = new Set<string>();
            playHistory.forEach(track => {
                if (track.artist) historyArtists.add(track.artist);
            });

            const recent = Array.from(historyArtists).slice(0, 5); // Take top 5 recent

            // Fill rest with random popular artists that aren't in recent
            const needed = 20 - recent.length;
            const available = POPULAR_ARTISTS.filter(a => !historyArtists.has(a));
            const shuffled = available.sort(() => 0.5 - Math.random()).slice(0, needed);

            return [...recent, ...shuffled];
        };

        const targetArtists = deriveArtists();
        setArtists(targetArtists);

        // 2. Load Photos (Cache First Strategy)
        const loadPhotos = async () => {
            // v5: Force refresh for authentic channel avatars
            const cacheKey = 'artist_photos_cache_v6';
            const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');

            // Initialize with cache immediately
            setArtistPhotos(cached);
            setLoading(false); // Show names immediately

            // Identify missing photos
            const missing = targetArtists.filter(name => !cached[name]);

            if (missing.length > 0) {
                // Fetch missing incrementally
                for (const name of missing) {
                    try {
                        // Fetch one by one and update state immediately
                        // This prevents "batch waiting" feeling
                        libraryService.getArtistInfo(name).then(data => {
                            if (data.photo) {
                                setArtistPhotos(prev => {
                                    const next: Record<string, string> = { ...prev, [name]: data.photo || "" };
                                    localStorage.setItem(cacheKey, JSON.stringify(next));
                                    return next;
                                });
                            }
                        });
                    } catch { /* ignore */ }
                }
            }
        };

        loadPhotos();
    }, [playHistory.length]); // Re-run when history changes significantly

    return (
        <div className="mb-8 animate-in">
            <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#1DB954]" />
                <h2 className="text-2xl font-bold">Suggested Artists</h2>
            </div>
            <p className="text-sm text-[#a7a7a7] mb-4">Based on your recent listening</p>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {artists.length === 0 && loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex-shrink-0 w-36 text-center space-y-3">
                            <Skeleton className="w-36 h-36 rounded-xl" />
                            <Skeleton className="h-4 w-3/4 mx-auto" />
                        </div>
                    ))
                ) : (
                    artists.map((name, i) => (
                        <Link to={`/artist/${encodeURIComponent(name)}`} key={i}>
                            <div className="flex-shrink-0 w-36 text-center group cursor-pointer">
                                <div className="relative mb-3">
                                    <CoverImage
                                        src={artistPhotos[name]}
                                        alt={name}
                                        className="w-36 h-36 rounded-xl shadow-lg group-hover:shadow-xl transition object-cover"
                                        fallbackText={name.substring(0, 2).toUpperCase()}
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                                        <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                                            <Play className="fill-black text-black ml-1 w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-sm truncate px-2">{name}</h3>
                                <p className="text-xs text-[#a7a7a7]">Artist</p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
