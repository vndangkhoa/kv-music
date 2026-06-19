export default function Logo() {
    return (
        <div className="flex items-center gap-2 select-none">
            {/* Equalizer Bars Logo */}
            <svg viewBox="0 0 32 32" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="#121212" />
                <rect x="4" y="16" width="4.5" height="10" rx="2.25" fill="#1DB954" />
                <rect x="10.5" y="10" width="4.5" height="16" rx="2.25" fill="#1DB954" />
                <rect x="17" y="6" width="4.5" height="20" rx="2.25" fill="#1DB954" />
                <rect x="23.5" y="12" width="4.5" height="14" rx="2.25" fill="#1DB954" />
            </svg>
            <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">
                KV Music
            </span>
        </div>
    );
}
