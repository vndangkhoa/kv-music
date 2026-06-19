import { useState, useEffect } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { dbService } from '../services/db';
import { Track, Playlist } from '../types';

interface AddToPlaylistModalProps {
    track: Track;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
    const { userPlaylists, refreshLibrary } = useLibrary();
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            refreshLibrary();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddToPlaylist = async (playlist: Playlist) => {
        await dbService.addToPlaylist(playlist.id, track);
        await refreshLibrary();
        onClose();
    };

    const handleCreateAndAdd = async () => {
        if (!newPlaylistName.trim()) return;
        const newPlaylist = await dbService.createPlaylist(newPlaylistName.trim());
        await dbService.addToPlaylist(newPlaylist.id, track);
        await refreshLibrary();
        setNewPlaylistName('');
        setShowCreate(false);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#282828] rounded-lg w-full max-w-sm shadow-2xl animate-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold">Add to Playlist</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-white transition"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Track Preview */}
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <img
                        src={track.cover_url}
                        alt={track.title}
                        className="w-12 h-12 rounded object-cover"
                    />
                    <div className="min-w-0">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                    </div>
                </div>

                {/* Playlist List */}
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                    {/* Create New Option */}
                    {showCreate ? (
                        <div className="p-4 flex gap-2">
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                placeholder="Playlist name"
                                className="flex-1 px-3 py-2 bg-neutral-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#FF0000]"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                            />
                            <button
                                onClick={handleCreateAndAdd}
                                className="px-4 py-2 bg-[#FF0000] text-white font-bold rounded-full hover:scale-105 transition"
                            >
                                Create
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition text-left"
                        >
                            <div className="w-10 h-10 bg-neutral-700 rounded flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </div>
                            <span className="font-medium">Create new playlist</span>
                        </button>
                    )}

                    {/* Existing Playlists */}
                    {userPlaylists.map((playlist) => (
                        <button
                            key={playlist.id}
                            onClick={() => handleAddToPlaylist(playlist)}
                            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition text-left"
                        >
                            <img
                                src={playlist.cover_url || `https://placehold.co/40/222/fff?text=${playlist.title?.charAt(0) || '?'}`}
                                alt={playlist.title}
                                className="w-10 h-10 rounded object-cover"
                            />
                            <div className="min-w-0">
                                <p className="font-medium truncate">{playlist.title}</p>
                                <p className="text-sm text-neutral-400">{playlist.tracks?.length || 0} songs</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
