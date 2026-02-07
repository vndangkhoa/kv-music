interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div
            className={`bg-neutral-800 animate-pulse rounded ${className}`}
            aria-hidden="true"
        />
    );
}
