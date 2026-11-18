import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Disc, TrendingUp, Smile } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { usePagedList } from '../hooks/usePagedList';
import { libraryService } from '../services/library';
import { safeStorage } from '../utils/safeStorage';
import { toast } from '../stores/toastStore';
import { Track } from '../types';
import TrackRow, { YtmCarousel, YtmMediaCard } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';

interface FeedMix {
    id: string;
    title: string;
    artist?: string;
    thumb?: string;
    section?: string;
}

const MOOD_GENRE_TILES: { label: string; query: string; color: string }[] = [
    { label: 'Chill', query: 'Chill lofi music', color: '#A4C5FF' },
    { label: 'Commute', query: 'Commute pop hits', color: '#FFC200' },
    { label: 'Energize', query: 'Energize workout upbeat', color: '#FFE780' },
    { label: 'Feel good', query: 'Feel good happy hits', color: '#A4FFA4' },
    { label: 'Focus', query: 'Focus instrumental study', color: '#CCCCCC' },
    { label: 'Gaming', query: 'Gaming electronic bass', color: '#606060' },
    { label: 'Party', query: 'Party dance club hits', color: '#B47BFF' },
    { label: 'Romance', query: 'Romantic love songs', color: '#CC0000' },
    { label: 'Sad', query: 'Sad acoustic ballads', color: '#8C8C8C' },
    { label: 'Sleep', query: 'Sleep ambient piano', color: '#7B3EDB' },
    { label: 'Workout', query: 'Workout gym motivation', color: '#FF8D40' },
    { label: 'Hip-hop', query: 'Hip hop rap hits', color: '#E24B00' },
    { label: 'Pop', query: 'Pop top hits', color: '#FF78FF' },
    { label: 'R&B & soul', query: 'R&B soul chill', color: '#7B3EDB' },
    { label: 'Rock', query: 'Rock alternative hits', color: '#CC0000' },
    { label: 'Dance & electronic', query: 'Dance EDM electronic', color: '#0092BF' },
    { label: 'Indie & alternative', query: 'Indie alternative chill', color: '#CCCCCC' },
    { label: 'K-Pop', query: 'K-Pop top hits', color: '#B47BFF' },
    { label: 'J-Pop', query: 'J-Pop hits', color: '#FF78FF' },
    { label: 'Jazz', query: 'Jazz cafe instrumental', color: '#A4C5FF' },
    { label: 'Folk & acoustic', query: 'Folk acoustic guitar', color: '#00A513' },
    { label: 'V-Pop', query: 'V-Pop hits Vietnam', color: '#FF4E45' },
    { label: 'Vietnamese Indie', query: 'Indie Vietnam', color: '#2BA640' },
    { label: 'Classical', query: 'Classical piano orchestra', color: '#A4C5FF' },
];

export default function Feed() {
    const playHistory = usePlayerStore(s => s.playHistory);
    const likedTracksData = usePlayerStore(s => s.likedTracksData);
    const playTrack = usePlayerStore(s => s.playTrack);

    const [suggestions, setSuggestions] = useState<Track[]>([]);
    const [suggestionReason, setSuggestionReason] = useState<string>('Trending & picked for you');
    const [mixes, setMixes] = useState<FeedMix[]>([]);
    const [newReleases, setNewReleases] = useState<Track[]>([]);
    const [activeMood, setActiveMood] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [releasesLoading, setReleasesLoading] = useState(true);

    const { visible: visibleSuggestions, total: totalSuggestions, hasMore, sentinelRef } =
        usePagedList(suggestions, 8, 6);

    const loadFeed = async () => {
        try {
            const cached = safeStorage.getItem('kv_feed_cache_v1');
            if (cached) {
                const parsed = JSON.parse(cached) as Track[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSuggestions(parsed);
                    setLoading(false);
                }
            }
        } catch {
            /* ignore */
        }

        try {
            const mixesPromise = (async () => {
                try {
                    const res = await fetch('/api/feed');
                    const sections = await res.json();
                    if (Array.isArray(sections) && sections.length > 0) {
                        const mapped: FeedMix[] = sections
                            .slice(0, 3)
                            .flatMap((sec: any) =>
                                (sec.items || []).map((item: any) => ({
                                    id: item.playlistId || item.videoId || `mix-${item.title}`,
                                    title: item.title,
                                    artist: item.artist,
                                    thumb: item.thumb,
                                    section: sec.title,
                                }))
                            );
                        if (mapped.length > 0) setMixes(mapped.slice(0, 14));
                    }
                } catch {
                    /* bridge unavailable */
                }
            })();

            const releasesPromise = (async () => {
                setReleasesLoading(true);
                try {
                    const releases = await libraryService.getNewReleases('vn');
                    if (releases && releases.length > 0) {
                        setNewReleases(releases.slice(0, 16));
                    }
                } catch {
                    /* ignore */
                } finally {
                    setReleasesLoading(false);
                }
            })();

            const chartsPromise = (async () => {
                if (suggestions.length === 0) {
                    try {
                        const charts = await libraryService.getCharts('trending');
                        if (charts && charts.length > 0) {
                            setSuggestions(charts.slice(0, 16));
                            setLoading(false);
                        }
                    } catch {
                        /* ignore */
                    }
                }
            })();

            await Promise.allSettled([mixesPromise, releasesPromise, chartsPromise]);

            const res2 = await libraryService.getSmartSuggestions(playHistory, likedTracksData);
            if (res2 && res2.tracks.length > 0) {
                const next = res2.tracks.slice(0, 20);
                setSuggestions(next);
                if (res2.reason) setSuggestionReason(res2.reason);
                try {
                    safeStorage.setItem('kv_feed_cache_v1', JSON.stringify(next));
                } catch {
                    /* ignore */
                }
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
        try {
            const tracks = await libraryService.search(mix.title);
            if (tracks && tracks.length > 0) playTrack(tracks[0], tracks);
        } catch (e) {
            console.error('Failed to play mix', e);
        }
    };

    const handleMoodClick = async (tile: { label: string; query: string }) => {
        setActiveMood(tile.label);
        try {
            const tracks = await libraryService.search(tile.query);
            if (tracks && tracks.length > 0) {
                playTrack(tracks[0], tracks);
                toast(`Playing ${tile.label}`);
            } else {
                toast(`No tracks found for ${tile.label}`);
            }
        } catch {
            toast('Could not load mood tracks');
        }
    };

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Build 4-row carousel columns for Trending / Picked for you
    const trendingColumns = useMemo(() => {
        const cols: Track[][] = [];
        const slice = suggestions.slice(0, 16);
        for (let i = 0; i < slice.length; i += 4) {
            cols.push(slice.slice(i, i + 4));
        }
        return cols;
    }, [suggestions]);

    return (
        <div
            ref={containerRef}
            {...pullProps}
            className="min-h-full bg-transparent text-white"
        >
            {indicator}

            <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-10">
                {/* 1. Top 3 YTM Navigation Button Renderers */}
                <section aria-label="Explore categories">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => scrollToSection('new-releases')}
                            className="h-14 bg-[#212121] hover:bg-[#2a2a2a] rounded-[6px] px-4 flex items-center gap-3 text-base font-bold text-white border border-white/[0.06] transition text-left"
                        >
                            <Disc className="w-6 h-6 text-white/90 flex-shrink-0" />
                            <span>New releases</span>
                        </button>

                        <Link
                            to="/charts"
                            className="h-14 bg-[#212121] hover:bg-[#2a2a2a] rounded-[6px] px-4 flex items-center gap-3 text-base font-bold text-white border border-white/[0.06] transition"
                        >
                            <TrendingUp className="w-6 h-6 text-white/90 flex-shrink-0" />
                            <span>Charts</span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => scrollToSection('moods-genres')}
                            className="h-14 bg-[#212121] hover:bg-[#2a2a2a] rounded-[6px] px-4 flex items-center gap-3 text-base font-bold text-white border border-white/[0.06] transition text-left"
                        >
                            <Smile className="w-6 h-6 text-white/90 flex-shrink-0" />
                            <span>Moods & genres</span>
                        </button>
                    </div>
                </section>

                {/* 2. New Albums & Singles Carousel */}
                <YtmCarousel
                    id="new-releases"
                    title="New albums & singles"
                    itemCount={newReleases.length > 0 ? newReleases.length : mixes.length}
                    actionPill={
                        newReleases.length > 0
                            ? { label: 'Play all', onClick: () => playTrack(newReleases[0], newReleases) }
                            : undefined
                    }
                    trackClassName="gap-4 md:gap-6"
                >
                    {releasesLoading && newReleases.length === 0 && mixes.length === 0 ? (
                        [1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 space-y-2.5">
                                <Skeleton className="w-full aspect-square rounded-[6px]" />
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-3.5 w-3/5" />
                            </div>
                        ))
                    ) : newReleases.length > 0 ? (
                        newReleases.map((track, idx) => (
                            <div
                                key={`nr-${track.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${newReleases.length}`}
                                className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    title={track.title}
                                    subtitle={`Single • ${track.artist || 'YouTube Music'}`}
                                    imageUrl={track.cover_url}
                                    to={`/track/${encodeURIComponent(track.id)}`}
                                    onPlay={() => playTrack(track, newReleases)}
                                    fallbackText="♪"
                                />
                            </div>
                        ))
                    ) : (
                        mixes.map((mix, idx) => (
                            <div
                                key={`mix-nr-${mix.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${mixes.length}`}
                                className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    title={mix.title}
                                    subtitle={mix.artist || mix.section || 'Mix'}
                                    imageUrl={mix.thumb}
                                    onClick={() => playMix(mix)}
                                    onPlay={() => playMix(mix)}
                                    fallbackText="♪"
                                />
                            </div>
                        ))
                    )}
                </YtmCarousel>

                {/* 3. Moods & Genres Colored-Stripe Grid */}
                <section id="moods-genres" className="space-y-4">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h2
                                className="text-[22px] sm:text-[24px] md:text-[28px] font-bold tracking-tight text-white leading-[1.2]"
                                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                            >
                                Moods & genres
                            </h2>
                        </div>
                        {activeMood && (
                            <span className="text-xs font-medium text-white/70 bg-white/10 px-3 py-1 rounded-full">
                                Playing: {activeMood}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {MOOD_GENRE_TILES.map((tile) => {
                            const isSelected = activeMood === tile.label;
                            return (
                                <button
                                    key={tile.label}
                                    type="button"
                                    onClick={() => handleMoodClick(tile)}
                                    style={{ borderLeftColor: tile.color }}
                                    className={`h-12 bg-[#212121] hover:bg-[#2a2a2a] rounded-[6px] px-4 border-l-[6px] flex items-center text-sm font-medium text-white transition text-left truncate ${
                                        isSelected ? 'ring-1 ring-white/40 bg-[#2a2a2a]' : ''
                                    }`}
                                >
                                    <span className="truncate">{tile.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* 4. Trending / Picked for you 4-Row Carousel */}
                {trendingColumns.length > 0 && (
                    <YtmCarousel
                        eyebrow={suggestionReason}
                        title="Trending & picked for you"
                        itemCount={trendingColumns.length}
                        actionPill={{ label: 'Charts', to: '/charts' }}
                        trackClassName="gap-6"
                    >
                        {trendingColumns.map((col, colIdx) => (
                            <div
                                key={`feed-col-${colIdx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${colIdx + 1} of ${trendingColumns.length}`}
                                className="min-w-[300px] sm:min-w-[360px] lg:w-[calc((100%-48px)/3)] flex-shrink-0 snap-start flex flex-col"
                            >
                                {col.map((track, rowIdx) => (
                                    <TrackRow
                                        key={`fc-${track.id}-${colIdx}-${rowIdx}`}
                                        track={track}
                                        index={colIdx * 4 + rowIdx}
                                        rankDelta={colIdx === 0 && rowIdx < 3 ? 'up' : 'neutral'}
                                        queue={suggestions}
                                        compact
                                        disableSwipe
                                    />
                                ))}
                            </div>
                        ))}
                    </YtmCarousel>
                )}

                {/* 5. Progressive Stream List (using usePagedList) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2
                            className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
                            style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                        >
                            Picked for you
                        </h2>
                        {suggestions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => playTrack(suggestions[0], suggestions)}
                                className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                            >
                                Play all
                            </button>
                        )}
                    </div>

                    {loading && suggestions.length === 0 ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {visibleSuggestions.map((track, i) => (
                                <TrackRow
                                    key={`feed-list-${track.id}-${i}`}
                                    track={track}
                                    index={i}
                                    queue={suggestions}
                                />
                            ))}
                            {hasMore && (
                                <>
                                    <div ref={sentinelRef} className="pt-2" aria-hidden>
                                        <Skeleton className="h-14 w-full rounded-[6px]" />
                                    </div>
                                    <p className="text-center text-xs text-white/50 pt-1">
                                        Showing {visibleSuggestions.length} of {totalSuggestions}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {/* 6. Featured Feed Mixes (if /api/feed returned items) */}
                {mixes.length > 0 && (
                    <YtmCarousel
                        title="Featured mixes"
                        itemCount={mixes.length}
                        trackClassName="gap-4 md:gap-6"
                    >
                        {mixes.map((mix, idx) => (
                            <div
                                key={`mix-shelf-${mix.id}-${idx}`}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${idx + 1} of ${mixes.length}`}
                                className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                            >
                                <YtmMediaCard
                                    title={mix.title}
                                    subtitle={mix.artist || mix.section || 'Mix'}
                                    imageUrl={mix.thumb}
                                    onClick={() => playMix(mix)}
                                    onPlay={() => playMix(mix)}
                                    fallbackText="♪"
                                />
                            </div>
                        ))}
                    </YtmCarousel>
                )}
            </div>
        </div>
    );
}
