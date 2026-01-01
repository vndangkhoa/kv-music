"use client";

import { usePlayer } from "@/context/PlayerContext";
import LyricsDetail from "./LyricsDetail";
import { X } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export default function RightSidebar() {
    const { currentTrack, isLyricsOpen, toggleLyrics } = usePlayer();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Sync current time from the global audio element
    useEffect(() => {
        const interval = setInterval(() => {
            // Try to find the audio element in PlayerBar
            const audio = document.querySelector('audio');
            if (audio) {
                setCurrentTime(audio.currentTime);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleSeek = (time: number) => {
        const audio = document.querySelector('audio') as HTMLAudioElement;
        if (audio) {
            audio.currentTime = time;
        }
    };

    // Only show on desktop when lyrics are open
    if (!isLyricsOpen || !currentTrack) {
        return null;
    }

    return (
        <aside className="hidden lg:flex w-[350px] flex-shrink-0 bg-[#121212] rounded-lg flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold">Lyrics</h2>
                <button
                    onClick={toggleLyrics}
                    className="text-white/60 hover:text-white transition p-1"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Lyrics Content */}
            <div className="flex-1 overflow-hidden">
                <LyricsDetail
                    track={currentTrack}
                    currentTime={currentTime}
                    onClose={toggleLyrics}
                    onSeek={handleSeek}
                    isInSidebar={true}
                />
            </div>
        </aside>
    );
}
