import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ListPlus, Plus, X } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { isUserOwnedPlaylist } from '../services/db';
import { Playlist, Track } from '../types';
import { toast } from '../stores/toastStore';
import { useModalDialog } from '../hooks/useModalDialog';
import CoverImage from './CoverImage';

interface AddToPlaylistModalProps {
    track: Track;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const createPlaylist = useLibraryStore(s => s.createPlaylist);
    const addTrackToPlaylist = useLibraryStore(s => s.addTrackToPlaylist);
    const removeTrackFromPlaylist = useLibraryStore(s => s.removeTrackFromPlaylist);

    const editablePlaylists = useMemo(
        () => userPlaylists.filter(p => isUserOwnedPlaylist(p)),
        [userPlaylists],
    );

    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useModalDialog(dialogRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            void refreshLibrary();
            setShowCreateInput(editablePlaylists.length === 0);
            setBusyId(null);
            setCreating(false);
        }
    }, [isOpen]);

    const handleTogglePlaylist = async (playlist: Playlist) => {
        if (busyId) return;
        const alreadyInPlaylist = playlist.tracks?.some(t => t.id === track.id) ?? false;
        setBusyId(playlist.id);
        try {
            if (alreadyInPlaylist) {
                await removeTrackFromPlaylist(playlist.id, track.id);
                toast(`Removed from "${playlist.title}"`);
            } else {
                await addTrackToPlaylist(playlist.id, track);
                toast(`Saved to "${playlist.title}"`);
            }
        } catch {
            toast('Could not update playlist');
        } finally {
            setBusyId(null);
        }
    };

    const handleCreateAndAdd = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = newPlaylistName.trim();
        if (!trimmed || creating) return;
        setCreating(true);
        try {
            const created = await createPlaylist(trimmed, undefined, [track]);
            toast(`Created "${created.title}" & saved song`);
            setNewPlaylistName('');
            setShowCreateInput(false);
        } catch {
            toast('Could not create playlist');
        } finally {
            setCreating(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            {...({ closedby: 'any' } as any)}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[16px] bg-[#212121] border border-white/10 text-white p-0 shadow-2xl overflow-hidden"
        >
            <div>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#181818]">
                    <div className="flex items-center gap-2.5">
                        <ListPlus className="w-4 h-4 text-white/80" />
                        <h2 id={titleId} className="text-base font-bold text-white">
                            Save to playlist
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => dialogRef.current?.close()}
                        aria-label="Close dialog"
                        className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Track Preview */}
                <div className="px-5 py-3 bg-[#181818]/60 border-b border-white/5 flex items-center gap-3">
                    <CoverImage
                        src={track.cover_url}
                        alt={track.title}
                        className="w-11 h-11 rounded-[4px] object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{track.title}</p>
                        <p className="text-xs text-white/60 truncate">{track.artist}</p>
                    </div>
                </div>

                {/* User Playlists & Quick Create */}
                <div className="max-h-72 overflow-y-auto ytm-scroller p-3 space-y-1.5">
                    {editablePlaylists.length === 0 && !showCreateInput && (
                        <p className="text-xs text-white/60 px-2 py-1">
                            You have no personal playlists yet. Create one below.
                        </p>
                    )}

                    {editablePlaylists.map((playlist) => {
                        const isAdded = playlist.tracks?.some(t => t.id === track.id) ?? false;
                        const songCount = playlist.tracks?.length || 0;
                        const isBusy = busyId === playlist.id;
                        return (
                            <button
                                key={playlist.id}
                                type="button"
                                disabled={Boolean(busyId)}
                                onClick={() => handleTogglePlaylist(playlist)}
                                className="w-full p-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.06] rounded-[8px] transition text-left group disabled:opacity-60"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <CoverImage
                                        src={playlist.cover_url || playlist.tracks?.[0]?.cover_url}
                                        alt={playlist.title}
                                        className="w-10 h-10 rounded-[4px] object-cover flex-shrink-0"
                                        fallbackText={playlist.title.substring(0, 2).toUpperCase() || 'PL'}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white truncate">{playlist.title}</p>
                                        <p className="text-xs text-white/60">
                                            {songCount} {songCount === 1 ? 'song' : 'songs'}
                                        </p>
                                    </div>
                                </div>
                                {isAdded ? (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#030303] text-xs font-medium flex-shrink-0">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Saved</span>
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-white/10 group-hover:bg-white/20 rounded-full text-xs font-medium text-white flex-shrink-0 transition">
                                        {isBusy ? 'Saving…' : 'Add'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* New Playlist Footer Action */}
                <div className="p-3 border-t border-white/10 bg-[#181818]/80">
                    {showCreateInput ? (
                        <form onSubmit={handleCreateAndAdd} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="New playlist title..."
                                maxLength={100}
                                autoFocus
                                className="flex-1 min-w-0 h-10 px-3.5 bg-[#030303] border border-white/15 rounded-full text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                            />
                            <button
                                type="submit"
                                disabled={!newPlaylistName.trim() || creating}
                                className="h-10 px-4 rounded-full bg-white text-[#030303] text-xs font-semibold hover:bg-white/90 disabled:opacity-40 flex-shrink-0 transition"
                            >
                                {creating ? 'Saving…' : 'Create'}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowCreateInput(true)}
                            className="w-full h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2 transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New playlist</span>
                        </button>
                    )}
                </div>
            </div>
        </dialog>
    );
}
