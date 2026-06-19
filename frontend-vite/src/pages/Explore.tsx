import { useState, useEffect } from 'react';
import { Play, Calendar, Flame, Music, Sparkles, Clock, ChevronRight, Plus, Heart, HeartOff, Check, Disc } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { libraryService } from '../services/library';
import { Track } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';
import { Link } from 'react-router-dom';

type ActiveTab = 'new-releases' | 'upcoming-teasers' | 'trending';

// Real YouTube-backed track data for fallback to ensure playable streams and official thumbnails
const FALLBACK_NEW_RELEASES: Track[] = [
    {
        id: 'zoEtcR5EW08',
        title: 'Chúng Ta Của Tương Lai',
        artist: 'Sơn Tùng M-TP',
        album: 'Chúng Ta Của Tương Lai - Single',
        cover_url: 'https://i.ytimg.com/vi/zoEtcR5EW08/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLCwEcmPx4bgn_tjAqdziT2N1MN2zQ'
    },
    {
        id: 'J7eYhM6wXPo',
        title: 'An Thần',
        artist: 'Low G ft. Thắng',
        album: 'An Thần - Single',
        cover_url: 'https://i.ytimg.com/vi/J7eYhM6wXPo/hq720.jpg?sqp=-oaymwEgCNAFEJQDSFXyq4qpAxIIARUAAIhCGAFwAcABBrgC8xg=&rs=AOn4CLDoLv4Q6-PnEyqDWSZgG7TNebpHgw'
    },
    {
        id: 'GatNL0mmQGc',
        title: '3107',
        artist: 'W/n',
        album: '3107 - Single',
        cover_url: 'https://i.ytimg.com/vi/GatNL0mmQGc/hq720.jpg?sqp=-oaymwE2CNAFEJQDSFXyq4qpAygIARUAAIhCGAFwAcABBvABAfgBggeAAtAFigIMCAAQARhlIGUoZTAP&rs=AOn4CLCSkblemqgafqrhvmJhlzWPprnyjg'
    },
    {
        id: 'sU8G7Q4rUA4',
        title: 'Nâng Chén Tiêu Sầu',
        artist: 'Bích Phương',
        album: 'Nâng Chén Tiêu Sầu - Single',
        cover_url: 'https://i.ytimg.com/vi/sU8G7Q4rUA4/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLCh1QjwqttWoohHdIEhP9PQlwjOHg'
    },
    {
        id: 'QEg-0tku9xU',
        title: 'Mưa Nào Mà Hông Tạnh',
        artist: 'AMEE',
        album: 'Mộng Mee - Single',
        cover_url: 'https://i.ytimg.com/vi/QEg-0tku9xU/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLDmuo040oWRCjKYETz2jpqGmjoEWA'
    },
    {
        id: 'Z8JT5TNxmVE',
        title: 'Vũ Trụ Có Anh',
        artist: 'Phương Mỹ Chi',
        album: 'Vũ Trụ Cò Bay',
        cover_url: 'https://i.ytimg.com/vi/Z8JT5TNxmVE/hq720.jpg?sqp=-oaymwEgCNAFEJQDSFXyq4qpAxIIARUAAIhCGAFwAcABBrgC9xg=&rs=AOn4CLAjIkOvtoe8aKqSnRRSo8h3kU8fsg'
    }
];

const FALLBACK_UPCOMING_TEASERS = [
    {
        id: 'wcSV-80b7a0',
        title: 'Wren Evans - LỐI ĐI RIÊNG (Official Teaser)',
        artist: 'Wren Evans',
        album: 'Upcoming Album "LỐI ĐI RIÊNG"',
        cover_url: 'https://i.ytimg.com/vi/wcSV-80b7a0/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLBrEhr2_HSpMLqvCDd9KIwoxbP6RQ',
        badge: 'ALBUM TEASER',
        badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
        releaseInfo: 'Releasing June 26, 2026',
        daysLeft: 7
    },
    {
        id: '2KcezWHPh_I',
        title: 'tlinh - Thế Giới Ảo (Official Trailer)',
        artist: 'tlinh',
        album: 'Upcoming Single',
        cover_url: 'https://i.ytimg.com/vi/2KcezWHPh_I/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLCwzyo39pNdjgTYlD1i90Zebx6zOg',
        badge: 'MV TRAILER',
        badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
        releaseInfo: 'Releasing July 02, 2026',
        daysLeft: 13
    },
    {
        id: '3NNz56niDVY',
        title: 'MONO - Chăm Chỉ (Demo Audio Teaser)',
        artist: 'MONO',
        album: 'Studio Session Demo',
        cover_url: 'https://i.ytimg.com/vi/3NNz56niDVY/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLAib7nQfL87sLaMDVKrfZzT0jIVbg',
        badge: 'DEMO CLIP',
        badgeColor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
        releaseInfo: 'Releasing June 29, 2026',
        daysLeft: 10
    },
    {
        id: 'zoEtcR5EW08',
        title: 'Sơn Tùng M-TP - Chúng Ta Của Tương Lai (Official Teaser)',
        artist: 'Sơn Tùng M-TP',
        album: 'Chúng Ta Của Tương Lai Teaser',
        cover_url: 'https://i.ytimg.com/vi/zoEtcR5EW08/hq720.jpg?sqp=-oaymwEcCNAFEJQDSFXyq4qpAw4IARUAAIhCGAFwAcABBg==&rs=AOn4CLCwEcmPx4bgn_tjAqdziT2N1MN2zQ',
        badge: 'PROMO PREVIEW',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        releaseInfo: 'Releasing in 3 days',
        daysLeft: 3
    }
];

const INITIAL_SPOTLIGHT_ARTISTS = [
    { name: 'Wren Evans', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', genre: 'V-Pop / R&B' },
    { name: 'tlinh', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', genre: 'Melodic Rap' },
    { name: 'MONO', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', genre: 'Dance Pop' },
    { name: 'VSTRA', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', genre: 'Indie / Alt-Pop' },
    { name: 'MCK', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', genre: 'Rap / Hip-Hop' },
    { name: 'GREY D', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop', genre: 'V-Pop / R&B' },
    { name: 'HIEUTHUHAI', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop', genre: 'Rap / Pop' },
    { name: 'Obito', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop', genre: 'Melodic Rap' },
    { name: 'Rhyder', photo: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=200&auto=format&fit=crop', genre: 'Rap / Pop' },
    { name: 'Mỹ Anh', photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop', genre: 'R&B / Soul' },
    { name: 'Double2T', photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=200&auto=format&fit=crop', genre: 'Folk Rap' }
];

export default function Explore() {
    const { playTrack, likedTracks, toggleLike } = usePlayer();
    const [activeTab, setActiveTab] = useState<ActiveTab>('new-releases');
    
    const [newReleases, setNewReleases] = useState<Track[]>(FALLBACK_NEW_RELEASES);
    const [upcomingTeasers, setUpcomingTeasers] = useState<any[]>(FALLBACK_UPCOMING_TEASERS);
    const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
    const [spotlightArtists, setSpotlightArtists] = useState(INITIAL_SPOTLIGHT_ARTISTS);
    const [loading, setLoading] = useState(true);

    // Hero Promo Spotlight countdown State (releasing next Friday)
    const [countdown, setCountdown] = useState({ days: 4, hours: 14, minutes: 32, seconds: 5 });

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load dynamic music from API (YouTube Search Queries) and real Artist Photos
    useEffect(() => {
        setLoading(true);

        const fetchDynamicData = async () => {
            try {
                // Fetch dynamic New Releases
                const newReleaseResults = await libraryService.search('nhạc mới phát hành 2026');
                if (newReleaseResults && newReleaseResults.length > 0) {
                    // Mix search results with fallback to ensure high quality visuals
                    const merged = [...newReleaseResults.slice(0, 8), ...FALLBACK_NEW_RELEASES];
                    const unique = merged.filter((track, index, self) => 
                        self.findIndex(t => t.id === track.id) === index
                    );
                    setNewReleases(unique.slice(0, 12));
                }

                // Fetch dynamic Upcoming / Teaser Clips
                const teaserResults = await libraryService.search('mv teaser official 2026');
                if (teaserResults && teaserResults.length > 0) {
                    const formattedTeasers = teaserResults.slice(0, 6).map((t, idx) => {
                        const badges = ['MV TEASER', 'OFFICIAL PREVIEW', 'DEMO CLIP', 'STUDIO TEASER'];
                        const colors = [
                            'bg-red-500/20 text-red-400 border border-red-500/30',
                            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        ];
                        const randomDays = Math.floor(Math.random() * 14) + 2;
                        return {
                            ...t,
                            badge: badges[idx % badges.length],
                            badgeColor: colors[idx % colors.length],
                            releaseInfo: `Releasing in ${randomDays} days`,
                            daysLeft: randomDays
                        };
                    });
                    setUpcomingTeasers([...formattedTeasers, ...FALLBACK_UPCOMING_TEASERS]);
                }

                // Fetch Trending releases
                const trendingResults = await libraryService.search('vietnamese billboard top 100');
                if (trendingResults && trendingResults.length > 0) {
                    setTrendingTracks(trendingResults.slice(0, 12));
                }
            } catch (err) {
                console.error("Error fetching Explore data:", err);
            } finally {
                setLoading(false);
            }
        };

        const loadArtistPhotos = async () => {
            const updatedArtists = await Promise.all(
                INITIAL_SPOTLIGHT_ARTISTS.map(async (artist) => {
                    try {
                        const info = await libraryService.getArtistInfo(artist.name);
                        if (info && info.photo && !info.isPlaceholder) {
                            return { ...artist, photo: info.photo };
                        }
                    } catch (e) {
                        console.error(`Failed to load photo for ${artist.name}`, e);
                    }
                    return artist;
                })
            );
            setSpotlightArtists(updatedArtists);
        };

        fetchDynamicData();
        loadArtistPhotos();
    }, []);

    // Format Countdown values with leading zeros
    const formatNumber = (num: number) => num.toString().padStart(2, '0');

    // Handle play collection
    const playCurrentSelection = (track: Track, list: Track[]) => {
        playTrack(track, list);
    };

    return (
        <div className="min-h-full bg-spotify-base p-6 pb-32 no-scrollbar text-white select-none">
            {/* Page Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-red-600/10 rounded-2xl text-red-500 border border-red-500/10">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Explore</h1>
                    <p className="text-sm text-neutral-400">Discover hot new tracks and upcoming releases</p>
                </div>
            </div>

            {/* Hero Hype Spotlight Banner */}
            <div className="relative w-full rounded-3xl overflow-hidden mb-8 border border-white/5 bg-gradient-to-r from-red-950/20 via-black to-neutral-900 group">
                <div className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-overlay group-hover:scale-105 transition duration-1000" style={{ backgroundImage: `url('https://i.ytimg.com/vi/zoEtcR5EW08/hq720.jpg')` }} />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                
                <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 z-10">
                    <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10 group-hover:scale-[1.02] transition duration-500 relative bg-[#1c1c1c]">
                        <CoverImage 
                            src="https://i.ytimg.com/vi/zoEtcR5EW08/hq720.jpg" 
                            alt="Spotlight Album"
                            className="w-full h-full object-cover"
                            fallbackText="SL"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                            <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition active:scale-95 hover:bg-red-700">
                                <Play className="fill-current text-white ml-1 w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                        <span className="inline-flex self-center md:self-start px-3 py-1 bg-red-600/20 text-red-500 text-xs font-bold tracking-wider rounded-full border border-red-500/20 uppercase mb-3">
                            Spotlight Preview
                        </span>
                        
                        <h2 className="text-3xl sm:text-5xl font-black mb-2 text-white tracking-tight leading-tight">
                            CHÚNG TA CỦA TƯƠNG LAI
                        </h2>
                        <p className="text-lg text-neutral-300 font-bold mb-4">Sơn Tùng M-TP</p>
                        
                        {/* Countdown Timer */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                            <div className="text-neutral-400 text-xs font-bold tracking-wider uppercase">Full Song Releasing In:</div>
                            <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-black">
                                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 min-w-[50px] text-center">
                                    <span className="text-white">{formatNumber(countdown.days)}</span>
                                    <div className="text-[9px] font-sans text-neutral-400 uppercase font-bold tracking-normal mt-0.5">Days</div>
                                </div>
                                <span className="text-neutral-500 font-sans">:</span>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 min-w-[50px] text-center">
                                    <span className="text-white">{formatNumber(countdown.hours)}</span>
                                    <div className="text-[9px] font-sans text-neutral-400 uppercase font-bold tracking-normal mt-0.5">Hrs</div>
                                </div>
                                <span className="text-neutral-500 font-sans">:</span>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 min-w-[50px] text-center">
                                    <span className="text-white">{formatNumber(countdown.minutes)}</span>
                                    <div className="text-[9px] font-sans text-neutral-400 uppercase font-bold tracking-normal mt-0.5">Min</div>
                                </div>
                                <span className="text-neutral-500 font-sans">:</span>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 min-w-[50px] text-center">
                                    <span className="text-red-500 animate-pulse">{formatNumber(countdown.seconds)}</span>
                                    <div className="text-[9px] font-sans text-neutral-400 uppercase font-bold tracking-normal mt-0.5">Sec</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6">
                            <button 
                                onClick={() => playTrack(FALLBACK_NEW_RELEASES[0])}
                                className="bg-white text-black hover:bg-neutral-200 font-bold px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-lg text-sm uppercase tracking-wider"
                            >
                                <Play className="fill-current text-black w-4 h-4" />
                                Listen Teaser
                            </button>
                            <button className="bg-white/10 border border-white/10 text-white hover:bg-white/20 font-bold px-6 py-3 rounded-full hover:scale-105 active:scale-95 transition text-sm uppercase tracking-wider">
                                Pre-Save Album
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Tab Switchers */}
            <div className="flex border-b border-white/5 mb-8 select-none overflow-x-auto no-scrollbar gap-6">
                <button
                    onClick={() => setActiveTab('new-releases')}
                    className={`pb-4 px-1 text-base font-extrabold relative transition-colors duration-250 whitespace-nowrap ${
                        activeTab === 'new-releases' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        <span>New Releases</span>
                    </div>
                    {activeTab === 'new-releases' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('upcoming-teasers')}
                    className={`pb-4 px-1 text-base font-extrabold relative transition-colors duration-250 whitespace-nowrap ${
                        activeTab === 'upcoming-teasers' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Releasing Soon</span>
                    </div>
                    {activeTab === 'upcoming-teasers' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('trending')}
                    className={`pb-4 px-1 text-base font-extrabold relative transition-colors duration-250 whitespace-nowrap ${
                        activeTab === 'trending' ? 'text-red-500' : 'text-neutral-400 hover:text-white'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        <span>Trending Charts</span>
                    </div>
                    {activeTab === 'trending' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full" />
                    )}
                </button>
            </div>

            {/* TAB CONTENT: NEW RELEASES */}
            {activeTab === 'new-releases' && (
                loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {Array.from({ length: 12 }).map((_, idx) => (
                            <div key={idx} className="space-y-3">
                                <Skeleton className="w-full aspect-square rounded-2xl animate-pulse" />
                                <Skeleton className="h-4 w-3/4 animate-pulse" />
                                <Skeleton className="h-3 w-1/2 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-red-500" />
                                Fresh Out of the Studio
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {newReleases.map((track) => {
                                const isLiked = likedTracks.has(track.id);
                                return (
                                    <div 
                                        key={track.id} 
                                        onClick={() => playCurrentSelection(track, newReleases)}
                                        className="bg-[#1f1f1f]/20 hover:bg-[#1f1f1f]/80 border border-white/5 hover:border-white/10 p-3 rounded-2xl group cursor-pointer transition-all duration-300 relative flex flex-col h-full hover:-translate-y-1"
                                    >
                                        <div className="relative mb-3 aspect-square w-full rounded-xl overflow-hidden shadow-md bg-[#1c1c1c]">
                                            <CoverImage
                                                src={track.cover_url}
                                                alt={track.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                fallbackText={track.title.substring(0, 2).toUpperCase()}
                                            />
                                            {/* Hover play overlay */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95 hover:bg-neutral-100">
                                                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                                </div>
                                            </div>
                                            {/* New release badge */}
                                            <span className="absolute top-2 left-2 bg-red-600 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-lg tracking-wider">
                                                NEW
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-white text-sm mb-0.5 truncate group-hover:text-red-500 transition-colors" title={track.title}>
                                            {track.title}
                                        </h3>
                                        <p className="text-xs text-neutral-400 truncate mb-2">{track.artist}</p>
                                        
                                        {/* Row of quick controls */}
                                        <div className="mt-auto pt-2 flex items-center justify-between border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleLike(track);
                                                }}
                                                className="text-neutral-400 hover:text-red-500 transition active:scale-95"
                                            >
                                                {isLiked ? <Heart className="w-4 h-4 fill-current text-red-500" /> : <Heart className="w-4 h-4" />}
                                            </button>
                                            <span className="text-[10px] font-bold text-neutral-500 tracking-wider">
                                                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : 'PLAY'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            )}

            {/* TAB CONTENT: UPCOMING TEASERS */}
            {activeTab === 'upcoming-teasers' && (
                loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="space-y-3 bg-white/5 p-4 rounded-3xl animate-pulse">
                                <Skeleton className="w-full aspect-square rounded-2xl" />
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-red-500" />
                                    Upcoming Artist Teasers & Demos
                                </h2>
                                <p className="text-xs text-neutral-400 mt-1">Get an early sneak peek of tracks about to drop. Playable now!</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {upcomingTeasers.map((teaser) => (
                                <div 
                                    key={teaser.id} 
                                    onClick={() => playTrack(teaser)}
                                    className="bg-gradient-to-b from-[#1c1c1c] to-[#0f0f0f] border border-white/5 hover:border-red-600/30 p-4 rounded-3xl group cursor-pointer transition-all duration-300 relative flex flex-col h-full hover:shadow-[0_8px_30px_rgb(255,0,0,0.05)] hover:-translate-y-1"
                                >
                                    {/* Cover image area */}
                                    <div className="relative mb-4 aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-[#1c1c1c]">
                                        <CoverImage
                                            src={teaser.cover_url}
                                            alt={teaser.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            fallbackText="UP"
                                        />
                                        
                                        {/* Play Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                                            <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95 hover:bg-red-700">
                                                <Play className="fill-current text-white ml-1 w-6 h-6 animate-pulse" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-white/90">Play Teaser</span>
                                        </div>

                                        {/* Colorful Category badge */}
                                        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md ${teaser.badgeColor || 'bg-neutral-800 text-neutral-300 border border-neutral-700/50'}`}>
                                            {teaser.badge || 'TEASER'}
                                        </span>

                                        {/* Count down days left tag */}
                                        {teaser.daysLeft && (
                                            <span className="absolute bottom-3 right-3 bg-black/85 border border-white/10 px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wide flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                                {teaser.daysLeft} Days Left
                                            </span>
                                        )}
                                    </div>

                                    {/* Metadata */}
                                    <h3 className="font-extrabold text-white text-base mb-1 line-clamp-2 group-hover:text-red-500 transition-colors animate-fade-in" title={teaser.title}>
                                        {teaser.title}
                                    </h3>
                                    <p className="text-xs text-neutral-400 font-bold mb-4">{teaser.artist}</p>

                                    {/* Releasing date info footer */}
                                    <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-neutral-500">
                                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                                            {teaser.releaseInfo || 'Coming Soon'}
                                        </span>
                                        <span className="text-[10px] font-extrabold text-red-500 group-hover:underline uppercase tracking-widest">
                                            Pre-Save
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* TAB CONTENT: TRENDING CHARTS */}
            {activeTab === 'trending' && (
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="flex gap-4 p-3 bg-white/5 rounded-2xl items-center animate-pulse">
                                <Skeleton className="w-16 h-16 rounded-xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Flame className="w-5 h-5 text-red-500" />
                                Trending New Releases (Billboard Chart)
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trendingTracks.map((track, idx) => {
                                const isLiked = likedTracks.has(track.id);
                                return (
                                    <div 
                                        key={track.id} 
                                        onClick={() => playCurrentSelection(track, trendingTracks)}
                                        className="flex items-center gap-4 bg-[#1f1f1f]/20 hover:bg-[#1f1f1f]/60 p-3 rounded-2xl cursor-pointer group transition border border-white/5 hover:border-white/10"
                                    >
                                        <div className="font-mono text-xl font-extrabold text-neutral-500 w-8 text-center group-hover:text-red-500 transition-colors">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </div>
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow flex-shrink-0 bg-[#1c1c1c]">
                                            <CoverImage 
                                                src={track.cover_url}
                                                alt={track.title}
                                                className="w-full h-full object-cover"
                                                fallbackText={track.title.substring(0, 2).toUpperCase()}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                                                <Play className="fill-current text-white w-5 h-5" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white text-sm truncate group-hover:text-red-500 transition-colors" title={track.title}>
                                                {track.title}
                                            </h4>
                                            <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleLike(track);
                                                }}
                                                className="text-neutral-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100 active:scale-95"
                                            >
                                                {isLiked ? <Heart className="w-4 h-4 fill-current text-red-500" /> : <Heart className="w-4 h-4" />}
                                            </button>
                                            <span className="text-xs font-mono text-neutral-500 mr-2">
                                                {track.duration ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}` : '03:45'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            )}

            {/* SECTION 3: EMERGING ARTIST SPOTLIGHT */}
            <div className="mt-12 select-none">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-red-500" />
                            Rising Artists Spotlight
                        </h2>
                        <p className="text-xs text-neutral-400 mt-1">Trending artists with hot releases coming up soon</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {spotlightArtists.map((artist) => (
                        <Link 
                            to={`/artist/${encodeURIComponent(artist.name)}`}
                            key={artist.name}
                            className="bg-[#1f1f1f]/20 hover:bg-[#1f1f1f]/60 p-4 rounded-3xl border border-white/5 hover:border-red-500/20 text-center flex flex-col items-center group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(255,0,0,0.03)]"
                        >
                            <div className="relative mb-4 w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-red-500/50 shadow-lg group-hover:scale-105 transition-all duration-500 bg-[#1c1c1c]">
                                <img
                                    src={artist.photo}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <Disc className="w-8 h-8 text-red-500 animate-spin" style={{ animationDuration: '3s' }} />
                                </div>
                            </div>
                            <h3 className="font-extrabold text-white text-sm mb-1 truncate w-full group-hover:text-red-500 transition-colors">
                                {artist.name}
                            </h3>
                            <span className="text-[10px] font-extrabold tracking-wider text-neutral-500 uppercase">
                                {artist.genre}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

