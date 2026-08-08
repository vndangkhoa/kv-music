import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft, Flame, TrendingUp, Disc, Star, Volume2 } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';
import { formatCount } from '../utils/format';
import type { Track } from '../types';

const CHART_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
    'top-hits': { 
        title: 'BXH REALTIME BÀI HÁT HOT', 
        icon: <Flame className="w-6 h-6 text-cyan-400 fill-cyan-400" />
    },
    'trending': { 
        title: 'BXH NHẠC TRẺ VIỆT NAM', 
        icon: <TrendingUp className="w-6 h-6 text-[#00d2d3]" />
    },
    'top-albums': { 
        title: 'BXH TOP 100 BÀI HÁT VIỆT NAM', 
        icon: <Disc className="w-6 h-6 text-blue-400" />
    },
    'hits-collection': { 
        title: 'BXH ÂU MỸ & QUỐC TẾ', 
        icon: <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
    },
};

export default function ChartsSection() {
    const [searchParams] = useSearchParams();
    const chartType = searchParams.get('chart_type') || 'top-hits';
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const playTrack = usePlayerStore(s => s.playTrack);

    const config = CHART_CONFIG[chartType] || CHART_CONFIG['top-hits'];

    useEffect(() => {
        setLoading(true);
        setTracks([]);
        
        libraryService.getCharts(chartType)
            .then(data => {
                setTracks(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [chartType]);

    return (
        <div className="h-full bg-[#0b132d] text-white overflow-y-auto no-scrollbar pb-28 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-cyan-500/20">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-xl bg-[#142044] hover:bg-cyan-500/20 border border-cyan-500/20 transition">
                        <ArrowLeft className="w-5 h-5 text-cyan-400" />
                    </Link>
                    <div className="flex items-center gap-3">
                        {config.icon}
                        <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{config.title}</h1>
                    </div>
                </div>

                {!loading && tracks.length > 0 && (
                    <button
                        onClick={() => playTrack(tracks[0], tracks)}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white rounded-full font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 active:scale-95 transition flex items-center gap-2"
                    >
                        <Play className="w-4 h-4 fill-white" />
                        Phát Tất Cả ({tracks.length})
                    </button>
                )}
            </div>

            {/* NCT BXH Ranked List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {tracks.map((track, idx) => {
                        const isTop1 = idx === 0;
                        const isTop2 = idx === 1;
                        const isTop3 = idx === 2;

                        return (
                            <div
                                key={track.id || idx}
                                onClick={() => playTrack(track, tracks)}
                                className={`group flex items-center gap-4 p-3 rounded-2xl transition cursor-pointer border ${
                                    isTop1 ? 'bg-gradient-to-r from-amber-500/20 via-[#142044] to-[#142044] border-amber-500/40 shadow-lg shadow-amber-500/10' :
                                    isTop2 ? 'bg-gradient-to-r from-cyan-500/20 via-[#142044] to-[#142044] border-cyan-500/40 shadow-lg shadow-cyan-500/10' :
                                    isTop3 ? 'bg-gradient-to-r from-blue-500/20 via-[#142044] to-[#142044] border-blue-500/40 shadow-lg shadow-blue-500/10' :
                                    'bg-[#142044]/60 hover:bg-[#1c2c5b] border-cyan-500/10'
                                }`}
                            >
                                {/* Rank Number */}
                                <div className={`w-10 text-center font-black text-xl flex-shrink-0 ${
                                    isTop1 ? 'text-amber-400 text-2xl drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]' :
                                    isTop2 ? 'text-cyan-400 text-xl' :
                                    isTop3 ? 'text-blue-400 text-xl' :
                                    'text-neutral-400'
                                }`}>
                                    {idx + 1}
                                </div>

                                {/* Cover Image */}
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                                    <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                    </div>
                                </div>

                                {/* Track Title & Artist */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-white text-sm md:text-base truncate group-hover:text-cyan-300 transition">
                                        {track.title}
                                    </h3>
                                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                                        {track.artist}
                                    </p>
                                </div>

                                {/* Views badge */}
                                <div className="hidden sm:flex items-center gap-1 px-3 py-1 bg-[#0b132d] rounded-lg border border-cyan-500/15 text-xs font-bold text-cyan-400">
                                    <span>{track.view_count ? formatCount(track.view_count) : ''}</span>
                                </div>

                                <button className="p-2 rounded-full text-neutral-400 hover:text-cyan-400 transition">
                                    <Volume2 className="w-5 h-5 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
