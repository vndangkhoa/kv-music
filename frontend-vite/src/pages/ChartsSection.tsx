import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft, Flame, TrendingUp, Disc, Star } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import Skeleton from '../components/Skeleton';
import type { Track } from '../types';

const CHART_CONFIG: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
  'top-hits': {
    title: 'SoundCloud Realtime Top 50 Charts',
    desc: 'The most played and trending tracks on SoundCloud right now.',
    icon: <Flame className="w-6 h-6 text-[#ff5500]" />
  },
  'trending': {
    title: 'Top Trending V-Pop Charts',
    desc: 'Vietnamese pop & indie hits dominating the stream.',
    icon: <TrendingUp className="w-6 h-6 text-[#ff5500]" />
  },
  'top-albums': {
    title: 'Top 100 Global Stream Charts',
    desc: 'The hottest international chart toppers across all genres.',
    icon: <Disc className="w-6 h-6 text-[#ff5500]" />
  },
  'hits-collection': {
    title: 'SoundCloud New & Hot Collection',
    desc: 'Breakthrough creators and viral underground discoveries.',
    icon: <Star className="w-6 h-6 text-[#ff5500]" />
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
    <div className="min-h-full text-white bg-[#121212]">
      {/* Top SoundCloud Spotlight Header Banner */}
      <div className="relative w-full bg-gradient-to-r from-[#222222] via-[#1a1a1a] to-[#121212] border-b border-white/10 py-8 px-4 md:px-8">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {config.icon}
                <span className="bg-[#ff5500] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                  SoundCloud Official
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{config.title}</h1>
              <p className="text-xs text-neutral-400 mt-0.5">{config.desc}</p>
            </div>
          </div>

          {!loading && tracks.length > 0 && (
            <button
              onClick={() => playTrack(tracks[0], tracks)}
              className="px-6 py-2.5 bg-[#ff5500] hover:bg-[#ff7a00] text-white rounded-full text-xs font-extrabold uppercase tracking-wider shadow-lg active:scale-95 transition flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              Play All ({tracks.length})
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Layout matching SoundCloud Theme */}
      <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-6 flex gap-8">
        {/* Left Ranked Stream Column */}
        <div className="flex-1 min-w-0 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {tracks.map((track, idx) => {
                const rankNum = idx + 1;
                const isTop3 = rankNum <= 3;

                return (
                  <div key={track.id || idx} className="relative flex items-center gap-3 group">
                    {/* Rank Badge Indicator */}
                    <div
                      className={`w-8 sm:w-10 text-center font-black text-sm sm:text-base flex-shrink-0 rounded-lg py-1 ${
                        isTop3
                          ? 'bg-[#ff5500] text-white shadow'
                          : 'bg-[#181818] border border-white/10 text-neutral-400'
                      }`}
                    >
                      #{rankNum}
                    </div>

                    {/* SoundCloud Track Post Card */}
                    <div className="flex-1 min-w-0">
                      <SoundCloudTrackCard track={track} queue={tracks} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right SoundCloud Desktop Sidebar */}
        <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
          <SoundCloudSidebar />
        </div>
      </div>
    </div>
  );
}
