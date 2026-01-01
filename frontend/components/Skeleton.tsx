import React from 'react';

interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-700/50 rounded-md ${className}`}
        />
    );
}
