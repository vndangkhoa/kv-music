import { useState } from 'react';
import { Settings, Heart, ListMusic, User as UserIcon, Music, Flame, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import SoundCloudSidebar from '../components/SoundCloudSidebar';
import SoundCloudTrackCard from '../components/SoundCloudTrackCard';
import CoverImage from '../components/CoverImage';
import { Play } from 'lucide-react';

function getAvatarGradient(avatarColor?: string): string {
  try {
    if (!avatarColor) return 'linear-gradient(135deg, #ff5500, #ff7a00)';
    const parsed: { from: string; to: string } = JSON.parse(avatarColor);
    return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
  } catch {
    return 'linear-gradient(135deg, #ff5500, #ff7a00)';
  }
}

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const likedTracksData = usePlayerStore(s => s.likedTracksData);
  const playHistory = usePlayerStore(s => s.playHistory);
  const userPlaylists = useLibraryStore(s => s.userPlaylists);
  const followedArtists = useLibraryStore(s => s.followedArtists);
  const savedAlbums = useLibraryStore(s => s.savedAlbums);
  const playTrack = usePlayerStore(s => s.playTrack);

  const [activeTab, setActiveTab] = useState<'overview' | 'likes' | 'playlists' | 'history'>('overview');

  const avatarGradient = user ? getAvatarGradient(user.avatarColor) : 'linear-gradient(135deg, #ff5500, #ff7a00)';

  return (
    <div className="min-h-full text-white bg-[#121212]">
      {/* SoundCloud Profile Hero Header Banner */}
      <div className="relative w-full bg-gradient-to-r from-[#222222] via-[#1a1a1a] to-[#121212] border-b border-white/5 py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-[1240px] mx-auto flex flex-col sm:flex-row items-center sm:items-end gap-6 relative z-10">
          {/* Avatar with Status Ring */}
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-4xl sm:text-5xl font-black text-white border-4 border-[#ff5500] shadow-2xl flex-shrink-0"
            style={{ background: avatarGradient }}
          >
            {isLoggedIn && user ? user.name.trim()[0].toUpperCase() : '?'}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="bg-[#ff5500] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                {isLoggedIn ? 'VIP Member' : 'Guest Listener'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white truncate">
              {isLoggedIn && user ? user.name : 'SoundCloud Guest'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              {isLoggedIn && user ? user.email : 'Log in to sync your music library across all devices'}
            </p>

            {/* Quick Stats Pills */}
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-4 text-xs font-semibold text-neutral-300">
              <div><strong className="text-white font-extrabold">{likedTracksData.length}</strong> Likes</div>
              <div>•</div>
              <div><strong className="text-white font-extrabold">{userPlaylists.length}</strong> Playlists</div>
              <div>•</div>
              <div><strong className="text-white font-extrabold">{followedArtists.length}</strong> Following</div>
            </div>
          </div>

          {/* Header Action Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition border border-white/10"
          >
            <Settings className="w-4 h-4 text-[#ff5500]" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="max-w-[1240px] mx-auto px-3 md:px-6 py-6 flex gap-8">
        {/* Left Content Stream */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Sub Navigation Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-white/10">
            {[
              { id: 'overview', label: 'Overview', icon: Flame },
              { id: 'likes', label: `Likes (${likedTracksData.length})`, icon: Heart },
              { id: 'playlists', label: `Playlists (${userPlaylists.length})`, icon: ListMusic },
              { id: 'history', label: `History (${playHistory.length})`, icon: History },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#ff5500] text-white shadow-md'
                      : 'bg-[#181818] border border-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Recently Liked Tracks Stream */}
              <section>
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-[#ff5500]" fill="currentColor" />
                    <h2 className="text-base font-extrabold text-white">Recently Liked</h2>
                  </div>
                  {likedTracksData.length > 0 && (
                    <button onClick={() => setActiveTab('likes')} className="text-xs font-bold text-[#ff5500] hover:underline">
                      View all
                    </button>
                  )}
                </div>

                {likedTracksData.length === 0 ? (
                  <div className="bg-[#181818] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                    <Heart className="w-10 h-10 text-neutral-600 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No liked tracks yet</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Tap the heart icon on any track while browsing to add it to your profile collection.
                    </p>
                    <Link to="/" className="inline-block px-5 py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white rounded-full text-xs font-bold transition">
                      Discover Tracks
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {likedTracksData.slice(0, 3).map((track, i) => (
                      <SoundCloudTrackCard key={`prof-like-${track.id}-${i}`} track={track} queue={likedTracksData} />
                    ))}
                  </div>
                )}
              </section>

              {/* User Playlists Shelf */}
              <section>
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-[#ff5500]" />
                    <h2 className="text-base font-extrabold text-white">Your Playlists</h2>
                  </div>
                </div>

                {userPlaylists.length === 0 ? (
                  <div className="bg-[#181818] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                    <ListMusic className="w-10 h-10 text-neutral-600 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No playlists created</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Create custom playlists to organize your favorite music into personal collections.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {userPlaylists.map(playlist => (
                      <Link
                        key={playlist.id}
                        to={`/playlist/${playlist.id}`}
                        className="bg-[#181818] hover:bg-[#222222] p-3 rounded-xl border border-white/5 transition group flex flex-col"
                      >
                        <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square rounded-lg object-cover mb-2" fallbackText="PL" />
                        <h3 className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">{playlist.title}</h3>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{playlist.tracks?.length || 0} tracks</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: LIKES */}
          {activeTab === 'likes' && (
            <div className="space-y-3">
              {likedTracksData.length === 0 ? (
                <div className="bg-[#181818] border border-white/5 rounded-2xl p-8 text-center space-y-3">
                  <Heart className="w-10 h-10 text-neutral-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Your Likes list is empty</h3>
                </div>
              ) : (
                likedTracksData.map((track, i) => (
                  <SoundCloudTrackCard key={`likes-page-${track.id}-${i}`} track={track} queue={likedTracksData} />
                ))
              )}
            </div>
          )}

          {/* TAB 3: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {userPlaylists.map(playlist => (
                <Link
                  key={playlist.id}
                  to={`/playlist/${playlist.id}`}
                  className="bg-[#181818] hover:bg-[#222222] p-3 rounded-xl border border-white/5 transition group flex flex-col"
                >
                  <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-full aspect-square rounded-lg object-cover mb-2" fallbackText="PL" />
                  <h3 className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">{playlist.title}</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{playlist.tracks?.length || 0} tracks</p>
                </Link>
              ))}
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              {playHistory.map((track, i) => (
                <div
                  key={`hist-${track.id}-${i}`}
                  onClick={() => playTrack(track, playHistory)}
                  className="flex items-center gap-3 p-2 bg-[#181818] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer group transition"
                >
                  <CoverImage src={track.cover_url} alt={track.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">{track.title}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{track.artist}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#ff5500] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Desktop SoundCloud Sidebar */}
        <div className="hidden lg:flex flex-shrink-0 flex-col items-stretch">
          <SoundCloudSidebar />
        </div>
      </div>
    </div>
  );
}
