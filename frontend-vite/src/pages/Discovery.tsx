import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Flame, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import { safeStorage } from '../utils/safeStorage';

export default function Discovery() {
  const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
  const [loading, setLoading] = useState(true);
  const [heroSlides, setHeroSlides] = useState<StaticPlaylist[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);

  const playTrack = usePlayerStore(s => s.playTrack);

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await libraryService.getBrowseContent();
      setBrowseData(data);
      safeStorage.setItem('nct_browse_cache_v1', JSON.stringify(data));
      const allPlaylists = Object.values(data).flat().filter((p: any) => p.type === 'Playlist') as StaticPlaylist[];
      if (allPlaylists.length > 0) setHeroSlides(allPlaylists.slice(0, 6));
    } catch (e) {
      console.error('browse load error', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPopular = async () => {
    setPopularLoading(true);
    try {
      const res = await libraryService.getCharts('trending');
      setPopularTracks((res || []).slice(0, 15));
    } catch (e) {
      console.error('charts load error', e);
    } finally {
      setPopularLoading(false);
    }
  };

  const { containerRef, pullProps, indicator } = usePullToRefresh(async () => {
    await Promise.all([loadAll(), loadPopular()]);
  });

  useEffect(() => {
    const cached = safeStorage.getItem('nct_browse_cache_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setBrowseData(parsed);
        setLoading(false);
        const allPlaylists = Object.values(parsed).flat().filter((p: any) => p.type === 'Playlist') as StaticPlaylist[];
        if (allPlaylists.length > 0) setHeroSlides(allPlaylists.slice(0, 6));
      } catch { /* ignore */ }
    }
    loadAll();
    loadPopular();
  }, []);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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

  const playTopic = async (query: string) => {
    try {
      const tracks = await libraryService.search(query);
      if (tracks && tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (e) {
      console.error('Failed to play topic', e);
    }
  };

  const browseTiles = [
    { label: 'Hip-Hop & Rap', monogram: 'HH', query: 'Hip Hop' },
    { label: 'Chill & Lofi', monogram: 'LF', query: 'Lofi Chill' },
    { label: 'V-Pop', monogram: 'VP', query: 'V-Pop' },
    { label: 'Dance & EDM', monogram: 'EDM', query: 'EDM Dance' },
    { label: 'Rock', monogram: 'RK', query: 'Rock' },
    { label: 'R&B', monogram: 'RB', query: 'R&B' },
  ];

  const topPlaylists = Object.entries(browseData).slice(0, 2);

  return (
    <div className="min-h-full text-white bg-[#121212]">
      <div
        ref={containerRef}
        {...pullProps}
        className="max-w-[1240px] mx-auto px-3 md:px-6 py-4 md:py-6 flex gap-8 overflow-y-auto no-scrollbar"
        style={{ minHeight: '100%', ...(pullProps.style as React.CSSProperties) }}
      >
        {indicator}

        {/* Main Column */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Hero Banner */}
          {loading ? (
            <div className="w-full aspect-video md:aspect-[16/7] bg-[#1c1c1c] rounded-xl animate-pulse" />
          ) : heroSlides.length > 0 && (
            <div className="relative w-full aspect-video md:aspect-[16/7] rounded-xl overflow-hidden shadow-2xl group border border-white/10">
              <div
                className="w-full h-full flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
              >
                {heroSlides.map((slide, idx) => (
                  <div key={slide.id || idx} className="w-full h-full flex-shrink-0 relative">
                    <CoverImage src={slide.cover_url} alt={slide.title} className="w-full h-full object-cover brightness-[0.55]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-black/30 to-transparent flex flex-col justify-end p-5 md:p-8">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-[#ff5500] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                          SoundCloud Spotlight
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-1 line-clamp-1">{slide.title}</h2>
                      <p className="text-neutral-300 text-xs md:text-sm line-clamp-2 max-w-xl mb-4">{slide.description}</p>
                      <button
                        onClick={() => playCollection(slide.id, false)}
                        className="w-fit inline-flex items-center gap-2 px-6 py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white rounded font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Listen Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCurrentSlideIndex(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlideIndex ? 'w-5 bg-[#ff5500]' : 'w-1.5 bg-white/40 hover:bg-white'}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Browse Categories (Monogram Dark Tiles) */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-4 h-4 text-[#ff5500]" />
              <h2 className="text-base font-extrabold uppercase tracking-wider text-white">Browse Genres</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {browseTiles.map(tile => (
                <button
                  key={tile.label}
                  onClick={() => playTopic(tile.query)}
                  className="relative h-20 rounded-lg overflow-hidden bg-[#181818] border border-white/10 hover:border-[#ff5500] hover:bg-[#202020] p-3 flex flex-col justify-between items-start text-left transition group shadow-sm"
                >
                  <span className="w-7 h-7 rounded bg-white/5 border border-white/10 group-hover:border-[#ff5500] text-[#ff5500] font-black text-xs flex items-center justify-center tracking-wider transition">
                    {tile.monogram}
                  </span>
                  <span className="text-xs font-bold text-white leading-tight group-hover:text-[#ff5500] transition">{tile.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Trending Tracks Stream with SoundCloud Track Cards */}
          <section>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#ff5500]" />
                <h2 className="text-lg font-extrabold text-white">Trending on SoundCloud</h2>
              </div>
              <Link to="/charts" className="text-xs font-bold text-[#ff5500] hover:underline">
                View Charts
              </Link>
            </div>

            {popularLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {popularTracks.map((track, i) => (
                  <SoundCloudTrackCard
                    key={`${track.id}-${i}`}
                    track={track}
                    queue={popularTracks}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Playlists Shelves */}
          {topPlaylists.map(([category, playlists]) => (
            <section key={category}>
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                <h2 className="text-base font-extrabold text-white">{category}</h2>
                <Link to={`/section?category=${encodeURIComponent(category)}`} className="text-xs font-bold text-neutral-400 hover:text-white">
                  See more
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(playlists as any[]).slice(0, 8).map(playlist => (
                  <div
                    key={playlist.id}
                    onClick={() => playCollection(playlist.id, false)}
                    className="bg-[#181818] hover:bg-[#222222] p-2.5 rounded-lg transition group cursor-pointer border border-white/5 flex flex-col"
                  >
                    <div className="relative mb-2 overflow-hidden rounded">
                      <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300" fallbackText="SC" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="w-10 h-10 bg-[#ff5500] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-xs line-clamp-1 group-hover:text-[#ff5500] transition">{playlist.title}</h3>
                    <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">{playlist.description || 'Playlist'}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Desktop SoundCloud Right Sidebar */}
        <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
          <SoundCloudSidebar />
        </div>
      </div>
    </div>
  );
}
