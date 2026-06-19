import React, { useState } from 'react';

interface CoverImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackText?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function CoverImage({ src, alt, className = "", fallbackText = "♪♪", onClick }: CoverImageProps) {
    const [error, setError] = useState(false);
    const [loaded, setLoaded] = useState(false);

    if (!src || error) {
        return (
            <div
                className={`relative overflow-hidden bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-2xl font-bold text-white/60 ${className}`}
                aria-label={alt}
                onClick={onClick}
            >
                {fallbackText}
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
            {!loaded && (
                <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
                onError={() => setError(true)}
                onLoad={() => setLoaded(true)}
                loading="lazy"
            />
        </div>
    );
}
