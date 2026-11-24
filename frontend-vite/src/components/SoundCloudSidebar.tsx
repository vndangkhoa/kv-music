import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, TrendingUp, Library, Plus, Play, Pin, Trash2 } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import { isUserOwnedPlaylist } from '../services/db';
import { Playlist } from '../types';
import { toast } from '../stores/toastStore';
import CreatePlaylistModal from './CreatePlaylistModal';
import ConfirmDialog from './ConfirmDialog';

export interface YtmGuideSidebarProps {
  collapsed?: boolean;
  onCreatePlaylist?: () => void;
}

const GUIDE_LINKS = [
  { to: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { to: '/feed', label: 'Explore', icon: Compass, match: (p: string) => p === '/feed' || p === '/explore' },
  { to: '/charts', label: 'Charts', icon: TrendingUp, match: (p: string) => p === '/charts' },
  { to: '/library', label: 'Library', icon: Library, match: (p: string) => p === '/library' },
] as const;

function isViewingPlaylist(pathname: string, playlistId: string): boolean {
  const encoded = `/playlist/${encodeURIComponent(playlistId)}`;
  if (pathname === encoded) return true;
  try {
    return decodeURIComponent(pathname) === `/playlist/${playlistId}`;
  } catch {
    return false;
  }
}

export function YtmGuideSidebar({ collapsed = false, onCreatePlaylist }: YtmGuideSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const userPlaylists = useLibraryStore(s => s.userPlaylists);
  const createPlaylist = useLibraryStore(s => s.createPlaylist);
  const deletePlaylist = useLibraryStore(s => s.deletePlaylist);
  const likedTracksData = usePlayerStore(s => s.likedTracksData);
  const playTrack = usePlayerStore(s => s.playTrack);
  const hasPlayerBar = usePlayerStore(s => Boolean(s.currentTrack));

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Playlist | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreatePlaylist = async (name: string, description?: string) => {
    try {
      const created = await createPlaylist(name, description);
      toast(`Created playlist "${created.title}"`);
      navigate(`/playlist/${encodeURIComponent(created.id)}`);
    } catch (err) {
      toast('Could not create playlist');
      throw err;
    }
  };

  const handlePlayPlaylist = async (pl: Playlist) => {
    if (pl.tracks && pl.tracks.length > 0) {
      playTrack(pl.tracks[0], pl.tracks);
      return;
    }
    try {
      const full = await libraryService.getPlaylist(pl.id);
      if (full && full.tracks.length > 0) {
        playTrack(full.tracks[0], full.tracks);
        return;
      }
    } catch {
      /* fallback to navigating to playlist */
    }
    navigate(`/playlist/${encodeURIComponent(pl.id)}`);
  };

  const handleRemovePlaylist = async (pl: Playlist) => {
    const isOwned = isUserOwnedPlaylist(pl);
    if (isOwned) {
      setConfirmDelete(pl);
      return;
    }
    try {
      await deletePlaylist(pl.id);
      toast(`Removed "${pl.title}" from library`);
      if (isViewingPlaylist(location.pathname, pl.id)) {
        navigate('/library');
      }
    } catch {
      toast('Could not remove playlist');
    }
  };

  const handleConfirmDeleteOwned = async () => {
    if (!confirmDelete || deleting) return;
    const target = confirmDelete;
    setDeleting(true);
    try {
      await deletePlaylist(target.id);
      toast(`Deleted "${target.title}"`);
      setConfirmDelete(null);
      if (isViewingPlaylist(location.pathname, target.id)) {
        navigate('/library');
      }
    } catch {
      toast('Could not delete playlist');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <aside
        aria-label="Primary navigation"
        className={`h-full bg-[#030303] border-r border-white/10 flex flex-col flex-shrink-0 select-none transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        } ${hasPlayerBar ? 'pb-[76px]' : 'pb-4'}`}
      >
        {/* Primary Links */}
        <nav className={collapsed ? 'px-1.5 pt-2 space-y-1' : 'px-2 pt-2 space-y-0.5'}>
          {GUIDE_LINKS.map(({ to, label, icon: Icon, match }) => {
            const active = match(location.pathname);

            if (collapsed) {
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  className={`flex flex-col items-center justify-center py-3 px-1 rounded-[8px] gap-1 transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.2 : 1.75} />
                  <span className="text-[10px] leading-3 font-normal truncate w-full text-center">
                    {label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`h-12 px-4 rounded-[8px] flex items-center gap-5 text-[15px] transition-colors ${
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/75 hover:text-white hover:bg-white/10 font-normal'
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={active ? 2.2 : 1.75} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Secondary Section: Divider, + New playlist & User Playlists */}
        {!collapsed && (
          <>
            <div className="h-px bg-white/10 mx-6 my-3 flex-shrink-0" />

            <div className="px-4 mb-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onCreatePlaylist) onCreatePlaylist();
                  else setIsCreateModalOpen(true);
                }}
                className="w-full h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-5 h-5" />
                <span>New playlist</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ytm-scroller px-2 space-y-0.5">
              {/* Pinned Liked Music */}
              <div
                className={`group relative flex items-center justify-between gap-2 h-14 px-4 rounded-[8px] transition-colors ${
                  location.pathname === '/collection/tracks' ? 'bg-white/10' : 'hover:bg-white/10'
                }`}
              >
                <Link to="/collection/tracks" className="min-w-0 flex-1 py-1">
                  <p className="text-[14px] font-medium text-white truncate leading-[18px]">
                    Liked Music
                  </p>
                  <p className="text-[12px] text-white/70 truncate leading-4 mt-0.5 flex items-center gap-1">
                    <Pin className="w-3 h-3 flex-shrink-0 rotate-45 text-white/60" />
                    <span className="truncate">
                      Auto playlist{likedTracksData.length > 0 ? ` • ${likedTracksData.length}` : ''}
                    </span>
                  </p>
                </Link>

                {likedTracksData.length > 0 && (
                  <button
                    type="button"
                    onClick={() => playTrack(likedTracksData[0], likedTracksData)}
                    aria-label="Play Liked Music"
                    className="w-6 h-6 rounded-full bg-white text-[#030303] flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:scale-105 transition shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                )}
              </div>

              {/* Saved User & Curated Playlists */}
              {userPlaylists.map((pl) => {
                const playlistHref = `/playlist/${encodeURIComponent(pl.id)}`;
                const isActive = isViewingPlaylist(location.pathname, pl.id);
                const isOwned = isUserOwnedPlaylist(pl);
                const count = pl.tracks?.length || 0;
                return (
                  <div
                    key={pl.id}
                    className={`group relative flex items-center justify-between gap-1.5 h-14 px-4 rounded-[8px] transition-colors ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/10'
                    }`}
                  >
                    <Link to={playlistHref} className="min-w-0 flex-1 py-1">
                      <p className="text-[14px] font-medium text-white truncate leading-[18px]">
                        {pl.title}
                      </p>
                      <p className="text-[12px] text-white/70 truncate leading-4 mt-0.5">
                        {isOwned
                          ? `Your playlist • ${count} ${count === 1 ? 'song' : 'songs'}`
                          : 'Playlist • KV Music'}
                      </p>
                    </Link>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => void handlePlayPlaylist(pl)}
                        aria-label={`Play ${pl.title}`}
                        title={`Play ${pl.title}`}
                        className="w-6 h-6 rounded-full bg-white text-[#030303] flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:scale-105 transition shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemovePlaylist(pl)}
                        aria-label={isOwned ? `Delete ${pl.title}` : `Remove ${pl.title} from library`}
                        title={isOwned ? 'Delete playlist' : 'Remove from library'}
                        className="w-6 h-6 rounded-full text-white/60 hover:text-[#ff4e45] hover:bg-white/10 flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>

      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Delete playlist?"
        message={
          confirmDelete
            ? `Permanently delete "${confirmDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleConfirmDeleteOwned}
        onCancel={() => {
          if (!deleting) setConfirmDelete(null);
        }}
      />
    </>
  );
}

export default YtmGuideSidebar;
