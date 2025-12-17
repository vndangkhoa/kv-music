"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

interface AddToPlaylistModalProps {
    track: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
    const [playlists, setPlaylists] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            fetch(`${apiUrl}/api/playlists`)
                .then(res => res.json())
                .then(data => setPlaylists(data))
                .catch(err => console.error(err));
        }
    }, [isOpen]);

    const handleAddToPlaylist = async (playlistId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            await fetch(`${apiUrl}/api/playlists/${playlistId}/tracks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(track)
            });
            alert(`Added to playlist!`);
            onClose();
        } catch (error) {
            console.error("Failed to add track:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-[#282828] w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-[#3e3e3e] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-300">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {playlists.length === 0 ? (
                        <div className="p-4 text-center text-spotify-text-muted">No playlists found. Create one first!</div>
                    ) : (
                        playlists.map((playlist) => (
                            <div
                                key={playlist.id}
                                onClick={() => handleAddToPlaylist(playlist.id)}
                                className="flex items-center gap-3 p-3 hover:bg-[#3e3e3e] rounded-md cursor-pointer transition text-white"
                            >
                                <div className="w-10 h-10 bg-[#121212] flex items-center justify-center rounded overflow-hidden">
                                    {playlist.cover_url && !playlist.cover_url.includes("placehold") ? (
                                        <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-lg">🎵</span>
                                    )}
                                </div>
                                <span className="font-medium truncate">{playlist.title}</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-[#3e3e3e]">
                    <button
                        onClick={() => {
                            const name = prompt("New Playlist Name");
                            if (name) {
                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                fetch(`${apiUrl}/api/playlists`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name })
                                }).then(() => {
                                    // Refresh list
                                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                    fetch(`${apiUrl}/api/playlists`)
                                        .then(res => res.json())
                                        .then(data => setPlaylists(data));
                                });
                            }
                        }}
                        className="w-full py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> New Playlist
                    </button>
                </div>
            </div>
        </div>
    );
}
