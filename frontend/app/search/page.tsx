"use client";

import { useState } from "react";
import { Search as SearchIcon, Play, Pause, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

interface Track {
    title: string;
    artist: string;
    album: string;
    cover_url: string;
    id: string;
}

import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { Plus } from "lucide-react";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Track[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { playTrack, currentTrack, isPlaying } = usePlayer();

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiUrl}/api/search?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            setResults(data.tracks || []);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handlePlay = (track: Track) => {
        // Create a temporary queue from the search results
        playTrack(track, results);
    };

    const openAddToPlaylist = (e: React.MouseEvent, track: Track) => {
        e.stopPropagation();
        setTrackToAdd(track);
        setIsAddToPlaylistOpen(true);
    };

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212] p-6 no-scrollbar">
            {/* Search Input */}
            <div className="mb-8 sticky top-0 z-20 py-4 -mt-4 flex justify-center">
                <form onSubmit={handleSearch} className="relative w-full max-w-[400px]">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-5 h-5 z-10" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="What do you want to play?"
                        className="w-full h-12 rounded-full pl-10 pr-4 bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-white placeholder-gray-500"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:scale-110 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </form>
            </div>

            {/* Results */}
            <div>
                {isSearching ? (
                    <div className="text-white">Searching...</div>
                ) : results.length > 0 ? (
                    <>
                        <h2 className="text-2xl font-bold mb-4">Top Results</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {results.map((track, i) => {
                                const isCurrent = currentTrack?.id === track.id;
                                return (
                                    <div key={i} onClick={() => handlePlay(track)} className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition cursor-pointer group relative">
                                        <div className="relative mb-4">
                                            <img src={track.cover_url} className="w-full aspect-square rounded-md object-cover shadow-lg" alt={track.title} />
                                            <div className={`absolute bottom-2 right-2 transition-all translate-y-2 group-hover:translate-y-0 shadow-xl bg-green-500 rounded-full p-3 ${isCurrent ? 'opacity-100 translate-y-0' : 'opacity-0'}`}>
                                                {isCurrent && isPlaying ? (
                                                    <Pause className="w-5 h-5 text-black fill-black ml-0.5" />
                                                ) : (
                                                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                                                )}
                                            </div>
                                        </div>
                                        <h3 className={`font-bold mb-1 truncate ${isCurrent ? "text-green-500" : "text-white"}`}>{track.title}</h3>
                                        <p className="text-sm text-spotify-text-muted line-clamp-2">{track.artist}</p>

                                        {/* Add to Playlist Button (Absolute Top Right of Card) */}
                                        <button
                                            onClick={(e) => openAddToPlaylist(e, track)}
                                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition text-white"
                                            title="Add to Playlist"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                        <h2 className="text-2xl font-bold mb-4">Play what you love</h2>
                        <p className="text-spotify-text-muted">Search for artists, songs, podcasts, and more.</p>
                    </div>
                )}
            </div>

            <AddToPlaylistModal
                track={trackToAdd}
                isOpen={isAddToPlaylistOpen}
                onClose={() => setIsAddToPlaylistOpen(false)}
            />
        </div>
    );
}
