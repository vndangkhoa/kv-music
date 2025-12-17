"use client";

import { Home, Search, Library } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 h-[64px] flex items-center justify-around z-50 pb-safe">
            <Link href="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-white' : 'text-neutral-400'}`}>
                <Home size={24} fill={isActive('/') ? "currentColor" : "none"} />
                <span className="text-[10px]">Home</span>
            </Link>

            <Link href="/search" className={`flex flex-col items-center gap-1 ${isActive('/search') ? 'text-white' : 'text-neutral-400'}`}>
                <Search size={24} />
                <span className="text-[10px]">Search</span>
            </Link>

            <Link href="/library" className={`flex flex-col items-center gap-1 ${isActive('/library') ? 'text-white' : 'text-neutral-400'}`}>
                <Library size={24} />
                <span className="text-[10px]">Library</span>
            </Link>
        </div>
    );
}
