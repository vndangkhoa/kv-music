import { useEffect, useState } from 'react';
import { Play, Music2, Sparkles, Flame, Disc, Search, User, Clock, TrendingUp, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';

export default function Discovery() {
  const navigate = useNavigate();
  const [timeOfDay, setTimeOfDay] = useState("Good evening");
  const [browseData, setBrowseData] = useState<Record<string, StaticPlaylist[]>>({});
  const [loading, setLoading] = useState(true);
  const [heroPlaylist, setHeroPlaylist] = useState<StaticPlaylist | null>(null);
  const playTrack = usePlayerStore(s => s.playTrack);
  const playHistory = usePlayerStore(s => s.playHistory);
  const [activeChip, setActiveChip] = useState<'all' | string>('all');

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

  const filterChips = [
    { id: 'energize', label: 'Energize', categories: ['Workout Energy', 'Party Anthems', 'Rap Viet', 'Gaming Music'] },
    { id: 'workout', label: 'Workout', categories: ['Workout Energy', 'Gaming Music'] },
    { id: 'relax', label: 'Relax', categories: ['Lofi Chill Vietnam', 'Sleep Sounds', 'Acoustic Thu Gian', 'Piano Focus'] },
    { id: 'focus', label: 'Focus', categories: ['Piano Focus', 'Lofi Chill Vietnam'] },
    { id: 'commute', label: 'Commute', categories: ['US UK Top Hits', 'Trending Music', 'V-Pop Rising', 'Viral Hits Vietnam'] }
  ];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("Good morning");
    else if (hour < 18) setTimeOfDay("Good afternoon");
    else setTimeOfDay("Good evening");

    const cached = localStorage.getItem('ytm_browse_cache_v8');
    let hasCache = false;
    if (cached) {
      setBrowseData(JSON.parse(cached));
      setLoading(false);
      hasCache = true;
    }

    const fetchData = () => {
      if (!hasCache) setLoading(true);
      libraryService.getBrowseContent()
        .then(data => {
          setBrowseData(data);
          setLoading(false);
          localStorage.setItem('ytm_browse_cache_v8', JSON.stringify(data));
          const allPlaylists = Object.values(data).flat().filter((p: any) => p.type === 'Playlist');
          if (allPlaylists.length > 0) {
            const randomIdx = Math.floor(Math.random() * allPlaylists.length);
            setHeroPlaylist(allPlaylists[randomIdx]);
          }
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const refreshInterval = setInterval(fetchData, 300000);
    return () => clearInterval(refreshInterval);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 no-scrollbar pb-24">
      <div className="flex items-center justify-between mb-6 select-none">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">{timeOfDay}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/search')} className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full transition">
            <Search className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 select-none">
        <button onClick={() => setActiveChip('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${activeChip === 'all' ? 'bg-white text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>
          All
        </button>
        {filterChips.map(chip => (
          <button key={chip.id} onClick={() => setActiveChip(activeChip === chip.id ? 'all' : chip.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${activeChip === chip.id ? 'bg-white text-black shadow-md' : 'bg-white/5 text-white hover:bg-white/10'}`}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Hero Section */}
      {activeChip === 'all' && (
        loading ? (
          <div className="mb-8 w-full h-80 bg-[#1f1f1f] rounded-2xl flex items-center p-8 animate-pulse">
            <div className="w-56 h-56 bg-white/5 rounded-2xl mr-8 shadow-2xl" />
            <div className="flex-1 space-y-4">
              <div className="h-6 bg-white/5 rounded w-32" />
              <div className="h-12 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        ) : heroPlaylist && (
          <Link to={`/playlist/${heroPlaylist.id}`}>
            <div className="mb-8 w-full h-auto md:h-80 bg-gradient-to-r from-[#212121] to-[#0f0f0f] rounded-2xl flex flex-col md:flex-row items-center p-6 md:p-8 hover:bg-[#252525] transition group cursor-pointer shadow-2xl border border-white/5">
              <div className="relative mb-4 md:mb-0 md:mr-8 flex-shrink-0">
                <CoverImage src={heroPlaylist.cover_url} alt={heroPlaylist.title} className="w-48 h-48 md:w-56 md:h-56 rounded-2xl shadow-2xl group-hover:scale-[1.02] transition" fallbackText="FT" />
              </div>
              <div className="flex flex-col text-center md:text-left overflow-hidden">
                <span className="text-xs font-bold tracking-wider text-green-500 uppercase mb-2">Featured Playlist</span>
                <h2 className="text-3xl md:text-5xl font-black mb-4 text-white leading-tight line-clamp-2 md:line-clamp-3">{heroPlaylist.title}</h2>
                <p className="text-neutral-400 text-sm md:text-base line-clamp-2 md:line-clamp-3 max-w-2xl mb-6">{heroPlaylist.description}</p>
                <div className="mt-auto inline-flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition self-center md:self-start shadow-lg">
                  <Play className="fill-current text-black w-4 h-4" />
                  Play Now
                </div>
              </div>
            </div>
          </Link>
        )
      )}

      {/* Recently Listened */}
      {activeChip === 'all' && playHistory.length > 0 && (
        <div className="mb-8 animate-in">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-500" />
            <h2 className="text-2xl font-bold">Recently Listened</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {playHistory.slice(0, 10).map((track, i) => (
              <div key={`${track.id}-${i}`} onClick={() => { playTrack(track, playHistory); }}
                className="flex-shrink-0 w-40 bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="relative mb-3">
                    <CoverImage src={track.cover_url} alt={track.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={track.title?.substring(0, 2).toUpperCase()} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                      <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                        <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-0.5 truncate">{track.title}</h3>
                  <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Made For You */}
      {activeChip === 'all' && <MadeForYouSection />}

      {/* Suggested Artists */}
      {activeChip === 'all' && <ArtistSpotlightSection />}

      {/* Charts / Trending */}
      {activeChip === 'all' && (
        <>
          <ChartSection 
            title="Top Hits" 
            icon={<Flame className="w-5 h-5 text-orange-500" />} 
            chartType="top-hits" 
          />
          <ChartSection 
            title="Trending Now" 
            icon={<TrendingUp className="w-5 h-5 text-green-500" />} 
            chartType="trending" 
          />
          <ChartSection 
            title="Top Albums" 
            icon={<Disc className="w-5 h-5 text-blue-500" />} 
            chartType="top-albums" 
          />
          <ChartSection 
            title="Hits Collection" 
            icon={<Star className="w-5 h-5 text-yellow-500" />} 
            chartType="hits-collection" 
          />
        </>
      )}

      {/* Browse Content */}
      {loading ? (
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="space-y-3">
                    <Skeleton className="w-full aspect-square rounded-2xl" />
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
          .filter(([category, items]) => {
            if (category === "Top Albums" || (items as any[]).length === 0) return false;
            if (activeChip !== 'all') {
              const selected = filterChips.find(c => c.id === activeChip);
              return selected ? selected.categories.includes(category) : true;
            }
            return true;
          })
          .map(([category, playlists]) => {
            const uniquePlaylists = (playlists as any[]).filter((p, i, self) => self.findIndex(x => x.id === p.id) === i);
            return (
              <div key={category} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white hover:underline cursor-pointer">{category}</h2>
                  <Link to={`/section?category=${encodeURIComponent(category)}`}>
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider hover:text-white cursor-pointer">Show all</span>
                  </Link>
                </div>
              <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uniquePlaylists.slice(0, 16).map(playlist => (
                    <div onClick={() => playCollection(playlist.id, false)} key={playlist.id} className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer relative h-full flex flex-col border border-white/5">
                      <div className="relative mb-3">
                        <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={playlist.title?.substring(0, 2).toUpperCase()} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                            <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                          </div>
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-sm mb-0.5 truncate">{playlist.title}</h3>
                      <p className="text-xs text-neutral-400 line-clamp-2">{playlist.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl font-bold mb-4 text-white">Ready to explore?</h2>
          <p className="text-neutral-400">Browse content is loading or empty. Try searching for music.</p>
        </div>
      )}

      {/* Top Albums */}
      {activeChip === 'all' && !loading && browseData["Top Albums"] && browseData["Top Albums"].length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Disc className="w-5 h-5 text-green-500" /> Top Albums
            </h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(browseData["Top Albums"] as any[]).filter((a, i, self) => self.findIndex(x => x.id === a.id) === i).slice(0, 16).map(album => (
              <div onClick={() => playCollection(album.id, true)} key={album.id} className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer relative h-full flex flex-col border border-white/5">
                <div className="relative mb-3">
                  <CoverImage src={album.cover_url} alt={album.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={album.title?.substring(0, 2).toUpperCase()} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                      <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-white text-sm mb-0.5 truncate">{album.title}</h3>
                <p className="text-xs text-neutral-400 line-clamp-1">{album.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MadeForYouSection() {
  const playHistory = usePlayerStore(s => s.playHistory);
  const playTrack = usePlayerStore(s => s.playTrack);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [seedTrack, setSeedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playHistory.length > 0) {
      const seed = playHistory[0];
      setSeedTrack(seed);
      setLoading(true);
      libraryService.getRecommendations(seed.artist)
        .then(tracks => { setRecommendations(tracks); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [playHistory.length > 0 ? playHistory[0]?.id : null]);

  if (playHistory.length === 0) return null;
  if (!loading && recommendations.length === 0) return null;

  return (
    <div className="mb-8 animate-in">
      <div className="flex items-center gap-2 mb-2">
        <Music2 className="w-5 h-5 text-green-500" />
        <h2 className="text-2xl font-bold">Made For You</h2>
      </div>
      <p className="text-sm text-neutral-400 mb-4">
        {seedTrack ? <>Because you listened to <span className="text-white font-medium">{seedTrack.artist}</span></> : "Recommended for you"}
      </p>
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-[#1f1f1f]/30 p-3 rounded-2xl border border-white/5 space-y-3">
              <Skeleton className="w-full aspect-square rounded-xl animate-pulse" />
              <Skeleton className="h-4 w-3/4 animate-pulse" />
              <Skeleton className="h-3 w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recommendations.slice(0, 16).map((track, i) => (
            <div key={i} onClick={() => { playTrack(track, recommendations); }}
              className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer relative h-full flex flex-col border border-white/5">
              <div className="relative mb-3">
                <CoverImage src={track.cover_url} alt={track.title} className="w-full aspect-square rounded-xl shadow-lg" fallbackText={track.title?.substring(0, 2).toUpperCase()} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                  <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-white text-sm mb-0.5 truncate">{track.title}</h3>
              <p className="text-xs text-neutral-400 line-clamp-2">{track.artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistSpotlightSection() {
  const playHistory = usePlayerStore(s => s.playHistory);
  const [artists, setArtists] = useState<string[]>([]);
  const [artistPhotos, setArtistPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const POPULAR_ARTISTS = [
    "Sơn Tùng M-TP", "HIEUTHUHAI", "Đen Vâu", "Hoàng Dũng",
    "Vũ.", "MONO", "Tlinh", "Erik", "Binz", "JustaTee",
    "Rhymastic", "Low G", "MCK", "Min", "Amee", "Karik",
    "Suboi", "Bích Phương", "Trúc Nhân", "Đức Phúc"
  ];

  useEffect(() => {
    const deriveArtists = () => {
      const historyArtists = new Set<string>();
      playHistory.forEach(track => { if (track.artist) historyArtists.add(track.artist); });
      const recent = Array.from(historyArtists).slice(0, 5);
      const needed = 20 - recent.length;
      const available = POPULAR_ARTISTS.filter(a => !historyArtists.has(a));
      const shuffled = available.sort(() => 0.5 - Math.random()).slice(0, needed);
      return [...recent, ...shuffled];
    };

    const targetArtists = deriveArtists();
    setArtists(targetArtists);

    const loadPhotos = async () => {
      const cacheKey = 'artist_photos_cache_v7';
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      setArtistPhotos(cached);
      const missing = targetArtists.filter(name => !cached[name]);

      if (missing.length > 0) {
        const results = await Promise.all(missing.map(async (name) => {
          try { const data = await libraryService.getArtistInfo(name); if (data.photo) return { name, photo: data.photo, isPlaceholder: data.isPlaceholder }; } catch { }
          return null;
        }));
        const updates: Record<string, string> = {};
        const cacheUpdates: Record<string, string> = {};
        results.forEach(r => { if (r) { updates[r.name] = r.photo; if (!r.isPlaceholder) cacheUpdates[r.name] = r.photo; } });
        if (Object.keys(updates).length > 0) {
          setArtistPhotos(prev => {
            const next = { ...prev, ...updates };
            const nextCache = { ...prev, ...cacheUpdates };
            localStorage.setItem(cacheKey, JSON.stringify(nextCache));
            return next;
          });
        }
      }
      setLoading(false);
    };

    loadPhotos();
  }, [playHistory.length]);

  return (
    <div className="mb-8 animate-in">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-green-500" />
        <h2 className="text-2xl font-bold">Suggested Artists</h2>
      </div>
      <p className="text-sm text-neutral-400 mb-4">Based on your recent listening</p>
      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-shrink-0 w-36 text-center space-y-3">
              <Skeleton className="w-36 h-36 rounded-full animate-pulse" />
              <Skeleton className="h-4 w-3/4 mx-auto animate-pulse" />
            </div>
          ))
        ) : (
          artists.map((name, i) => (
            <Link to={`/artist/${encodeURIComponent(name)}`} key={i} className="flex-shrink-0 w-36 text-center group cursor-pointer">
              <div className="relative mb-3">
                <CoverImage src={artistPhotos[name]} alt={name} className="w-36 h-36 rounded-full shadow-lg group-hover:shadow-xl transition object-cover" fallbackText={name.substring(0, 2).toUpperCase()} />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                    <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                  </div>
                </div>
              </div>
              <h3 className="font-bold text-white text-sm truncate px-2">{name}</h3>
              <p className="text-xs text-neutral-400">Artist</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function ChartSection({ title, icon, chartType }: { title: string; icon: React.ReactNode; chartType: string }) {
  const playTrack = usePlayerStore(s => s.playTrack);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const results = await libraryService.getCharts(chartType);
        if (results && results.length > 0) setTracks(results.slice(0, 24));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchCharts();
  }, [chartType]);

  if (loading && tracks.length === 0) return null;
  if (!loading && tracks.length === 0) return null;

  return (
    <div className="mb-8 animate-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <Link to={`/charts?chart_type=${chartType}`}>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-white">See all</span>
        </Link>
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
            <div key={i} className="flex-shrink-0 w-36 space-y-3">
              <Skeleton className="w-full aspect-square rounded-xl animate-pulse" />
              <Skeleton className="h-4 w-3/4 animate-pulse" />
              <Skeleton className="h-3 w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {tracks.map((track, idx) => (
            <div key={track.id} onClick={() => playTrack(track, tracks)}
              className="flex-shrink-0 w-36 bg-[#1f1f1f]/30 p-2 rounded-xl hover:bg-[#1f1f1f]/85 transition group cursor-pointer border border-white/5">
              <div className="relative mb-2">
                <div className="absolute top-1 left-1 z-10 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{(idx + 1).toString().padStart(2, '0')}</span>
                </div>
                <CoverImage src={track.cover_url} alt={track.title} className="w-full aspect-square rounded-lg shadow-lg" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                  <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                    <Play className="fill-current text-black ml-0.5 w-4 h-4" />
                  </div>
                </div>
              </div>
              <h4 className="font-bold text-white text-xs truncate">{track.title}</h4>
              <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
