import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import TrackRow, { YtmCarousel, YtmMediaCard, YtmDropdown, type YtmDropdownOption } from '../components/TrackRow';
import Skeleton from '../components/Skeleton';
import type { Track } from '../types';

type ChartRegionKey = 'Vietnam' | 'Global' | 'US' | 'KR' | 'JP' | 'GB';

const REGION_OPTIONS: YtmDropdownOption<ChartRegionKey>[] = [
  { value: 'Vietnam', label: 'Vietnam' },
  { value: 'Global', label: 'Global' },
  { value: 'US', label: 'US' },
  { value: 'KR', label: 'KR' },
  { value: 'JP', label: 'JP' },
  { value: 'GB', label: 'GB' },
];

const REGION_TO_BACKEND: Record<
  ChartRegionKey,
  { chartType: string; artistRegion: 'vn' | 'us' | 'kr' | 'cn'; searchFallback?: string }
> = {
  Vietnam: { chartType: 'vn', artistRegion: 'vn' },
  Global: { chartType: 'hits-collection', artistRegion: 'cn' },
  US: { chartType: 'us', artistRegion: 'us' },
  KR: { chartType: 'kr', artistRegion: 'kr' },
  JP: { chartType: 'hits-collection', artistRegion: 'kr', searchFallback: 'Japan Top 50 Music Charts' },
  GB: { chartType: 'hits-collection', artistRegion: 'us', searchFallback: 'UK Top 50 Official Charts' },
};

const CHART_SUB_TABS = [
  { key: 'regional', label: 'Top songs' },
  { key: 'trending', label: 'Daily top music videos' },
  { key: 'top-albums', label: 'Top 100' },
  { key: 'hits-collection', label: 'Global hits' },
] as const;

type ChartSubTab = (typeof CHART_SUB_TABS)[number]['key'];

function computeRankDelta(index: number): 'up' | 'down' | 'neutral' {
  if (index === 0 || index === 2 || index % 5 === 1) return 'up';
  if (index % 4 === 3) return 'down';
  return 'neutral';
}

export default function ChartsSection() {
  const [searchParams] = useSearchParams();
  const initialParam = searchParams.get('chart_type');

  const [region, setRegion] = useState<ChartRegionKey>('Vietnam');
  const [subTab, setSubTab] = useState<ChartSubTab>(
    initialParam === 'trending' || initialParam === 'top-albums' || initialParam === 'hits-collection'
      ? initialParam
      : 'regional'
  );
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<
    Array<{ id: string; name: string; photo?: string; region: string; rank: number; followers: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [artistsLoading, setArtistsLoading] = useState(true);

  const playTrack = usePlayerStore(s => s.playTrack);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const regionCfg = REGION_TO_BACKEND[region];
    const targetChartType = subTab === 'regional' ? regionCfg.chartType : subTab;

    const loadTracks = async () => {
      try {
        if (subTab === 'regional' && regionCfg.searchFallback) {
          const searchHits = await libraryService.search(regionCfg.searchFallback);
          if (active && searchHits.length > 0) {
            setTracks(searchHits.slice(0, 50));
            setLoading(false);
            return;
          }
        }
        const data = await libraryService.getCharts(targetChartType);
        if (active) {
          setTracks(data);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };

    loadTracks();
    return () => {
      active = false;
    };
  }, [region, subTab]);

  useEffect(() => {
    let active = true;
    setArtistsLoading(true);
    const artistRegion = REGION_TO_BACKEND[region].artistRegion;

    libraryService
      .getArtists(artistRegion)
      .then((res) => {
        if (active) {
          setArtists(res.slice(0, 15));
          setArtistsLoading(false);
        }
      })
      .catch(() => {
        if (active) setArtistsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [region]);

  const playArtist = async (name: string) => {
    try {
      const songs = await libraryService.search(name);
      if (songs.length > 0) playTrack(songs[0], songs);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-full bg-transparent text-white">
      <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-8">
        {/* Page Header */}
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition md:hidden"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1
              className="text-[28px] sm:text-[34px] md:text-[42px] font-bold tracking-tight text-white leading-[1.15]"
              style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
            >
              Charts
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <YtmDropdown
                value={region}
                options={REGION_OPTIONS}
                onChange={(val) => {
                  setRegion(val);
                  setSubTab('regional');
                }}
                ariaLabel="Select chart region"
              />

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {CHART_SUB_TABS.map((tab) => {
                  const isActive = subTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSubTab(tab.key)}
                      className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition ${
                        isActive
                          ? 'bg-white text-[#030303]'
                          : 'bg-white/10 text-white hover:bg-white/[0.16] border border-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {!loading && tracks.length > 0 && (
              <button
                type="button"
                onClick={() => playTrack(tracks[0], tracks)}
                className="h-9 px-5 rounded-full bg-white text-[#030303] hover:bg-white/90 text-sm font-medium inline-flex items-center gap-2 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play all</span>
              </button>
            )}
          </div>
        </header>

        {/* Ranked Songs List */}
        <section aria-label="Ranked chart tracks" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-[20px] md:text-[24px] font-bold tracking-tight text-white"
              style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
            >
              {subTab === 'regional'
                ? `Top songs • ${region}`
                : CHART_SUB_TABS.find((t) => t.key === subTab)?.label}
            </h2>
            {!loading && tracks.length > 0 && (
              <span className="text-xs text-white/60 tabular-nums">{tracks.length} tracks</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-[6px]" />
              ))}
            </div>
          ) : tracks.length > 0 ? (
            <div className="space-y-0.5">
              {tracks.map((track, idx) => (
                <TrackRow
                  key={`${track.id}-${idx}`}
                  track={track}
                  index={idx}
                  rankDelta={computeRankDelta(idx)}
                  queue={tracks}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#181818] border border-white/10 rounded-[8px] p-10 text-center">
              <p className="text-sm text-white/70">No chart tracks available for this region right now.</p>
            </div>
          )}
        </section>

        {/* Top Artists Carousel */}
        {(artistsLoading || artists.length > 0) && (
          <YtmCarousel
            title={`Top artists • ${region}`}
            itemCount={artists.length}
            actionPill={{ label: 'More', to: '/artists' }}
            trackClassName="gap-4 md:gap-6"
          >
            {artistsLoading && artists.length === 0 ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
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
                    subtitle={`#${artist.rank}${artist.followers ? ` • ${artist.followers}` : ''}`}
                    imageUrl={artist.photo}
                    to={`/artist/${encodeURIComponent(artist.name)}`}
                    onPlay={() => playArtist(artist.name)}
                    fallbackText={artist.name.substring(0, 2).toUpperCase()}
                  />
                </div>
              ))
            )}
          </YtmCarousel>
        )}
      </div>
    </div>
  );
}
