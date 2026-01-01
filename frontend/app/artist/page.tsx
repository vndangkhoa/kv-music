"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Pause, Clock, User, Music, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import CoverImage from "@/components/CoverImage";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import Link from "next/link";
import { Track } from "@/types";

function ArtistPageContent() {
    const searchParams = useSearchParams();
    const artistName = searchParams.get("name") || "";

    const [allSongs, setAllSongs] = useState<Track[]>([]);
    const [artistPhoto, setArtistPhoto] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAllSongs, setShowAllSongs] = useState(false);

    const { playTrack, currentTrack, isPlaying } = usePlayer();

    // Modal State
    const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);
    const [trackToAdd, setTrackToAdd] = useState<Track | null>(null);

    useEffect(() => {
        if (!artistName) return;

        setIsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        // Fetch artist info (photo) and songs in parallel
        Promise.all([
            fetch(`${apiUrl}/api/artist/info?name=${encodeURIComponent(artistName)}`).then(r => r.json()),
            fetch(`${apiUrl}/api/search?query=${encodeURIComponent(artistName)}`).then(r => r.json())
        ])
            .then(([artistInfo, searchData]) => {
                if (artistInfo.photo) {
                    setArtistPhoto(artistInfo.photo);
                }
                setAllSongs(searchData.tracks || []);
            })
            .catch(err => console.error("Failed to load artist:", err))
            .finally(() => setIsLoading(false));
    }, [artistName]);

    // Categorize songs
    const topSongs = allSongs.slice(0, 5); // Most popular
    const hitSongs = allSongs.slice(5, 10); // More hits
    const recentSongs = allSongs.slice(10, 15); // Recent-ish
    const otherSongs = allSongs.slice(15); // Rest

    const handlePlay = (track: Track, queue: Track[]) => {
        playTrack(track, queue);
    };

    const openAddToPlaylist = (e: React.MouseEvent, track: Track) => {
        e.stopPropagation();
        setTrackToAdd(track);
        setIsAddToPlaylistOpen(true);
    };

    // Get first letter for avatar fallback
    const artistInitials = artistName.substring(0, 2).toUpperCase();

    if (!artistName) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-[#a7a7a7]">No artist specified</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212] no-scrollbar pb-24">
            {/* Artist Header */}
            <div className="relative h-80 bg-gradient-to-b from-[#535353] to-transparent p-6 flex items-end">
                {/* Artist Avatar - Use real photo or fallback */}
                {artistPhoto ? (
                    <img
                        src={artistPhoto}
                        alt={artistName}
                        className="w-48 h-48 rounded-full object-cover shadow-2xl mr-6"
                    />
                ) : (
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white text-6xl font-bold shadow-2xl mr-6">
                        {artistInitials}
                    </div>
                )}

                <div className="flex-1">
                    <p className="text-sm font-medium uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" /> Artist
                    </p>
                    <h1 className="text-5xl md:text-7xl font-bold mb-4">{artistName}</h1>
                    <p className="text-[#a7a7a7]">{allSongs.length} songs found</p>
                </div>
            </div>

            {/* Play Button */}
            <div className="px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => allSongs.length > 0 && handlePlay(allSongs[0], allSongs)}
                    className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg"
                >
                    <Play className="fill-black text-black ml-1 w-6 h-6" />
                </button>
            </div>

            {isLoading ? (
                <div className="px-6 py-8 flex items-center justify-center">
                    <div className="animate-pulse text-[#a7a7a7]">Loading songs...</div>
                </div>
            ) : allSongs.length === 0 ? (
                <div className="px-6 py-8 text-center">
                    <p className="text-[#a7a7a7]">No songs found for this artist</p>
                </div>
            ) : (
                <div className="px-6 space-y-8">
                    {/* Popular / Top Songs */}
                    {topSongs.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Music className="w-5 h-5 text-[#1DB954]" />
                                <h2 className="text-2xl font-bold">Popular</h2>
                            </div>
                            <SongList songs={topSongs} allSongs={allSongs} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist} currentTrack={currentTrack} isPlaying={isPlaying} />
                        </section>
                    )}

                    {/* Hit Songs */}
                    {hitSongs.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">🔥</span>
                                <h2 className="text-2xl font-bold">Hits</h2>
                            </div>
                            <SongList songs={hitSongs} allSongs={allSongs} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist} currentTrack={currentTrack} isPlaying={isPlaying} />
                        </section>
                    )}

                    {/* Recent Releases */}
                    {recentSongs.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-[#1DB954]" />
                                <h2 className="text-2xl font-bold">More Songs</h2>
                            </div>
                            <SongList songs={recentSongs} allSongs={allSongs} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist} currentTrack={currentTrack} isPlaying={isPlaying} />
                        </section>
                    )}

                    {/* All Other Songs */}
                    {otherSongs.length > 0 && (
                        <section>
                            <button
                                onClick={() => setShowAllSongs(!showAllSongs)}
                                className="flex items-center gap-2 mb-4 text-2xl font-bold hover:underline"
                            >
                                <span>All Songs ({otherSongs.length})</span>
                                {showAllSongs ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                            </button>
                            {showAllSongs && (
                                <SongList songs={otherSongs} allSongs={allSongs} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist} currentTrack={currentTrack} isPlaying={isPlaying} />
                            )}
                        </section>
                    )}
                </div>
            )}

            <AddToPlaylistModal
                track={trackToAdd}
                isOpen={isAddToPlaylistOpen}
                onClose={() => setIsAddToPlaylistOpen(false)}
            />
        </div>
    );
}

// Song List Component
interface SongListProps {
    songs: Track[];
    allSongs: Track[];
    onPlay: (track: Track, queue: Track[]) => void;
    onAddToPlaylist: (e: React.MouseEvent, track: Track) => void;
    currentTrack: Track | null;
    isPlaying: boolean;
}

function SongList({ songs, allSongs, onPlay, onAddToPlaylist, currentTrack, isPlaying }: SongListProps) {
    return (
        <div className="space-y-2">
            {songs.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                    <div
                        key={`${track.id}-${index}`}
                        onClick={() => onPlay(track, allSongs)}
                        className={`flex items-center gap-4 p-3 rounded-md hover:bg-[#282828] cursor-pointer group transition ${isCurrent ? 'bg-[#282828]' : ''}`}
                    >
                        {/* Track Number / Play Icon */}
                        <div className="w-8 text-center text-[#a7a7a7] group-hover:hidden">
                            {isCurrent ? (
                                <span className="text-[#1DB954]">{isPlaying ? '▶' : '❚❚'}</span>
                            ) : (
                                <span>{index + 1}</span>
                            )}
                        </div>
                        <div className="w-8 text-center hidden group-hover:block">
                            {isCurrent && isPlaying ? (
                                <Pause className="w-4 h-4 text-white mx-auto" />
                            ) : (
                                <Play className="w-4 h-4 text-white mx-auto" />
                            )}
                        </div>

                        {/* Cover */}
                        <div className="w-12 h-12 flex-shrink-0">
                            <CoverImage
                                src={track.cover_url}
                                alt={track.title}
                                className="w-12 h-12 rounded object-cover"
                            />
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>
                                {track.title}
                            </h3>
                            <p className="text-sm text-[#a7a7a7] truncate">{track.artist}</p>
                        </div>

                        {/* Album */}
                        <div className="hidden md:block flex-1 min-w-0">
                            <p className="text-sm text-[#a7a7a7] truncate">{track.album}</p>
                        </div>

                        {/* Duration */}
                        <div className="text-sm text-[#a7a7a7] w-12 text-right">
                            {track.duration ? formatDuration(track.duration) : '--:--'}
                        </div>

                        {/* Add to Playlist */}
                        <button
                            onClick={(e) => onAddToPlaylist(e, track)}
                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-[#383838] rounded-full transition"
                        >
                            <Plus className="w-4 h-4 text-white" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ArtistPage() {
    return (
        <Suspense fallback={<div className="h-full flex items-center justify-center text-[#a7a7a7]">Loading...</div>}>
            <ArtistPageContent />
        </Suspense>
    );
}
