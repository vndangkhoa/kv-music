import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Heart, History, Tag, Flame, Radio, Play } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from './CoverImage';
import type { Track } from '../types';

interface SidebarArtist {
  id: string;
  name: string;
  followers: string;
  genre: string;
  photo?: string;
}

export default function SoundCloudSidebar() {
  const [suggestedArtists, setSuggestedArtists] = useState<SidebarArtist[]>([]);
  const [topChartTracks, setTopChartTracks] = useState<Track[]>([]);
  const playHistory = usePlayerStore(s => s.playHistory);
  const likedTracksData = usePlayerStore(s => s.likedTracksData);
  const playTrack = usePlayerStore(s => s.playTrack);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    libraryService.getArtists('vn').then(list => {
      const formatted = list.slice(0, 5).map((a, idx) => ({
        id: a.id,
        name: a.name,
        followers: `${(150 + idx * 85).toLocaleString()}K`,
        genre: idx % 3 === 0 ? 'V-Pop' : idx % 3 === 1 ? 'Hip-Hop' : 'R&B / Soul',
        photo: a.photo,
      }));
      setSuggestedArtists(formatted);
    }).catch(() => {});

    libraryService.getInitialTrendingTracks().then(tracks => {
      setTopChartTracks(tracks.slice(0, 4));
    }).catch(() => {});
  }, []);

  const toggleFollow = (id: string) => {
    setFollowingMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const popularTags = [
    { name: '#VPop', plays: '2.4M' },
    { name: '#HipHop', plays: '1.8M' },
    { name: '#Electronic', plays: '1.4M' },
    { name: '#LofiChill', plays: '1.2M' },
    { name: '#EDM', plays: '980K' },
    { name: '#R&B', plays: '850K' },
    { name: '#Indie', plays: '720K' },
    { name: '#Rock', plays: '540K' },
  ];

  return (
    <aside className="w-80 h-full flex flex-col justify-between border-l border-white/5 pl-6 select-none py-1">
      {/* Main Sidebar Scrollable Content */}
      <div className="space-y-6">
        {/* 1. Who to Follow Widget */}
        <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#ff5500]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">Who to follow</h3>
            </div>
            <Link to="/artists" className="text-xs font-bold text-[#ff5500] hover:underline transition">
              Refresh
            </Link>
          </div>

          <div className="space-y-3">
            {suggestedArtists.map(artist => {
              const isFollowing = !!followingMap[artist.id];
              return (
                <div key={artist.id} className="flex items-center justify-between gap-2">
                  <Link to={`/artist/${encodeURIComponent(artist.name)}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                    <CoverImage
                      src={artist.photo}
                      alt={artist.name}
                      className="w-9 h-9 rounded-full object-cover group-hover:opacity-80 transition border border-white/10 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-white group-hover:text-[#ff5500] truncate transition leading-tight">
                        {artist.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5 font-medium">
                        {artist.followers} followers • {artist.genre}
                      </p>
                    </div>
                  </Link>

                  <button
                    onClick={() => toggleFollow(artist.id)}
                    className={`px-3 py-1 rounded-full text-xs font-extrabold transition flex-shrink-0 ${
                      isFollowing
                        ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                        : 'bg-[#ff5500] text-white hover:bg-[#ff7a00] shadow'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Top Charts Widget (Replaces Creators & App Promos) */}
        {topChartTracks.length > 0 && (
          <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">Top 50 Weekly Charts</h3>
              </div>
              <Link to="/charts" className="text-xs font-bold text-[#ff5500] hover:underline transition">
                View Charts
              </Link>
            </div>

            <div className="space-y-2.5">
              {topChartTracks.map((track, idx) => (
                <button
                  key={`chart-${track.id}-${idx}`}
                  onClick={() => playTrack(track, topChartTracks)}
                  className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition text-left group"
                >
                  <span className="text-xs font-black text-[#ff5500] w-4 text-center flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <CoverImage
                    src={track.cover_url}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#ff5500] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow flex-shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Recently Liked Tracks Widget */}
        {likedTracksData.length > 0 && (
          <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#ff5500]" fill="currentColor" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">
                  {likedTracksData.length} Likes
                </h3>
              </div>
              <Link to="/library" className="text-xs font-bold text-[#ff5500] hover:underline transition">
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {likedTracksData.slice(0, 4).map((track, idx) => (
                <button
                  key={`liked-${track.id}-${idx}`}
                  onClick={() => playTrack(track, likedTracksData)}
                  className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition text-left group"
                >
                  <CoverImage
                    src={track.cover_url}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Listening History Widget */}
        {playHistory.length > 0 && (
          <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#ff5500]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">Listening History</h3>
              </div>
              <Link to="/library" className="text-xs font-bold text-[#ff5500] hover:underline transition">
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {playHistory.slice(0, 4).map((track, idx) => (
                <button
                  key={`history-${track.id}-${idx}`}
                  onClick={() => playTrack(track, playHistory)}
                  className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 transition text-left group"
                >
                  <CoverImage
                    src={track.cover_url}
                    alt={track.title}
                    className="w-9 h-9 rounded object-cover flex-shrink-0 border border-white/5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono flex-shrink-0">
                    {idx === 0 ? 'Just now' : `${idx * 15}m ago`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Music Radar & Live Radio Recommendation */}
        <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Radio className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">Live Music Radar</h3>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Continuous streaming station based on your recent listening habits and liked tracks.
          </p>
          <button
            onClick={() => {
              if (likedTracksData.length > 0) playTrack(likedTracksData[0], likedTracksData);
              else if (topChartTracks.length > 0) playTrack(topChartTracks[0], topChartTracks);
            }}
            className="w-full py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white text-xs font-extrabold rounded-lg shadow transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            <span>Play Music Radar Station</span>
          </button>
        </div>

        {/* 6. Trending Tags & Popular Genres */}
        <div className="bg-[#181818] border border-white/5 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/5">
            <Tag className="w-4 h-4 text-[#ff5500]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-200">Trending Tags & Genres</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popularTags.map(tag => (
              <Link
                key={tag.name}
                to={`/search?q=${encodeURIComponent(tag.name.replace('#', ''))}`}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#ff5500] rounded-full text-[11px] font-semibold text-neutral-300 hover:text-[#ff5500] transition flex items-center gap-1"
              >
                <span>{tag.name}</span>
                <span className="text-[9px] text-neutral-500 font-mono">• {tag.plays}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom SoundCloud Legal Footer */}
      <div className="pt-6 mt-6 border-t border-white/5 text-[11px] text-neutral-500 space-y-3 leading-relaxed">
        <div className="flex flex-wrap gap-x-2 gap-y-1 font-medium text-[11px]">
          <a href="#" className="hover:text-white transition">Legal</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition">Cookies</a>
          <span>•</span>
          <a href="#" className="hover:text-white transition">Creator Resources</a>
        </div>
        <div className="flex items-center justify-between text-neutral-500 text-[10px]">
          <span>Language: English (US)</span>
          <span className="text-[#ff5500] font-bold">KV SoundCloud v2.0</span>
        </div>
        <p className="text-neutral-600 text-[10px]">© 2026 SoundCloud Clone Inc. All rights reserved.</p>
      </div>
    </aside>
  );
}
