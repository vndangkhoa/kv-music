import { useState } from 'react';
import { Settings, ThumbsUp, ListMusic, History, Link2, Copy, RefreshCw, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import TrackRow, { YtmMediaCard } from '../components/TrackRow';
import { toast } from '../stores/toastStore';

function getAvatarGradient(avatarColor?: string): string {
  try {
    if (!avatarColor) return 'linear-gradient(135deg, #272727, #3f3f46)';
    const parsed: { from: string; to: string } = JSON.parse(avatarColor);
    if (parsed.from === '#ff5500') {
      return 'linear-gradient(135deg, #272727, #3f3f46)';
    }
    return `linear-gradient(135deg, ${parsed.from}, ${parsed.to})`;
  } catch {
    return 'linear-gradient(135deg, #272727, #3f3f46)';
  }
}

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const generatePairCode = useAuthStore(s => s.generatePairCode);
  const linkPairCode = useAuthStore(s => s.linkPairCode);
  const authError = useAuthStore(s => s.error);

  const setIsSettingsOpen = usePlayerStore(s => s.setIsSettingsOpen);
  const likedTracksData = usePlayerStore(s => s.likedTracksData);
  const playHistory = usePlayerStore(s => s.playHistory);
  const userPlaylists = useLibraryStore(s => s.userPlaylists);
  const followedArtists = useLibraryStore(s => s.followedArtists);

  const [activeTab, setActiveTab] = useState<'overview' | 'likes' | 'playlists' | 'history'>('overview');
  const [pairInput, setPairInput] = useState('');
  const [pairingBusy, setPairingBusy] = useState(false);

  const avatarGradient = user ? getAvatarGradient(user.avatarColor) : 'linear-gradient(135deg, #272727, #3f3f46)';

  const handleGenerateCode = async () => {
    setPairingBusy(true);
    const code = await generatePairCode();
    setPairingBusy(false);
    if (code) {
      toast(`New pair code: ${code}`);
    } else {
      toast('Sign in to generate a pairing code');
    }
  };

  const handleLinkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pairInput.trim();
    if (cleaned.length !== 6) {
      toast('Enter a 6-digit pairing code');
      return;
    }
    setPairingBusy(true);
    const ok = await linkPairCode(cleaned);
    setPairingBusy(false);
    if (ok) {
      setPairInput('');
      toast('Account linked across devices');
    } else {
      toast(authError || 'Invalid pairing code');
    }
  };

  const copyPairCode = async () => {
    if (!user?.pairCode) return;
    try {
      await navigator.clipboard.writeText(user.pairCode);
      toast('Pairing code copied');
    } catch {
      toast('Could not copy code');
    }
  };

  return (
    <div className="min-h-full bg-transparent text-white pb-24">
      {/* YTM Dark Profile Header */}
      <header className="border-b border-white/10 bg-gradient-to-b from-[#181818] to-[#030303]">
        <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-8 md:py-12 flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white border-2 border-white/20 shadow-2xl flex-shrink-0"
            style={{ background: avatarGradient }}
          >
            {isLoggedIn && user ? user.name.trim()[0].toUpperCase() : 'G'}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-white/60 mb-1">
              {isLoggedIn ? 'Channel' : 'Guest Session'}
            </span>
            <h1
              className="text-[28px] sm:text-[34px] font-bold text-white truncate leading-tight"
              style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
            >
              {isLoggedIn && user ? user.name : 'Guest Listener'}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              {isLoggedIn && user
                ? user.email || 'Synced across devices'
                : 'Sign in or link a 6-digit code to sync your library'}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-white/70">
              <span><strong className="text-white font-medium">{likedTracksData.length}</strong> Liked songs</span>
              <span>•</span>
              <span><strong className="text-white font-medium">{userPlaylists.length}</strong> Playlists</span>
              <span>•</span>
              <span><strong className="text-white font-medium">{followedArtists.length}</strong> Subscribed</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="h-9 px-5 rounded-full bg-white text-[#030303] hover:bg-white/90 text-sm font-medium inline-flex items-center gap-2 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium inline-flex items-center gap-2 transition"
            >
              <Settings className="w-4 h-4 text-white/80" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1478px] mx-auto px-4 md:px-10 py-6 space-y-8">
        {/* 6-Digit Device Pairing Card */}
        <section className="bg-[#181818] border border-white/10 rounded-[12px] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Link2 className="w-4 h-4 text-white/80" />
              <h2>Device pairing (6-digit code)</h2>
            </div>
            <p className="text-sm text-white/60">
              Link your mobile app or another browser instantly with a 6-digit pair code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isLoggedIn && user && (
              <div className="flex items-center gap-2 bg-[#212121] border border-white/10 rounded-[8px] px-3 py-1.5">
                <span className="text-xs text-white/60">Your code:</span>
                <span className="font-mono text-base font-bold tracking-widest text-white">
                  {user.pairCode || '------'}
                </span>
                {user.pairCode && (
                  <button
                    type="button"
                    onClick={copyPairCode}
                    aria-label="Copy pairing code"
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={pairingBusy}
                  aria-label="Generate new pairing code"
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pairingBusy ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}

            <form onSubmit={handleLinkCode} className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pairInput}
                onChange={(e) => setPairInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="w-40 h-9 px-3 rounded-[8px] bg-[#212121] border border-white/15 text-sm font-mono tracking-wider text-white placeholder-white/40 focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                disabled={pairingBusy || pairInput.length !== 6}
                className="h-9 px-4 rounded-full bg-white text-[#030303] hover:bg-white/90 text-sm font-medium transition disabled:opacity-40"
              >
                Link
              </button>
            </form>
          </div>
        </section>

        {/* YTM Filter Chip Tabs */}
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
        >
          {[
            { id: 'overview', label: 'Overview', icon: ThumbsUp },
            { id: 'likes', label: `Liked music (${likedTracksData.length})`, icon: ThumbsUp },
            { id: 'playlists', label: `Playlists (${userPlaylists.length})`, icon: ListMusic },
            { id: 'history', label: `History (${playHistory.length})`, icon: History },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-8 px-3 rounded-[8px] text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
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

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[20px] md:text-[24px] font-bold text-white"
                  style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                >
                  Recently liked
                </h2>
                {likedTracksData.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('likes')}
                    className="h-8 px-4 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white/10 transition"
                  >
                    Show all
                  </button>
                )}
              </div>

              {likedTracksData.length === 0 ? (
                <div className="bg-[#181818] border border-white/10 rounded-[12px] p-10 text-center space-y-3">
                  <ThumbsUp className="w-10 h-10 text-white/30 mx-auto" />
                  <h3 className="text-base font-bold text-white">No liked songs yet</h3>
                  <p className="text-sm text-white/60 max-w-sm mx-auto">
                    Like tracks while listening to save them here.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-white text-[#030303] text-sm font-medium hover:bg-white/90 transition"
                  >
                    Discover music
                  </Link>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {likedTracksData.slice(0, 5).map((track, i) => (
                    <TrackRow key={`prof-like-${track.id}-${i}`} track={track} queue={likedTracksData} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2
                  className="text-[20px] md:text-[24px] font-bold text-white"
                  style={{ fontFamily: 'var(--ytmusic-display-text-font-family, "YouTube Sans", "YT Sans", Roboto, sans-serif)' }}
                >
                  Your playlists
                </h2>
                {userPlaylists.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('playlists')}
                    className="h-8 px-4 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white/10 transition"
                  >
                    Show all
                  </button>
                )}
              </div>

              {userPlaylists.length === 0 ? (
                <div className="bg-[#181818] border border-white/10 rounded-[12px] p-10 text-center space-y-2">
                  <ListMusic className="w-10 h-10 text-white/30 mx-auto" />
                  <h3 className="text-base font-bold text-white">No playlists created</h3>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {userPlaylists.slice(0, 12).map(playlist => (
                    <YtmMediaCard
                      key={playlist.id}
                      title={playlist.title}
                      subtitle={`Playlist • ${playlist.tracks?.length || 0} songs`}
                      imageUrl={playlist.cover_url}
                      to={`/playlist/${encodeURIComponent(playlist.id)}`}
                      fallbackText="PL"
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 2: Likes */}
        {activeTab === 'likes' && (
          <div className="space-y-1">
            {likedTracksData.length === 0 ? (
              <div className="bg-[#181818] border border-white/10 rounded-[12px] p-10 text-center space-y-2">
                <ThumbsUp className="w-10 h-10 text-white/30 mx-auto" />
                <h3 className="text-base font-bold text-white">Your Liked music list is empty</h3>
              </div>
            ) : (
              likedTracksData.map((track, i) => (
                <TrackRow key={`likes-page-${track.id}-${i}`} track={track} queue={likedTracksData} />
              ))
            )}
          </div>
        )}

        {/* Tab 3: Playlists */}
        {activeTab === 'playlists' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {userPlaylists.map(playlist => (
              <YtmMediaCard
                key={playlist.id}
                title={playlist.title}
                subtitle={`Playlist • ${playlist.tracks?.length || 0} songs`}
                imageUrl={playlist.cover_url}
                to={`/playlist/${encodeURIComponent(playlist.id)}`}
                fallbackText="PL"
              />
            ))}
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="space-y-1">
            {playHistory.length === 0 ? (
              <div className="bg-[#181818] border border-white/10 rounded-[12px] p-10 text-center space-y-2">
                <History className="w-10 h-10 text-white/30 mx-auto" />
                <h3 className="text-base font-bold text-white">No listening history yet</h3>
              </div>
            ) : (
              playHistory.map((track, i) => (
                <TrackRow key={`hist-${track.id}-${i}`} track={track} queue={playHistory} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
