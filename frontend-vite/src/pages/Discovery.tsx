import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import TrackRow, { YtmCarousel, YtmMediaCard } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';
import { safeStorage } from '../utils/safeStorage';

const MOOD_CHIPS = [
  { label: 'All', query: '' },
  { label: 'Energize', query: 'Energize upbeat pop hits' },
  { label: 'Relax', query: 'Relax chill acoustic' },
  { label: 'Workout', query: 'Workout gym hype hits' },
  { label: 'Commute', query: 'Commute driving chill hits' },
  { label: 'Focus', query: 'Focus instrumental lofi beats' },
  { label: 'Podcasts', query: 'Music podcast talk radio' },
  { label: 'Romance', query: 'Romantic love ballads' },
  { label: 'Party', query: 'Party dance club hits' },
] as const;

type ArtistRegionChip = 'VN' | 'US' | 'KR' | 'GB';

const ARTIST_REGIONS: { label: ArtistRegionChip; apiRegion: 'vn' | 'us' | 'kr' | 'cn' }[] = [
  { label: 'VN', apiRegion: 'vn' },
  { label: 'US', apiRegion: 'us' },
  { label: 'KR', apiRegion: 'kr' },
  { label: 'GB', apiRegion: 'cn' },
];

interface ArtistChartItem {
  id: string;
  name: string;
  photo?: string;
  region: string;
  rank: number;
  followers: string;
  topTrack: string;
}

export default function Discovery() {
  const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
  const [loading, setLoading] = useState(true);

  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [defaultQuickPicks, setDefaultQuickPicks] = useState<Track[]>([]);
  const [quickPicks, setQuickPicks] = useState<Track[]>([]);
  const [quickPicksLoading, setQuickPicksLoading] = useState(true);

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [artistRegion, setArtistRegion] = useState<ArtistRegionChip>('VN');
  const [artists, setArtists] = useState<ArtistChartItem[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);

  const playTrack = usePlayerStore(s => s.playTrack);
  const playHistory = usePlayerStore(s => s.playHistory);

  const loadBrowse = async () => {
    try {
      const data = await libraryService.getBrowseContent();
      setBrowseData(data);
      safeStorage.setItem('nct_browse_cache_v1', JSON.stringify(data));
    } catch (e) {
      console.error('browse load error', e);
    } finally {
      setLoading(false);
    }
  };

  const loadChartsAndPicks = async () => {
    setTrendingLoading(true);
    setQuickPicksLoading(true);
    try {
      const charts = await libraryService.getCharts('trending').catch(() => [] as Track[]);
      if (charts.length > 0) {
        setTrendingTracks(charts.slice(0, 10));
        setDefaultQuickPicks(charts.slice(0, 20));
        setQuickPicks((prev) => (selectedMood === 'All' && prev.length === 0 ? charts.slice(0, 20) : prev));
        setTrendingLoading(false);
        setQuickPicksLoading(false);
      }

      const initial = await libraryService.getInitialTrendingTracks().catch(() => [] as Track[]);
      const seen = new Set<string>();
      const merged: Track[] = [];
      for (const t of [...initial, ...charts]) {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      if (merged.length > 0) {
        const picks = merged.slice(0, 20);
        setDefaultQuickPicks(picks);
        if (selectedMood === 'All') {
          setQuickPicks(picks);
        }
      }
    } catch (e) {
      console.error('charts load error', e);
    } finally {
      setTrendingLoading(false);
      setQuickPicksLoading(false);
    }
  };

  const loadArtists = async (regionChip: ArtistRegionChip) => {
    setArtistsLoading(true);
    const mapped = ARTIST_REGIONS.find(r => r.label === regionChip)?.apiRegion || 'vn';
    try {
      const list = await libraryService.getArtists(mapped);
      setArtists(list.slice(0, 12));
    } catch (e) {
      console.error('artists load error', e);
    } finally {
      setArtistsLoading(false);
    }
  };

  const { containerRef, pullProps, indicator } = usePullToRefresh(async () => {
    await Promise.all([loadBrowse(), loadChartsAndPicks(), loadArtists(artistRegion)]);
  });

  useEffect(() => {
    const cached = safeStorage.getItem('nct_browse_cache_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setBrowseData(parsed);
        setLoading(false);
      } catch {
        /* ignore */
      }
    }
    loadBrowse();
    loadChartsAndPicks();
  }, []);

  useEffect(() => {
    loadArtists(artistRegion);
  }, [artistRegion]);

  const handleMoodSelect = async (label: string, query: string) => {
    const nextMood = selectedMood === label && label !== 'All' ? 'All' : label;
    setSelectedMood(nextMood);

    if (nextMood === 'All') {
      setQuickPicks(defaultQuickPicks);
      return;
    }

    setQuickPicksLoading(true);
    try {
      const matching = await libraryService.search(query || nextMood);
      if (matching.length > 0) {
        setQuickPicks(matching.slice(0, 20));
      } else {
        setQuickPicks(defaultQuickPicks);
      }
    } catch {
      setQuickPicks(defaultQuickPicks);
    } finally {
      setQuickPicksLoading(false);
    }
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

  const playArtistTop = async (artistName: string) => {
    try {
      const tracks = await libraryService.search(artistName);
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (e) {
      console.error('Failed to play artist', e);
    }
  };

  // Chunk Quick picks into columns of 4 tracks for 3-col x 4-row YTM horizontal snap grid
  const quickPickColumns = useMemo(() => {
    const cols: Track[][] = [];
    for (let i = 0; i < quickPicks.length; i += 4) {
      cols.push(quickPicks.slice(i, i + 4));
    }
    return cols;
  }, [quickPicks]);

  const browseCategories = useMemo(() => {
    const entries = Object.entries(browseData).filter(([, items]) => Array.isArray(items) && items.length > 0);
    const nonArtist = entries.filter(([cat, items]) => {
      const lower = cat.toLowerCase();
      return !lower.includes('artist') && items.some(i => i.type !== 'Artist');
    });
    return nonArtist.slice(0, 4);
  }, [browseData]);

  const mixedForYouItems = useMemo(() => {
    const allItems = Object.values(browseData).flat().filter(p => p.type !== 'Artist');
    return allItems.slice(0, 12);
  }, [browseData]);

  return (
    <div
      ref={containerRef}
      {...pullProps}
      className="min-h-full bg-transparent text-white"
    >
      {indicator}

      <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-10">
        {/* 1. Mood Filter Chip Bar */}
        <div
          role="tablist"
          aria-label="Mood and activity filters"
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
        >
          {MOOD_CHIPS.map((chip) => {
            const isActive = selectedMood === chip.label;
            return (
              <button
                key={chip.label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleMoodSelect(chip.label, chip.query)}
                className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                  isActive
                    ? 'bg-white text-[#030303]'
                    : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* 2. Shelf 1: Quick Picks (3-col x 4-row horizontal snap carousel) */}
        {quickPicksLoading && quickPicks.length === 0 ? (
          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-8 w-52" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(col => (
                <div key={col} className={`space-y-2 ${col > 1 ? 'hidden md:block' : ''}`}>
                  {[1, 2, 3, 4].map(row => (
                    <Skeleton key={row} className="h-14 w-full rounded-[6px]" />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : quickPickColumns.length > 0 && (
          <YtmCarousel
            eyebrow={selectedMood === 'All' ? 'START RADIO FROM A SONG' : `${selectedMood.toUpperCase()} RADIO`}
            title={selectedMood === 'All' ? 'Quick picks' : `${selectedMood} picks`}
            itemCount={quickPickColumns.length}
            actionPill={{
              label: 'Play all',
              onClick: () => {
                if (quickPicks.length > 0) {
                  playTrack(quickPicks[0], quickPicks);
                }
              },
            }}
            trackClassName="gap-6"
          >
            {quickPickColumns.map((col, colIdx) => (
              <div
                key={`qp-col-${colIdx}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${colIdx + 1} of ${quickPickColumns.length}`}
                className="min-w-[300px] sm:min-w-[360px] lg:w-[calc((100%-48px)/3)] flex-shrink-0 snap-start flex flex-col"
              >
                {col.map((track, rowIdx) => (
                  <TrackRow
                    key={`${track.id}-${colIdx}-${rowIdx}`}
                    track={track}
                    queue={quickPicks}
                    showStats={false}
                    compact
                    disableSwipe
                  />
                ))}
              </div>
            ))}
          </YtmCarousel>
        )}

        {/* 3. Shelf 2: Mixed for you (when browse content loaded) */}
        {loading && mixedForYouItems.length === 0 ? (
          <section className="space-y-4">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-[176px] flex-shrink-0 space-y-2.5">
                  <Skeleton className="w-full aspect-square rounded-[6px]" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              ))}
            </div>
          </section>
        ) : mixedForYouItems.length > 0 && (
          <YtmCarousel
            eyebrow={playHistory.length > 0 ? 'BASED ON YOUR LISTENING' : undefined}
            title="Mixed for you"
            itemCount={mixedForYouItems.length}
            actionPill={{ label: 'More', to: '/feed' }}
            trackClassName="gap-4 md:gap-6"
          >
            {mixedForYouItems.map((item, idx) => {
              const isAlbum = item.type === 'Album';
              return (
                <div
                  key={`mixed-${item.id}-${idx}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${mixedForYouItems.length}`}
                  className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                >
                  <YtmMediaCard
                    title={item.title}
                    subtitle={item.creator || item.description || (isAlbum ? 'Album' : 'Playlist')}
                    imageUrl={item.cover_url}
                    to={isAlbum ? `/album/${encodeURIComponent(item.id)}` : `/playlist/${encodeURIComponent(item.id)}`}
                    onPlay={() => playCollection(item.id, isAlbum)}
                    fallbackText={item.title?.substring(0, 2).toUpperCase()}
                  />
                </div>
              );
            })}
          </YtmCarousel>
        )}

        {/* 4. Browse Category Carousels */}
        {browseCategories.map(([category, items]) => (
          <YtmCarousel
            key={category}
            title={category}
            itemCount={Math.min(items.length, 15)}
            actionPill={{ label: 'More', to: `/section?category=${encodeURIComponent(category)}` }}
            trackClassName="gap-4 md:gap-6"
          >
            {items.slice(0, 15).map((item, idx) => {
              const isAlbum = item.type === 'Album';
              const targetUrl = isAlbum
                ? `/album/${encodeURIComponent(item.id)}`
                : `/playlist/${encodeURIComponent(item.id)}`;
              return (
                <div
                  key={`${category}-${item.id}-${idx}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${Math.min(items.length, 15)}`}
                  className="w-[164px] sm:w-[176px] md:w-[192px] flex-shrink-0 snap-start"
                >
                  <YtmMediaCard
                    title={item.title}
                    subtitle={item.description || item.creator || (isAlbum ? 'Album' : 'Playlist')}
                    imageUrl={item.cover_url}
                    to={targetUrl}
                    onPlay={() => playCollection(item.id, isAlbum)}
                    fallbackText={item.title?.substring(0, 2).toUpperCase()}
                  />
                </div>
              );
            })}
          </YtmCarousel>
        ))}

        {/* 5. Recommended Artists Shelf with VN / US / KR / GB Region Chips */}
        <YtmCarousel
          title="Recommended artists"
          itemCount={artists.length}
          actionPill={{ label: 'More', to: '/artists' }}
          headerRightExtra={
            <div className="hidden sm:flex items-center gap-1.5 mr-1">
              {ARTIST_REGIONS.map(({ label }) => {
                const active = artistRegion === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setArtistRegion(label)}
                    className={`h-8 px-3 rounded-[8px] text-xs font-medium transition ${
                      active
                        ? 'bg-white text-[#030303]'
                        : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          }
          trackClassName="gap-4 md:gap-6"
        >
          {artistsLoading && artists.length === 0 ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-[160px] sm:w-[176px] flex-shrink-0 flex flex-col items-center space-y-2.5">
                <Skeleton className="w-full aspect-square rounded-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))
          ) : (
            artists.map((artist, idx) => (
              <div
                key={`${artist.id}-${idx}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${artists.length}`}
                className="w-[160px] sm:w-[176px] md:w-[184px] flex-shrink-0 snap-start"
              >
                <YtmMediaCard
                  variant="artist"
                  title={artist.name}
                  subtitle={artist.followers ? `Artist • ${artist.followers}` : 'Artist'}
                  imageUrl={artist.photo}
                  to={`/artist/${encodeURIComponent(artist.name)}`}
                  onPlay={() => playArtistTop(artist.name)}
                  fallbackText={artist.name.substring(0, 2).toUpperCase()}
                />
              </div>
            ))
          )}
        </YtmCarousel>

        {/* Mobile artist region chips */}
        <div className="flex sm:hidden items-center gap-2 -mt-6">
          {ARTIST_REGIONS.map(({ label }) => {
            const active = artistRegion === label;
            return (
              <button
                key={`mob-${label}`}
                type="button"
                onClick={() => setArtistRegion(label)}
                className={`h-8 px-3 rounded-[8px] text-xs font-medium transition ${
                  active
                    ? 'bg-white text-[#030303]'
                    : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* 6. Trending Ranked List + Charts Link */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70 mb-1">TOP SONGS</p>
              <h2
                className="text-[22px] sm:text-[24px] md:text-[28px] font-bold tracking-tight text-white leading-[1.2]"
                style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
              >
                Trending
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {trendingTracks.length > 0 && (
                <button
                  type="button"
                  onClick={() => playTrack(trendingTracks[0], trendingTracks)}
                  className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 transition"
                >
                  Play all
                </button>
              )}
              <Link
                to="/charts"
                className="h-9 px-4 rounded-full border border-white/20 text-sm font-medium text-white hover:bg-white/10 inline-flex items-center justify-center transition"
              >
                Charts
              </Link>
            </div>
          </div>

          {trendingLoading && trendingTracks.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
              ))}
            </div>
          ) : (
            <div className="divide-y-0">
              {trendingTracks.map((track, idx) => (
                <TrackRow
                  key={`trending-${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  rankDelta={idx < 3 ? 'up' : idx % 4 === 0 ? 'down' : 'neutral'}
                  queue={trendingTracks}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
