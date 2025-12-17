"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, Clock, Heart, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { dbService } from "@/services/db";
import { libraryService } from "@/services/library";

interface Track {
    title: string;
    artist: string;
    album: string;
    cover_url: string;
    id: string;
    url?: string;
    duration?: number;
}

interface PlaylistData {
    title: string;
    description: string;
    author: string;
    cover_url: string;
    tracks: Track[];
}

function PlaylistContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { playTrack, currentTrack, isPlaying, likedTracks, toggleLike } = usePlayer();

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    useEffect(() => {
        const fetchPlaylist = async () => {
            setIsLoading(true);
            try {
                if (!id) return;

                if (id === 'trending') {
                    const browse = await libraryService.getBrowseContent();
                    // Assumption: Trending exists or use first available
                    const trending = browse['Trending']?.[0] || browse['Top Lists']?.[0];
                    if (trending) {
                        setPlaylist({
                            ...trending,
                            author: "Audiophile",
                        });
                    }
                } else {
                    // Try DB (User Playlist)
                    const dbPlaylist = await dbService.getPlaylist(id);
                    if (dbPlaylist) {
                        setPlaylist({
                            title: dbPlaylist.title,
                            description: `Created on ${new Date(dbPlaylist.createdAt).toLocaleDateString()}`,
                            author: "You",
                            cover_url: dbPlaylist.cover_url || "https://placehold.co/300?text=Playlist",
                            tracks: dbPlaylist.tracks
                        });
                        setIsLoading(false);
                        return;
                    }

                    // Try Library (Static Playlist)
                    const libPlaylist = await libraryService.getPlaylist(id);
                    if (libPlaylist) {
                        setPlaylist({
                            ...libPlaylist,
                            author: "System"
                        });
                        setIsLoading(false);
                        return;
                    }

                    throw new Error("Playlist not found");
                }
            } catch (error) {
                console.error("Failed to fetch playlist:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchPlaylist();
    }, [id]);

    const handlePlay = (track: Track) => {
        if (playlist) {
            playTrack(track, playlist.tracks);
        } else {
            playTrack(track);
        }
    };

    const handlePlayAll = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return "-:--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const openAddToPlaylist = (e: React.MouseEvent, track: Track) => {
        e.stopPropagation();
        setTrackToAdd(track);
        setIsAddToPlaylistOpen(true);
    };

    if (isLoading) return <div className="p-8 text-white">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 text-white">Playlist not found.</div>;

    return (
        <div className="h-full overflow-y-auto no-scrollbar bg-gradient-to-b from-gray-900 via-[#121212] to-[#121212]">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-8 bg-gradient-to-b from-transparent to-black/20 pt-20 text-center md:text-left">
                <img src={playlist.cover_url} alt={playlist.title} className="w-52 h-52 md:w-60 md:h-60 shadow-2xl rounded-md object-cover" />
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <span className="text-sm font-bold uppercase hidden md:block">Playlist</span>
                    <h1 className="text-2xl md:text-6xl font-black tracking-tight text-white mb-2 md:mb-4 line-clamp-2 leading-tight">{playlist.title}</h1>

                    {/* Expandable Description */}
                    <div className="relative">
                        <p
                            className={`text-spotify-text-muted font-medium mb-2 ${isDescriptionExpanded ? '' : 'line-clamp-2 md:line-clamp-none'}`}
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        >
                            {playlist.description}
                        </p>
                        {playlist.description && playlist.description.length > 100 && (
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="text-xs text-white font-bold hover:underline md:hidden"
                            >
                                {isDescriptionExpanded ? "Show less" : "more"}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium text-white/90">
                        <span className="font-bold hover:underline cursor-pointer">{playlist.author || "User"}</span>
                        <span>•</span>
                        <span>{playlist.tracks.length} songs</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 py-6 flex items-center gap-8 relative z-10 justify-center md:justify-start">
                {/* ... (controls remain similar) ... */}
                <div onClick={handlePlayAll} className="bg-green-500 rounded-full w-14 h-14 flex items-center justify-center hover:scale-105 transition cursor-pointer shadow-lg hover:bg-green-400">
                    <Play className="w-7 h-7 text-black fill-black ml-1" />
                </div>
                <Heart className="w-8 h-8 text-spotify-text-muted hover:text-white cursor-pointer" />
                <MoreHorizontal className="w-8 h-8 text-spotify-text-muted hover:text-white cursor-pointer" />
            </div>

            {/* List */}
            <div className="px-4 md:px-8 pb-40">
                {/* Header Row */}
                <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 py-2 border-b border-[#ffffff1a] text-sm text-spotify-text-muted mb-4">
                    <span className="w-4 text-center">#</span>
                    <span>Title</span>
                    <span className="hidden md:block">Album</span>
                    <div className="flex justify-end md:pr-8"><Clock className="w-4 h-4" /></div>
                </div>

                <div className="flex flex-col">
                    {playlist.tracks.map((track, i) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isLiked = likedTracks.has(track.id);
                        return (
                            <div
                                key={track.id}
                                onClick={() => handlePlay(track)}
                                className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_4fr_3fr_minmax(120px,1fr)] gap-4 px-2 md:px-4 py-3 rounded-md hover:bg-[#ffffff1a] group cursor-pointer transition items-center text-sm text-spotify-text-muted hover:text-white ${isCurrent ? 'bg-[#ffffff1a]' : ''}`}
                            >
                                <span className="text-center w-4 flex justify-center items-center">
                                    {isCurrent && isPlaying ? (
                                        <img src="https://open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2ef4.gif" className="h-3 w-3" alt="playing" />
                                    ) : (
                                        <span className="block group-hover:hidden">{i + 1}</span>
                                    )}
                                    <Play className={`w-3 h-3 fill-white hidden ${isCurrent && isPlaying ? 'hidden' : 'group-hover:block'}`} />
                                </span>

                                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                                    <img src={track.cover_url} className="w-10 h-10 rounded shadow-sm object-cover shrink-0" alt="" />
                                    <div className="flex flex-col min-w-0 pr-2">
                                        {/* Changed from truncate to line-clamp-2 for readability */}
                                        <span className={`font-semibold text-base leading-tight line-clamp-2 break-words ${isCurrent ? 'text-green-500' : 'text-white'}`}>{track.title}</span>
                                        <span className="truncate hover:underline text-xs">{track.artist}</span>
                                    </div>
                                </div>
                                <span className="truncate hover:underline hidden md:block text-xs">{track.album}</span>
                                <div className="flex items-center justify-end gap-3 md:gap-4 md:pr-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                        className={`hidden md:block ${isLiked ? 'text-green-500 visible' : 'invisible group-hover:visible hover:text-white'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-green-500' : ''}`} />
                                    </button>
                                    <span className="font-mono text-xs md:text-sm">{formatDuration(track.duration)}</span>
                                    <button
                                        onClick={(e) => openAddToPlaylist(e, track)}
                                        className="md:invisible group-hover:visible hover:text-white text-spotify-text-muted"
                                    >
                                        <MoreHorizontal className="md:hidden w-5 h-5" />
                                        <Plus className="hidden md:block w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AddToPlaylistModal
                track={trackToAdd}
                isOpen={isAddToPlaylistOpen}
                onClose={() => setIsAddToPlaylistOpen(false)}
            />
        </div>
    );
}

export default function PlaylistPage() {
    return (
        <Suspense fallback={<div className="p-8 text-white">Loading...</div>}>
            <PlaylistContent />
        </Suspense>
    );
}
