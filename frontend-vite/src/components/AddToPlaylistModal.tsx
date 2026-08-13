import { useState, useEffect } from 'react';
import { useLibraryStore } from '../stores/libraryStore';
import { dbService } from '../services/db';
import { Track, Playlist } from '../types';
import { Plus, Check, Music, X } from 'lucide-react';
import CoverImage from './CoverImage';

interface AddToPlaylistModalProps {
    track: Track;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            refreshLibrary();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddToPlaylist = async (playlist: Playlist) => {
        await dbService.addToPlaylist(playlist.id, track);
        await refreshLibrary();
        setAddedMap(prev => ({ ...prev, [playlist.id]: true }));
        setTimeout(() => {
            onClose();
        }, 600);
    };

    const handleCreateAndAdd = async () => {
        if (!newPlaylistName.trim()) return;
        const newPlaylist = await dbService.createPlaylist(newPlaylistName.trim());
        if (newPlaylist) {
            await dbService.addToPlaylist(newPlaylist.id, track);
            await refreshLibrary();
            setAddedMap(prev => ({ ...prev, [newPlaylist.id]: true }));
        }
        setNewPlaylistName('');
        setShowCreateInput(false);
        setTimeout(() => {
            onClose();
        }, 600);
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] border border-white/10 rounded-t-[28px] sm:rounded-2xl w-full max-w-md shadow-2xl text-white overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#121212]">
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-[#ff5500]" />
                        <h2 className="text-sm font-extrabold text-white">Save Track to Playlist</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Track Preview Bar */}
                <div className="p-3.5 bg-[#121212]/50 border-b border-white/5 flex items-center gap-3">
                    <CoverImage
                        src={track.cover_url}
                        alt={track.title}
                        className="w-11 h-11 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{track.title}</p>
                        <p className="text-[11px] text-neutral-400 truncate">{track.artist}</p>
                    </div>
                </div>

                {/* Playlist List / Quick Create Container */}
                <div className="max-h-72 overflow-y-auto no-scrollbar p-2 space-y-1">
                    {/* Create New Playlist Input Option */}
                    {showCreateInput ? (
                        <div className="p-2 flex gap-2 bg-[#121212] rounded-xl border border-[#ff5500]/40 my-1">
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="Enter playlist title..."
                                className="flex-1 px-3 py-2 bg-transparent text-white placeholder-neutral-500 text-xs font-medium focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                            />
                            <button
                                onClick={handleCreateAndAdd}
                                className="px-4 py-2 bg-[#ff5500] hover:bg-[#ff7a00] text-white font-extrabold text-xs rounded-lg transition active:scale-95 flex-shrink-0"
                            >
                                Save & Create
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCreateInput(true)}
                            className="w-full p-3 flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl transition text-left group"
                        >
                            <div className="w-9 h-9 bg-[#ff5500] text-white rounded-lg flex items-center justify-center shadow flex-shrink-0">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-extrabold text-white group-hover:text-[#ff5500] transition">
                                + Save to a New Playlist
                            </span>
                        </button>
                    )}

                    {/* Existing Playlists */}
                    {userPlaylists.map((playlist) => {
                        const isAdded = !!addedMap[playlist.id];
                        return (
                            <button
                                key={playlist.id}
                                onClick={() => handleAddToPlaylist(playlist)}
                                className="w-full p-2.5 flex items-center justify-between gap-3 hover:bg-white/5 rounded-xl transition text-left group"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <CoverImage
                                        src={playlist.cover_url}
                                        alt={playlist.title}
                                        className="w-9 h-9 rounded object-cover flex-shrink-0"
                                        fallbackText="PL"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-white group-hover:text-[#ff5500] truncate transition">{playlist.title}</p>
                                        <p className="text-[10px] text-neutral-400">{playlist.tracks?.length || 0} songs</p>
                                    </div>
                                </div>
                                {isAdded ? (
                                    <span className="flex items-center gap-1 text-[11px] font-extrabold text-green-400">
                                        <Check className="w-4 h-4" /> Added
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-white/5 group-hover:bg-[#ff5500] group-hover:text-white rounded-full text-[11px] font-bold text-neutral-300 transition">
                                        Add
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
