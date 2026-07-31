import { useState } from 'react';
import { Home, Compass, Library, Plus, Trash2, Heart, Music } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { useUIStore } from '../stores/uiStore';
import CreatePlaylistModal from './CreatePlaylistModal';
import { dbService } from '../services/db';
import { getArtistCoverUrl } from '../services/library';
import CoverImage from './CoverImage';

export default function Sidebar() {
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const userPlaylists = useLibraryStore(s => s.userPlaylists);
  const followedArtists = useLibraryStore(s => s.followedArtists);
  const savedAlbums = useLibraryStore(s => s.savedAlbums);
  const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
  const activeFilter = useLibraryStore(s => s.activeFilter);
  const setActiveFilter = useLibraryStore(s => s.setActiveFilter);
  const isSidebarOpen = useUIStore(s => s.isSidebarOpen);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleCreatePlaylist = async (name: string) => {
    const newPlaylist = await dbService.createPlaylist(name);
    refreshLibrary();
    setIsCreateModalOpen(false);
    if (newPlaylist) navigate(`/playlist/${newPlaylist.id}`);
  };

  const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this playlist?')) {
      await dbService.deletePlaylist(id);
      refreshLibrary();
    }
  };

  const showPlaylists = activeFilter === 'all' || activeFilter === 'playlists';
  const showArtists = activeFilter === 'all' || activeFilter === 'artists';
  const showAlbums = activeFilter === 'all' || activeFilter === 'albums';

  if (!isSidebarOpen) return null;

  return (
    <aside className="hidden fold:flex flex-col w-[250px] h-full bg-[#0f1938] border-r border-cyan-500/10 flex-shrink-0 overflow-hidden select-none animate-in slide-in-from-left duration-200">
      {/* Quick Nav */}
      <div className="px-3 pt-4 pb-3">
        <div className="flex flex-col gap-1">
          {[
            { to: '/', icon: Home, label: 'Trang Chủ' },
            { to: '/search', icon: Compass, label: 'Khám Phá' },
            { to: '/library', icon: Library, label: 'Thư Viện' },
          ].map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive(to) 
                  ? 'bg-gradient-to-r from-[#00a8ff]/20 to-[#2e86de]/10 text-cyan-400 border border-cyan-500/20 shadow-sm' 
                  : 'text-neutral-300 hover:text-white hover:bg-cyan-500/10'
              }`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(to) ? 'text-cyan-400' : 'text-neutral-400'}`} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-cyan-500/10 mx-4" />

      {/* Liked Songs */}
      <div className="px-3 py-3">
        <Link to="/collection/tracks" className="block group">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
            isActive('/collection/tracks') ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-cyan-500/10'
          }`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00a8ff] to-[#00d2d3] flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/20">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition">Bài Hát Yêu Thích</h3>
              <p className="text-[10px] text-cyan-300/70 font-medium">{likedTracks.size} bài</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="h-px bg-cyan-500/10 mx-4" />

      {/* Library Content */}
      <div className="flex-1 flex flex-col overflow-hidden pt-3">
        <div className="px-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-cyan-400/80 uppercase tracking-widest">THƯ VIỆN CỦA TÔI</span>
            <button onClick={() => setIsCreateModalOpen(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition" title="Tạo Playlist mới">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1.5">
            {(['Playlists', 'Artists', 'Albums'] as const).map((filter) => {
              const key = filter.toLowerCase() as 'playlists' | 'artists' | 'albums';
              const active = activeFilter === key;
              return (
                <button key={filter} onClick={() => setActiveFilter(active ? 'all' : key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    active ? 'bg-gradient-to-r from-[#00a8ff] to-[#2e86de] text-white shadow-sm' : 'bg-[#142044] text-neutral-400 hover:bg-cyan-500/10 hover:text-white'
                  }`}>
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1 no-scrollbar">
          <div className="space-y-1">
            {showPlaylists && userPlaylists.map((playlist) => {
              const active = isActive(`/playlist/${playlist.id}`);
              return (
                <div key={playlist.id} className={`group relative rounded-xl transition ${active ? 'bg-cyan-500/20' : ''}`}>
                  <Link to={`/playlist/${playlist.id}`}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-cyan-500/10 transition">
                    <CoverImage src={playlist.cover_url} alt={playlist.title} className="w-9 h-9 rounded-lg flex-shrink-0 object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition">{playlist.title}</h3>
                      <p className="text-[10px] text-neutral-400">Playlist</p>
                    </div>
                  </Link>
                  <button onClick={(e) => handleDeletePlaylist(e, playlist.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {showArtists && followedArtists.map((artistName) => (
              <Link key={artistName} to={`/artist/${encodeURIComponent(artistName)}`}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-cyan-500/10 transition">
                <CoverImage
                  src={getArtistCoverUrl(artistName)}
                  alt={artistName} className="w-9 h-9 rounded-full flex-shrink-0 object-cover shadow-sm"
                  fallbackText={artistName?.substring(0, 2).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate hover:text-cyan-300 transition">{artistName}</h3>
                  <p className="text-[10px] text-neutral-400">Nghệ sĩ</p>
                </div>
              </Link>
            ))}

            {showAlbums && savedAlbums.map((album) => (
              <Link key={album.id} to={`/album/${album.id}`}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-cyan-500/10 transition">
                <CoverImage src={album.cover_url} alt={album.title} className="w-9 h-9 rounded-lg flex-shrink-0 object-cover shadow-sm" fallbackText="&#128191;" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate hover:text-cyan-300 transition">{album.title}</h3>
                  <p className="text-[10px] text-neutral-400 truncate">{album.artist || 'Album'}</p>
                </div>
              </Link>
            ))}

            {userPlaylists.length === 0 && followedArtists.length === 0 && savedAlbums.length === 0 && (
              <div className="text-center py-8 px-4">
                <Music className="w-8 h-8 text-cyan-500/40 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">Chưa có dữ liệu thư viện</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreate={handleCreatePlaylist} />
    </aside>
  );
}
