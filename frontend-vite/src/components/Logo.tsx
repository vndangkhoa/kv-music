export default function Logo() {
    return (
        <div className="flex items-center gap-2 select-none group cursor-pointer">
            {/* KV Music Cyan Headphone Equalizer Badge */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00a8ff] via-[#00d2d3] to-[#2e86de] shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3a9 9 0 00-9 9v7a3 3 0 003 3h1a2 2 0 002-2v-4a2 2 0 00-2-2H5v-2a7 7 0 1114 0v2h-2a2 2 0 00-2 2v4a2 2 0 002 2h1a3 3 0 003-3v-7a9 9 0 00-9-9z" />
                </svg>
                {/* Playing Equalizer Animation Overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5 opacity-90">
                    <div className="w-0.5 h-3 bg-white rounded-full animate-soundwave-1" />
                    <div className="w-0.5 h-4 bg-white rounded-full animate-soundwave-2" />
                    <div className="w-0.5 h-2.5 bg-white rounded-full animate-soundwave-3" />
                </div>
            </div>
            
            <div className="flex flex-col leading-tight hidden sm:flex">
                <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 font-sans">
                        kv-music
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm uppercase tracking-wider">
                        PRO VIP
                    </span>
                </div>
                <span className="text-[9px] font-bold text-cyan-400/80 tracking-widest uppercase">
                    MUSIC STREAMING
                </span>
            </div>
        </div>
    );
}
