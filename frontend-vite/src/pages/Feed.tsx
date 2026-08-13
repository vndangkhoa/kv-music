import { useEffect, useState } from 'react';
import { Sparkles, Heart, Clock, Music2, Flame, Rss } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { libraryService } from '../services/library';
import { Track } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import SoundCloudSidebar from '../components/SoundCloudSidebar';

interface FeedMix {
    id: string;
    title: string;
    artist?: string;
    thumb?: string;
    section?: string;
}

export default function Feed() {
    const playHistory = usePlayerStore(s => s.playHistory);
    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playTrack = usePlayerStore(s => s.playTrack);

    const [tab, setTab] = useState<'stream' | 'spotlight'>('stream');
    const [suggestions, setSuggestions] = useState<Track[]>([]);
    const [mixes, setMixes] = useState<FeedMix[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFeed = async () => {
        setLoading(true);
        try {
            try {
                const res = await fetch('/api/feed');
                const sections = await res.json();
                if (Array.isArray(sections) && sections.length > 0) {
                    const mapped: FeedMix[] = sections
                        .slice(0, 3)
                        .flatMap((sec: any) => (sec.items || []).map((item: any) => ({
                            id: item.playlistId || item.videoId || `mix-${item.title}`,
                            title: item.title,
                            artist: item.artist,
                            thumb: item.thumb,
                            section: sec.title,
                        })));
                    if (mapped.length > 0) setMixes(mapped.slice(0, 12));
                }
            } catch { /* bridge unavailable */ }

            const res2 = await libraryService.getSmartSuggestions(playHistory, likedTracksData);
            if (res2 && res2.tracks.length > 0) {
                setSuggestions(res2.tracks.slice(0, 15));
            } else {
                const charts = await libraryService.getCharts('trending');
                setSuggestions((charts || []).slice(0, 15));
            }
        } catch (e) {
            console.error('feed load error', e);
        } finally {
            setLoading(false);
        }
    };

    const { containerRef, pullProps, indicator } = usePullToRefresh(loadFeed);

    useEffect(() => {
        loadFeed();
    }, [playHistory.length, likedTracksData.length]);

    const playMix = async (mix: FeedMix) => {
        const tracks = await libraryService.search(mix.title);
        if (tracks && tracks.length > 0) playTrack(tracks[0], tracks);
    };

    const heroMix = mixes[0];

    return (
        <div className="min-h-full text-white bg-[#121212]">
            <div
                ref={containerRef}
                {...pullProps}
                className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 flex gap-8 overflow-y-auto no-scrollbar"
                style={{ minHeight: '100%' }}
            >
                {indicator}

                {/* Main Column */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Header & Tabs */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <Rss className="w-5 h-5 text-[#ff5500]" />
                            <h1 className="text-xl font-extrabold text-white">Stream</h1>
                        </div>
                        <div className="flex bg-[#181818] border border-white/10 p-0.5 rounded-full">
                            {(['stream', 'spotlight'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`px-4 py-1 rounded-full text-xs font-bold capitalize transition ${
                                        tab === t ? 'bg-[#ff5500] text-white shadow' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    {t === 'stream' ? 'Recent Feed' : 'Spotlight'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {tab === 'stream' ? (
                        <div className="space-y-4">
                            {/* Stream Items */}
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                                </div>
                            ) : (
                                suggestions.map((track, i) => (
                                    <SoundCloudTrackCard
                                        key={`${track.id}-${i}`}
                                        track={track}
                                        queue={suggestions}
                                        repostedBy={i % 3 === 0 ? track.artist : undefined}
                                    />
                                ))
                            )}

                            {/* Recent Activity */}
                            {playHistory.length > 0 && (
                                <div className="pt-4 border-t border-white/10 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                        <Clock className="w-4 h-4 text-[#ff5500]" />
                                        <span>Recently Played by You</span>
                                    </div>
                                    <div className="space-y-3">
                                        {playHistory.slice(0, 5).map((track, i) => (
                                            <SoundCloudTrackCard
                                                key={`history-${track.id}-${i}`}
                                                track={track}
                                                queue={playHistory}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {heroMix && (
                                <button
                                    onClick={() => playMix(heroMix)}
                                    className="relative w-full aspect-video md:aspect-[16/7] rounded-xl overflow-hidden group text-left border border-white/10"
                                >
                                    <CoverImage
                                        src={heroMix.thumb}
                                        alt={heroMix.title}
                                        className="w-full h-full object-cover brightness-[0.6] group-hover:brightness-[0.5] transition duration-300"
                                        fallbackText="♪"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/30 to-transparent flex flex-col justify-end p-5 md:p-7">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff5500] mb-1.5 flex items-center gap-1">
                                            <Flame className="w-3.5 h-3.5" /> Featured Mix
                                        </span>
                                        <h2 className="text-xl md:text-3xl font-extrabold text-white line-clamp-1">{heroMix.title}</h2>
                                        <p className="text-xs text-neutral-300 mt-1">{heroMix.section || 'SoundCloud'}</p>
                                    </div>
                                </button>
                            )}

                            <div>
                                <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-3">
                                    <Music2 className="w-4 h-4 text-[#ff5500]" />
                                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Quick Picks</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {mixes.map((mix, i) => (
                                        <button key={`${mix.id}-${i}`} onClick={() => playMix(mix)} className="group text-left bg-[#181818] p-2 rounded-lg border border-white/5 hover:border-white/10 transition">
                                            <CoverImage
                                                src={mix.thumb}
                                                alt={mix.title}
                                                className="w-full aspect-square rounded object-cover group-hover:scale-105 transition"
                                                fallbackText="♪"
                                            />
                                            <p className="text-xs font-bold text-white truncate mt-2 group-hover:text-[#ff5500] transition">{mix.title}</p>
                                            <p className="text-[10px] text-neutral-400 truncate">{mix.artist || mix.section}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop SoundCloud Right Sidebar */}
                <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
                    <SoundCloudSidebar />
                </div>
            </div>
        </div>
    );
}
