import { useEffect, useState } from 'react';
import { Play, Flame, Disc, User, Clock, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';

export default function Discovery() {
  const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
  const [loading, setLoading] = useState(true);
  const [heroSlides, setHeroSlides] = useState<StaticPlaylist[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [chartRegion, setChartRegion] = useState<'vn' | 'us' | 'kr' | 'cn'>('vn');
  const [chartTracks, setChartTracks] = useState<Track[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [newReleaseFilter, setNewReleaseFilter] = useState<'all' | 'vn' | 'us'>('all');
  
  const playTrack = usePlayerStore(s => s.playTrack);
  const playHistory = usePlayerStore(s => s.playHistory);

  const playTopic = async (query: string) => {
    try {
      const tracks = await libraryService.search(query);
      if (tracks && tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (e) {
      console.error("Failed to play topic", e);
    }
  };

  const playCollection = async (id: string, isAlbum: boolean) => {
    try {
      const data = isAlbum ? await libraryService.getAlbum(id) : await libraryService.getPlaylist(id);
      if (data && data.tracks.length > 0) {
        playTrack(data.tracks[0], data.tracks);
      }
    } catch (e) {
      console.error("Failed to play collection", e);
    }
  };

  // Load Browse & Hero Carousel Data
  useEffect(() => {
    const cached = localStorage.getItem('nct_browse_cache_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      setBrowseData(parsed);
      setLoading(false);
      const allPlaylists = Object.values(parsed).flat().filter((p: any) => p.type === 'Playlist') as StaticPlaylist[];
      if (allPlaylists.length > 0) {
        setHeroSlides(allPlaylists.slice(0, 6));
      }
    }

    libraryService.getBrowseContent()
      .then(data => {
        setBrowseData(data);
        setLoading(false);
        localStorage.setItem('nct_browse_cache_v1', JSON.stringify(data));
        const allPlaylists = Object.values(data).flat().filter((p: any) => p.type === 'Playlist') as StaticPlaylist[];
        if (allPlaylists.length > 0) {
          setHeroSlides(allPlaylists.slice(0, 6));
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Hero Slider Auto-rotation
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Load Right-Sidebar Real-time BXH Chart
  useEffect(() => {
    const fetchBXH = async () => {
      setChartLoading(true);
      try {
        const results = await libraryService.getCharts(chartRegion);
        if (results && results.length > 0) {
          setChartTracks(results.slice(0, 20));
        }
      } catch (e) {
        console.error("BXH load error", e);
      }
      setChartLoading(false);
    };
    fetchBXH();
  }, [chartRegion]);

  return (
    <div className="min-h-full bg-[#0b132d] text-white p-3 md:p-6 no-scrollbar pb-28">
      {/* 2-COLUMN MAIN NCT LAYOUT */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Main Carousel & Content (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Hero Banner Carousel (Signature NCT Slider) */}
          {loading ? (
            <div className="w-full h-64 md:h-80 bg-[#142044] rounded-2xl animate-pulse" />
          ) : heroSlides.length > 0 && (
            <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl group border border-cyan-500/20">
              <div 
                className="w-full h-full flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
              >
                {heroSlides.map((slide, idx) => (
                  <div key={slide.id || idx} className="w-full h-full flex-shrink-0 relative">
                    <CoverImage src={slide.cover_url} alt={slide.title} className="w-full h-full object-cover brightness-75" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b132d] via-[#0b132d]/40 to-transparent flex flex-col justify-end p-6 md:p-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 backdrop-blur-md border border-cyan-400/40 rounded-full text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2 w-fit">
                        <Flame className="w-3.5 h-3.5 text-cyan-400" />
                        NCT HOT ALBUM
                      </div>
                      <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-2 line-clamp-1 group-hover:text-cyan-300 transition">
                        {slide.title}
                      </h2>
                      <p className="text-neutral-300 text-xs md:text-sm line-clamp-2 max-w-xl mb-4">
                        {slide.description}
                      </p>
                      <button 
                        onClick={() => playCollection(slide.id, false)}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 w-fit active:scale-95 transition"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Nghe Ngay
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slider Arrows */}
              <button 
                onClick={() => setCurrentSlideIndex(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-cyan-500/80 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-cyan-500/80 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Slider Dots Indicator */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
                {heroSlides.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === currentSlideIndex ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400' : 'w-2 bg-white/40 hover:bg-white'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* CHỦ ĐỀ HOT (Featured Topics Grid) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-5 bg-cyan-400 rounded-full" />
                CHỦ ĐỀ HOT
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
              {[
                { title: 'Nhạc Trẻ HOT', query: 'Nhạc Trẻ HOT', desc: 'Giai điệu thịnh hành', gradient: 'from-blue-600 to-cyan-500', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80' },
                { title: 'V-Pop Rực Rỡ', query: 'V-Pop 2024', desc: 'Bảng xếp hạng mới', gradient: 'from-indigo-600 to-purple-500', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' },
                { title: 'Chill Cuối Tuần', query: 'Lofi Chill', desc: 'Thư giãn tuyệt đối', gradient: 'from-teal-500 to-emerald-500', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80' },
                { title: 'Lofi Tâm Trạng', query: 'Lofi Viet', desc: 'Đêm khuya thao thức', gradient: 'from-[#00a8ff] to-[#2e86de]', img: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80' },
                { title: 'Remix Sôi Động', query: 'Remix Viet', desc: 'Nonstop Bass cực căng', gradient: 'from-pink-600 to-rose-500', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80' },
                { title: 'US-UK Top Hits', query: 'US UK Hits', desc: 'Bản tình ca thế giới', gradient: 'from-cyan-600 to-blue-700', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80' },
              ].map((topic, i) => (
                <div key={i} onClick={() => playTopic(topic.query)} className="group relative h-28 md:h-32 rounded-2xl overflow-hidden shadow-lg border border-cyan-500/20 cursor-pointer hover:scale-[1.02] active:scale-95 transition duration-300">
                  <img src={topic.img} alt={topic.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${topic.gradient} opacity-80 group-hover:opacity-90 transition duration-300`} />
                  <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-end">
                    <h3 className="font-extrabold text-white text-sm md:text-base group-hover:text-cyan-200 transition">{topic.title}</h3>
                    <p className="text-[10px] md:text-xs text-white/80 line-clamp-1">{topic.desc}</p>
                  </div>
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MỚI PHÁT HÀNH (Latest Songs Grid with NCT Tabs) */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/10 pb-2">
              <h2 className="text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-5 bg-cyan-400 rounded-full" />
                MỚI PHÁT HÀNH
              </h2>
              
              <div className="flex items-center gap-1.5 bg-[#142044] p-1 rounded-xl border border-cyan-500/20 text-xs font-bold">
                {[
                  { id: 'all', label: 'TẤT CẢ' },
                  { id: 'vn', label: 'VIỆT NAM' },
                  { id: 'us', label: 'ÂU MỸ' },
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setNewReleaseFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-lg transition ${newReleaseFilter === tab.id ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Grid */}
            <NewReleasesGrid filter={newReleaseFilter} onPlayTrack={(track, list) => playTrack(track, list)} />
          </div>

          {/* PLAYLIST / ALBUM HOT (NCT Album Grid) */}
          {Object.entries(browseData).slice(0, 2).map(([category, playlists]) => (
            <div key={category} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                <h2 className="text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-cyan-400 rounded-full" />
                  {category.toUpperCase()}
                </h2>
                <Link to={`/section?category=${encodeURIComponent(category)}`} className="text-xs font-bold text-cyan-400 hover:text-white transition uppercase">
                  Xem tất cả &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(playlists as any[]).slice(0, 8).map(playlist => (
                  <div 
                    key={playlist.id} 
                    onClick={() => playCollection(playlist.id, false)}
                    className="bg-[#142044]/60 p-3 rounded-2xl hover:bg-[#1c2c5b] transition group cursor-pointer border border-cyan-500/10 flex flex-col"
                  >
                    <div className="relative mb-2.5 overflow-hidden rounded-xl">
                      <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square object-cover group-hover:scale-105 transition duration-300" fallbackText="NCT" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="w-11 h-11 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-xs md:text-sm line-clamp-1 group-hover:text-cyan-300 transition">{playlist.title}</h3>
                    <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">{playlist.description || 'NCT Playlist'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* CA SĨ HOT (Artist Carousel) */}
          <ArtistSpotlightSection />
        </div>

        {/* RIGHT COLUMN: Real-time BXH Widget (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Realtime BXH Widget Box */}
          <div className="bg-[#142044] border border-cyan-500/20 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00a8ff] to-[#00d2d3] flex items-center justify-center shadow-md">
                  <Flame className="w-4 h-4 text-white fill-white" />
                </div>
                <h2 className="text-base font-black text-white tracking-wider">BXH BÀI HÁT</h2>
              </div>
              <Link to="/charts" className="text-[11px] font-bold text-cyan-400 hover:underline">
                Xem Thêm
              </Link>
            </div>

            {/* BXH Tabs: Việt Nam | Âu Mỹ | Hàn Quốc | Trung Quốc */}
            <div className="grid grid-cols-4 gap-1 bg-[#0b132d] p-1 rounded-xl border border-cyan-500/15 text-[11px] md:text-xs font-extrabold text-center">
              {[
                { id: 'vn', label: 'VIỆT NAM' },
                { id: 'us', label: 'ÂU MỸ' },
                { id: 'kr', label: 'HÀN QUỐC' },
                { id: 'cn', label: 'TRUNG QUỐC' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChartRegion(tab.id as any)}
                  className={`py-1.5 rounded-lg transition ${chartRegion === tab.id ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow' : 'text-neutral-400 hover:text-white'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chart Tracks List */}
            {chartLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : chartTracks.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto pr-1 no-scrollbar">
                  {chartTracks.map((track, rank) => {
                    const isTop1 = rank === 0;
                    const isTop2 = rank === 1;
                    const isTop3 = rank === 2;

                    return (
                      <div 
                        key={track.id || rank}
                        onClick={() => playTrack(track, chartTracks)}
                        className={`group flex items-center gap-3 p-2 rounded-xl transition cursor-pointer border ${
                          isTop1 ? 'bg-gradient-to-r from-amber-500/15 via-[#142044] to-[#142044] border-amber-500/30' :
                          isTop2 ? 'bg-gradient-to-r from-cyan-500/15 via-[#142044] to-[#142044] border-cyan-500/30' :
                          isTop3 ? 'bg-gradient-to-r from-blue-500/15 via-[#142044] to-[#142044] border-blue-500/30' :
                          'bg-[#0b132d]/40 hover:bg-[#1a2957] border-cyan-500/5'
                        }`}
                      >
                        {/* Rank Badge Number */}
                        <div className={`w-8 text-center font-black text-base flex-shrink-0 ${
                          isTop1 ? 'text-amber-400 text-lg drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]' :
                          isTop2 ? 'text-cyan-400' :
                          isTop3 ? 'text-blue-400' :
                          'text-neutral-400'
                        }`}>
                          {rank + 1}
                        </div>

                        {/* Song Image */}
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0">
                          <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          </div>
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-xs truncate group-hover:text-cyan-300 transition">
                            {track.title}
                          </h4>
                          <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                            {track.artist}
                          </p>
                        </div>

                        {/* Play count / trend */}
                        <div className="text-[10px] text-cyan-400/70 font-semibold flex flex-col items-end">
                          <span>▲ {Math.floor(Math.random() * 10) + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Play All Button */}
                <button 
                  onClick={() => playTrack(chartTracks[0], chartTracks)}
                  className="mt-2 w-full py-2.5 bg-gradient-to-r from-[#00a8ff] to-[#2e86de] hover:brightness-110 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Nghe Tất Cả ({chartTracks.length} bài)
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-4">Đang tải bảng xếp hạng...</p>
            )}
          </div>

          {/* Right Widget 2: Recently Played */}
          {playHistory.length > 0 && (
            <div className="bg-[#142044] border border-cyan-500/20 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-cyan-500/15 pb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">NGHE GẦN ĐÂY</h3>
              </div>
              <div className="flex flex-col gap-2">
                {playHistory.slice(0, 5).map((track, i) => (
                  <div 
                    key={`${track.id}-${i}`}
                    onClick={() => playTrack(track, playHistory)}
                    className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-cyan-500/10 cursor-pointer transition group"
                  >
                    <CoverImage src={track.cover_url} alt={track.title} className="w-9 h-9 rounded-lg flex-shrink-0 object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300">{track.title}</h4>
                      <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

// Subcomponent for New Releases tabbed song list
function NewReleasesGrid({ filter, onPlayTrack }: { filter: 'all' | 'vn' | 'us'; onPlayTrack: (t: Track, list: Track[]) => void }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewReleases = async () => {
      setLoading(true);
      try {
        const region = filter === 'us' ? 'us' : 'vn';
        const res = await libraryService.getNewReleases(region);
        if (res && res.length > 0) {
          setTracks(res.slice(0, 12));
        }
      } catch (e) {
        console.error("New releases load error", e);
      }
      setLoading(false);
    };
    fetchNewReleases();
  }, [filter]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {tracks.map((track, i) => (
        <div
          key={track.id || i}
          onClick={() => onPlayTrack(track, tracks)}
          className="bg-[#142044]/60 hover:bg-[#1c2c5b] border border-cyan-500/10 p-2.5 rounded-2xl flex items-center gap-3 transition cursor-pointer group shadow-sm"
        >
          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
            <CoverImage src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs md:text-sm truncate group-hover:text-cyan-300 transition">
              {track.title}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
              {track.artist}
            </p>
          </div>

          <div className="p-1.5 rounded-full text-neutral-400 group-hover:text-cyan-400 transition">
            <Volume2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Subcomponent for Artist Spotlight Carousel
function ArtistSpotlightSection() {
  const [artists, setArtists] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const POPULAR_ARTISTS = [
    "Sơn Tùng M-TP", "HIEUTHUHAI", "Đen Vâu", "Hoàng Dũng",
    "Vũ.", "MONO", "Tlinh", "Erik", "Binz", "JustaTee",
    "MCK", "Min", "Amee", "Karik", "Suboi", "Bích Phương"
  ];

  useEffect(() => {
    setArtists(POPULAR_ARTISTS);
    Promise.all(POPULAR_ARTISTS.slice(0, 10).map(async (name) => {
      try {
        const data = await libraryService.getArtistInfo(name);
        const photoUrl = data.photo;
        if (photoUrl) {
          setPhotos(prev => ({ ...prev, [name]: photoUrl }));
        }
      } catch {}
    }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
        <h2 className="text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-5 bg-cyan-400 rounded-full" />
          CA SĨ NỔI BẬT
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {artists.map((name, i) => (
          <Link to={`/artist/${encodeURIComponent(name)}`} key={i} className="flex-shrink-0 w-28 text-center group cursor-pointer">
            <div className="relative mb-2 w-28 h-28 mx-auto">
              <CoverImage 
                src={photos[name]} 
                alt={name} 
                className="w-full h-full rounded-full shadow-lg group-hover:scale-105 transition object-cover border-2 border-cyan-500/20 group-hover:border-cyan-400" 
                fallbackText={name.substring(0, 2).toUpperCase()} 
              />
            </div>
            <h3 className="font-bold text-white text-xs truncate px-1 group-hover:text-cyan-300 transition">{name}</h3>
            <p className="text-[10px] text-neutral-400">Ca sĩ</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
