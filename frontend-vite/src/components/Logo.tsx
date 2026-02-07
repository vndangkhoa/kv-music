export default function Logo() {
    return (
        <div className="flex items-center gap-3">
            {/* Animated Soundwave Icon */}
            <div className="flex items-end gap-[2px] h-6">
                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-1" />
                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-2" />
                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-3" />
                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-4" />
            </div>
            {/* Text */}
            <span className="text-xl font-bold tracking-tight">
                Spotify <span className="text-[#1DB954]">Clone</span>
            </span>
        </div>
    );
}
