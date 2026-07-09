import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft, Flame, TrendingUp, Disc, Star, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';
import type { Track } from '../types';

const CHART_CONFIG: Record<string, { title: string; icon: React.ReactNode; queries: string[] }> = {
    'top-hits': { 
        title: 'Top Hits', 
        icon: <Flame className="w-6 h-6 text-orange-500" />,
        queries: [
            'Son Tung M-TP', 
            'HIEUTHUHAI', 
            'Den Vau', 
            'MONO',
            'Binz',
            'Tlinh',
            'JustaTee',
            'Hoang Dung'
        ]
    },
    'trending': { 
        title: 'Trending Now', 
        icon: <TrendingUp className="w-6 h-6 text-green-500" />,
        queries: [
            'Rap Viet', 
            'V-Pop 2024', 
            'Nhạc trẻ', 
            'Amee',
            'Erik',
            'Viral TikTok Vietnam',
            'Low G',
            'MCK'
        ]
    },
    'top-albums': { 
        title: 'Top Albums', 
        icon: <Disc className="w-6 h-6 text-blue-500" />,
        queries: [
            'Son Tung M-TP', 
            'HIEUTHUHAI', 
            'Den Vau', 
            'Hoang Dung',
            'Vũ',
            'MONO',
            'Tlinh',
            'Binz'
        ]
    },
    'hits-collection': { 
        title: 'Hits Collection', 
        icon: <Star className="w-6 h-6 text-yellow-500" />,
        queries: [
            'Nhạc Việt hay nhất', 
            'Vietnamese hits', 
            'V-Pop hits',
            'Nhạc Trẻ',
            'Top nhạc Việt',
            'Vietnamese pop hits',
            'Best of Vietnamese music',
            'Vietnamese classic hits'
        ]
    },
};

export default function ChartsSection() {
    const [searchParams] = useSearchParams();
    const chartType = searchParams.get('chart_type') || 'top-hits';
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
    const playTrack = usePlayerStore(s => s.playTrack);

    const config = CHART_CONFIG[chartType] || CHART_CONFIG['top-hits'];

    useEffect(() => {
        setLoading(true);
        setTracks([]);
        setCurrentQueryIndex(0);
        
        libraryService.getCharts(chartType)
            .then(data => {
                setTracks(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [chartType]);

    const loadMore = useCallback(async () => {
        if (loadingMore || currentQueryIndex >= config.queries.length - 1) return;
        
        setLoadingMore(true);
        const nextQuery = config.queries[currentQueryIndex + 1];
        
        try {
            const moreTracks = await libraryService.search(nextQuery);
            setTracks(prev => {
                const existingIds = new Set(prev.map(t => t.id));
                const newTracks = moreTracks.filter(t => !existingIds.has(t.id));
                return [...prev, ...newTracks];
            });
            setCurrentQueryIndex(prev => prev + 1);
        } catch (err) {
            console.error('Failed to load more:', err);
        }
        
        setLoadingMore(false);
    }, [loadingMore, currentQueryIndex, config.queries]);

    useEffect(() => {
        const handleScroll = () => {
            if (loadingMore || currentQueryIndex >= config.queries.length - 1) return;
            
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            
            if (scrollTop + clientHeight >= scrollHeight - 500) {
                loadMore();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadingMore, currentQueryIndex, config.queries.length, loadMore]);

    return (
        <div className="h-full overflow-y-auto no-scrollbar pb-24 p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/">
                    <ArrowLeft className="w-6 h-6 text-neutral-400 hover:text-white transition" />
                </Link>
                <div className="flex items-center gap-3">
                    {config.icon}
                    <h1 className="text-3xl font-bold">{config.title}</h1>
                </div>
            </div>

            {/* Tracks count */}
            {!loading && tracks.length > 0 && (
                <p className="text-sm text-neutral-400 mb-4">{tracks.length} tracks</p>
            )}

            {/* Tracks Grid */}
            {loading ? (
                <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                        <div key={i} className="bg-[#1f1f1f]/30 p-3 rounded-2xl border border-white/5 space-y-3">
                            <Skeleton className="w-full aspect-square rounded-xl animate-pulse" />
                            <Skeleton className="h-4 w-3/4 animate-pulse" />
                            <Skeleton className="h-3 w-1/2 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                        {tracks.map((track, idx) => (
                            <div
                                key={track.id}
                                onClick={() => playTrack(track, tracks)}
                                className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer h-full flex flex-col border border-white/5"
                            >
                                <div className="relative mb-3">
                                    <div className="absolute top-1 left-1 z-10 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-white">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </div>
                                    <CoverImage
                                        src={track.cover_url}
                                        alt={track.title}
                                        className="w-full aspect-square rounded-xl shadow-lg"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                            <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-white mb-1 truncate text-xs md:text-base">{track.title}</h3>
                                <p className="text-neutral-400 text-xs md:text-sm truncate">{track.artist}</p>
                            </div>
                        ))}
                    </div>

                    {/* Load More Indicator */}
                    {loadingMore && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}

                    {/* Load More Button */}
                    {!loadingMore && currentQueryIndex < config.queries.length - 1 && (
                        <div className="flex justify-center py-8">
                            <button
                                onClick={loadMore}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </>
            )}

            {!loading && tracks.length === 0 && (
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold mb-2">No tracks found</h2>
                    <p className="text-neutral-400">This chart is empty.</p>
                </div>
            )}
        </div>
    );
}
