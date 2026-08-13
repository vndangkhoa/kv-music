export default function Logo() {
    return (
        <div className="flex items-center gap-2 select-none group cursor-pointer">
            {/* SoundCloud-style animated soundwave logo icon */}
            <div className="relative flex items-end justify-center gap-[3px] w-8 h-8 rounded bg-gradient-to-br from-[#ff7a00] to-[#ff5500] shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300 pb-[7px]">
                <span className="w-[2.5px] rounded-full bg-white animate-soundwave-1" style={{ height: '10px' }} />
                <span className="w-[2.5px] rounded-full bg-white animate-soundwave-2" style={{ height: '16px' }} />
                <span className="w-[2.5px] rounded-full bg-white animate-soundwave-3" style={{ height: '8px' }} />
                <span className="w-[2.5px] rounded-full bg-white animate-soundwave-4" style={{ height: '12px' }} />
            </div>

            <div className="flex flex-col leading-tight hidden sm:flex">
                <div className="flex items-center gap-1">
                    <span className="text-base font-black tracking-tight text-white group-hover:text-[#ff5500] transition">
                        SOUNDCLOUD
                    </span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#ff5500] text-white uppercase tracking-wider">
                        PRO
                    </span>
                </div>
                <span className="text-[8px] font-bold text-neutral-400 tracking-widest uppercase">
                    KV MUSIC PLATFORM
                </span>
            </div>
        </div>
    );
}
