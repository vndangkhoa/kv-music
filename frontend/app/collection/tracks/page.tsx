"use client";

import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, Clock, Heart } from "lucide-react";

export default function LikedSongsPage() {
    const { likedTracksData, playTrack, currentTrack, isPlaying } = usePlayer();

    const handlePlay = (track: any) => {
        playTrack(track, likedTracksData);
    };

    const formatDuration = (seconds: number) => {
        if (!seconds) return "-:--";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full overflow-y-auto no-scrollbar bg-gradient-to-b from-indigo-900 via-[#121212] to-[#121212]">
            {/* Header */}
            <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-transparent to-black/20">
                <div className="w-52 h-52 bg-gradient-to-br from-indigo-700 to-blue-300 shadow-2xl flex items-center justify-center rounded-md">
                    <Heart className="w-24 h-24 text-white fill-white" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold uppercase">Playlist</span>
                    <h1 className="text-8xl font-black tracking-tight text-white mb-4">Liked Songs</h1>
                    <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-bold">K</div>
                        <span className="hover:underline cursor-pointer">Khoa Vo</span>
                        <span>•</span>
                        <span>{likedTracksData.length} songs</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 py-6 relative z-10">
                <div className="bg-green-500 rounded-full w-14 h-14 flex items-center justify-center hover:scale-105 transition cursor-pointer shadow-lg">
                    <Play className="w-7 h-7 text-black fill-black ml-1" />
                </div>
            </div>

            {/* List */}
            <div className="px-8 pb-8">
                {/* Header Row */}
                <div className="grid grid-cols-[16px_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 py-2 border-b border-[#ffffff1a] text-sm text-spotify-text-muted mb-4">
                    <span>#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <div className="flex justify-end pr-8"><Clock className="w-4 h-4" /></div>
                </div>

                {likedTracksData.length > 0 ? (
                    likedTracksData.map((track, i) => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                            <div
                                key={track.id}
                                onClick={() => handlePlay(track)}
                                className={`grid grid-cols-[16px_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 py-2 rounded-md hover:bg-[#ffffff1a] group cursor-pointer transition items-center text-sm text-spotify-text-muted hover:text-white ${isCurrent ? 'bg-[#ffffff1a]' : ''}`}
                            >
                                <span className="group-hover:hidden text-center">{i + 1}</span>
                                <span className="hidden group-hover:block text-white"><Play className="w-3 h-3 fill-white" /></span>

                                <div className="flex items-center gap-4 min-w-0">
                                    <img src={track.cover_url} className="w-10 h-10 rounded shadow-sm object-cover" alt="" />
                                    <div className="flex flex-col min-w-0">
                                        <span className={`font-semibold truncate text-base ${isCurrent ? 'text-green-500' : 'text-white'}`}>{track.title}</span>
                                        <span className="truncate hover:underline text-xs">{track.artist}</span>
                                    </div>
                                </div>
                                <span className="truncate hover:underline">{track.album}</span>
                                <span className="text-right pr-8 font-mono">{formatDuration(0)}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 text-spotify-text-muted">
                        <p className="text-lg">No liked songs yet.</p>
                        <p className="text-sm mt-2">Go search for some music and tap the heart icon!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
