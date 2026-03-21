import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';

export default function Section() {
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');
    const { libraryItems } = useLibrary();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setLoading(false), 300);
        return () => clearTimeout(timer);
    }, [category]);

    const playlists = libraryItems.filter(item => item.type === 'Playlist');

    if (!category) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-neutral-400">No category specified</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto no-scrollbar pb-24 p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/">
                    <ArrowLeft className="w-6 h-6 text-neutral-400 hover:text-white transition" />
                </Link>
                <h1 className="text-3xl font-bold capitalize">{category}</h1>
            </div>

            {/* Grid */}
{loading ? (
                 <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                     {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                         <div key={i} className="space-y-3">
                             <Skeleton className="w-full aspect-square rounded-md" />
                             <Skeleton className="h-4 w-3/4" />
                             <Skeleton className="h-3 w-1/2" />
                         </div>
                     ))}
                 </div>
             ) : (
                <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                    {playlists.map((playlist) => (
                        <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                            <div className="bg-[#181818] p-2 md:p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer h-full flex flex-col">
                                <div className="relative mb-2 md:mb-4">
                                    <CoverImage
                                        src={playlist.cover_url}
                                        alt={playlist.title}
                                        className="w-full aspect-square rounded-2xl shadow-lg"
                                        fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                    />
                                    <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                                        <div className="w-8 h-8 md:w-12 md:h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                                            <Play className="fill-black text-black ml-0.5 w-4 h-4 md:w-6 md:h-6" />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold mb-0.5 md:mb-1 truncate text-xs md:text-base">{playlist.title}</h3>
                                <p className="text-[10px] md:text-sm text-[#a7a7a7] line-clamp-2">{playlist.description}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {!loading && playlists.length === 0 && (
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold mb-2">No playlists found</h2>
                    <p className="text-neutral-400">This category is empty.</p>
                </div>
            )}
        </div>
    );
}
