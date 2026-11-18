import { useId } from 'react';

export interface LogoProps {
    size?: number;
    showText?: boolean;
    showBadge?: boolean;
    showSubtitle?: boolean;
    className?: string;
}

export function Logo({
    size = 32,
    showText = true,
    showBadge = true,
    showSubtitle = true,
    className = '',
}: LogoProps) {
    const uid = useId().replace(/:/g, '');
    const bgId = `kvmusic-bg-${uid}`;
    const sheenId = `kvmusic-sheen-${uid}`;
    const isCompactHeader = !showBadge && !showSubtitle;

    return (
        <div className={`inline-flex items-center gap-2 select-none group ${className}`}>
            {/* Unified KV Music Brand Mark — matches /icon.svg, PWA icon & SPK icon */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 block transition-transform duration-300 group-hover:scale-105"
                style={{ borderRadius: Math.round(size * 0.22) }}
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id={bgId} x1="48" y1="24" x2="464" y2="488" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FF7A00" />
                        <stop offset="52%" stopColor="#FF5500" />
                        <stop offset="100%" stopColor="#CC3700" />
                    </linearGradient>
                    <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
                        <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.02" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
                    </linearGradient>
                </defs>
                <rect x="16" y="16" width="480" height="480" rx="112" fill={`url(#${bgId})`} />
                <rect x="16" y="16" width="480" height="480" rx="112" fill={`url(#${sheenId})`} />
                <rect x="20" y="20" width="472" height="472" rx="108" stroke="#FFFFFF" strokeOpacity="0.20" strokeWidth="4" />
                <circle cx="256" cy="256" r="178" fill="#111318" stroke="#FF6A00" strokeOpacity="0.36" strokeWidth="4" />
                <circle cx="256" cy="256" r="156" stroke="#FF6A00" strokeOpacity="0.22" strokeWidth="2.5" />
                <rect x="150" y="218" width="20" height="76" rx="10" fill="#FFE8D6" fillOpacity="0.96" />
                <rect x="182" y="190" width="20" height="132" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
                <rect x="214" y="160" width="20" height="192" rx="10" fill="#FF6A00" />
                <rect x="246" y="144" width="20" height="224" rx="10" fill="#FFFFFF" />
                <rect x="278" y="170" width="20" height="172" rx="10" fill="#FF6A00" />
                <rect x="310" y="200" width="20" height="112" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
                <rect x="342" y="223" width="20" height="66" rx="10" fill="#FFE8D6" fillOpacity="0.96" />
            </svg>

            {showText && (
                <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`font-bold tracking-tight text-white transition ${
                                isCompactHeader ? 'text-[18px] leading-none ytm-display-font' : 'text-base'
                            }`}
                        >
                            KV Music
                        </span>
                        {showBadge && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/15 text-white uppercase tracking-wider">
                                PRO
                            </span>
                        )}
                    </div>
                    {showSubtitle && (
                        <span className="text-[8px] font-bold text-white/60 tracking-widest uppercase">
                            HI-RES STREAMING
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default Logo;
