"use client";

import { useEffect, useState } from "react";

export default function Logo() {
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // Subtle animation on load
        const timer = setTimeout(() => setIsAnimating(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex items-center gap-3 group cursor-pointer">
            {/* Logo Icon */}
            <div className={`relative w-10 h-10 ${isAnimating ? 'animate-pulse' : ''}`}>
                {/* Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954] via-[#1ed760] to-[#169c46] rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-500" />

                {/* Main Logo Container */}
                <div className="relative w-10 h-10 bg-gradient-to-br from-[#1DB954] to-[#169c46] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition duration-300">
                    {/* Sound Wave Bars */}
                    <div className="flex items-end gap-[3px] h-5">
                        <div className="w-[3px] bg-black rounded-full animate-soundwave-1 h-3" />
                        <div className="w-[3px] bg-black rounded-full animate-soundwave-2 h-5" />
                        <div className="w-[3px] bg-black rounded-full animate-soundwave-3 h-4" />
                        <div className="w-[3px] bg-black rounded-full animate-soundwave-4 h-2" />
                    </div>
                </div>
            </div>

            {/* Text Logo */}
            <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-white via-[#1DB954] to-[#1ed760] bg-clip-text text-transparent group-hover:from-[#1DB954] group-hover:to-white transition duration-500">
                    Audiophile
                </span>
                <span className="text-[10px] text-[#a7a7a7] tracking-widest uppercase -mt-1">
                    Web Player
                </span>
            </div>
        </div>
    );
}

// Mini version for header/mobile
export function LogoMini() {
    return (
        <div className="relative w-8 h-8 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954] to-[#169c46] rounded-lg blur-sm opacity-50 group-hover:opacity-80 transition" />
            <div className="relative w-8 h-8 bg-gradient-to-br from-[#1DB954] to-[#169c46] rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <div className="flex items-end gap-[2px] h-4">
                    <div className="w-[2px] bg-black rounded-full animate-soundwave-1 h-2" />
                    <div className="w-[2px] bg-black rounded-full animate-soundwave-2 h-4" />
                    <div className="w-[2px] bg-black rounded-full animate-soundwave-3 h-3" />
                </div>
            </div>
        </div>
    );
}
