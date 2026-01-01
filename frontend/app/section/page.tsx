"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { libraryService } from "@/services/library";
import Link from "next/link";
import CoverImage from "@/components/CoverImage";
import { Play, ArrowLeft } from "lucide-react";
import Skeleton from "@/components/Skeleton";

function SectionContent() {
    const searchParams = useSearchParams();
    const category = searchParams.get("category");
    const router = useRouter();

    // Full fetched items from backend
    const [allItems, setAllItems] = useState<any[]>([]);
    // Items currently displayed (subset for infinite scroll)
    const [visibleItems, setVisibleItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        if (!category) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setPage(1); // Reset page when category changes
        setHasMore(true); // Reset hasMore when category changes
        setVisibleItems([]); // Clear visible items
        setAllItems([]); // Clear all items

        // Fetch live data from new endpoint
        fetch(`/api/browse/category?name=${encodeURIComponent(category)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAllItems(data);
                    setVisibleItems(data.slice(0, ITEMS_PER_PAGE));
                    setHasMore(data.length > ITEMS_PER_PAGE);
                } else {
                    setAllItems([]);
                    setVisibleItems([]);
                    setHasMore(false);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching section:", err);
                setLoading(false);
                setAllItems([]);
                setVisibleItems([]);
                setHasMore(false);
            });
    }, [category]);

    // Load more function
    const loadMore = () => {
        if (!hasMore || loading) return;

        const nextLimit = (page + 1) * ITEMS_PER_PAGE;
        const nextItems = allItems.slice(0, nextLimit);

        setVisibleItems(nextItems);
        setPage(prev => prev + 1);

        if (nextLimit >= allItems.length) {
            setHasMore(false);
        }
    };

    // Intersection Observer for infinite scroll trigger
    useEffect(() => {
        if (!hasMore || loading || allItems.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        }, { threshold: 0.1 });

        const trigger = document.getElementById('scroll-trigger');
        if (trigger) observer.observe(trigger);

        return () => observer.disconnect();
    }, [hasMore, loading, page, allItems]); // Re-run when pagination state updates

    if (!category) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[#a7a7a7]">
                <p>No category specified.</p>
                <button onClick={() => router.back()} className="mt-4 text-white hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212] p-6 no-scrollbar pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="bg-black/50 hover:bg-black/80 p-2 rounded-full transition"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-3xl font-bold text-white capitalize">{category}</h1>
            </div>

            {loading && visibleItems.length === 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="w-full aspect-square rounded-md" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : visibleItems.length > 0 ? (
                <>
                    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {visibleItems.map((playlist: any) => (
                            <Link href={`/playlist?id=${playlist.id}`} key={playlist.id}>
                                <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
                                    <div className="relative mb-4">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full aspect-square object-cover rounded-md shadow-lg"
                                            fallbackText={playlist.title.substring(0, 2).toUpperCase()}
                                        />
                                        <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                                            <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                                                <Play className="fill-black text-black ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold mb-1 truncate">{playlist.title}</h3>
                                    <p className="text-sm text-[#a7a7a7] line-clamp-2">{playlist.description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Scroll Trigger / Loading More Indicator */}
                    {hasMore && (
                        <div id="scroll-trigger" className="py-8 flex justify-center">
                            <div className="w-8 h-8 border-4 border-[#333] border-t-[#1DB954] rounded-full animate-spin"></div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 text-[#a7a7a7]">
                    <p>No items found in this category.</p>
                </div>
            )}
        </div>
    );
}

export default function SectionPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white">Loading...</div>}>
            <SectionContent />
        </Suspense>
    );
}
