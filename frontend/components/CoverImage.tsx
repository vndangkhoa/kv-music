"use client";

import { useState } from "react";

interface CoverImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackText?: string;
}

// Generate a consistent gradient based on text
function getGradient(text: string): string {
    const gradients = [
        "from-purple-600 to-blue-500",
        "from-pink-500 to-orange-400",
        "from-green-500 to-teal-400",
        "from-blue-600 to-indigo-500",
        "from-red-500 to-pink-500",
        "from-yellow-500 to-orange-500",
        "from-indigo-500 to-purple-500",
        "from-teal-500 to-cyan-400",
    ];

    // Simple hash based on string
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }

    return gradients[Math.abs(hash) % gradients.length];
}

export default function CoverImage({ src, alt, className = "", fallbackText }: CoverImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const displayText = fallbackText || alt?.substring(0, 2).toUpperCase() || "♪";
    const gradient = getGradient(alt || "default");

    // Treat placehold.co URLs and empty/undefined src as "no image"
    const isPlaceholderUrl = src?.includes('placehold.co') || src?.includes('placeholder');

    if (!src || hasError || isPlaceholderUrl) {
        return (
            <div
                className={`bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl ${className}`}
            >
                <span className="opacity-80">{displayText}</span>
            </div>
        );
    }

    return (
        <>
            {isLoading && (
                <div
                    className={`bg-gradient-to-br ${gradient} flex items-center justify-center text-white animate-pulse ${className}`}
                >
                    <span className="opacity-50">♪</span>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} ${isLoading ? 'hidden' : ''}`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                }}
            />
        </>
    );
}
