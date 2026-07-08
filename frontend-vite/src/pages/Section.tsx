import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Play, ArrowLeft } from 'lucide-react';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlayerStore } from '../stores/playerStore';
import { libraryService } from '../services/library';
import CoverImage from '../components/CoverImage';
import Skeleton from '../components/Skeleton';

export default function Section() {
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const [loading, setLoading] = useState(true);
    const playTrack = usePlayerStore(s => s.playTrack);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setLoading(false), 300);
        return () => clearTimeout(timer);
    }, [category]);

    const playCollection = async (playlistId: string) => {
        try {
            const playlist = await libraryService.getPlaylist(playlistId);
            if (playlist && playlist.tracks.length > 0) {
                playTrack(playlist.tracks[0], playlist.tracks);
            }
        } catch (e) {
            console.error("Failed to play playlist from section", e);
        }
    };

    const playlists = userPlaylists;

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
                         <div key={i} className="bg-[#1f1f1f]/30 p-3 rounded-2xl border border-white/5 space-y-3">
                             <Skeleton className="w-full aspect-square rounded-xl animate-pulse" />
                             <Skeleton className="h-4 w-3/4 animate-pulse" />
                             <Skeleton className="h-3 w-1/2 animate-pulse" />
                         </div>
                     ))}
                 </div>
              ) : (
                <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                    {playlists.map((playlist) => (
                        <Link to={`/playlist/${playlist.id}`} key={playlist.id}>
                            <div className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer h-full flex flex-col border border-white/5 justify-between">
                                <div>
                                    <div className="relative mb-3">
                                        <CoverImage
                                            src={playlist.cover_url}
                                            alt={playlist.title}
                                            className="w-full aspect-square rounded-xl shadow-lg"
                                            fallbackText={playlist.title?.substring(0, 2).toUpperCase()}
                                        />
                                        <div
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                playCollection(playlist.id);
                                            }}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center"
                                        >
                                            <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                                <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-white mb-1 truncate text-xs md:text-base">{playlist.title}</h3>
                                    <p className="text-neutral-400 text-xs md:text-sm line-clamp-2">{playlist.description}</p>
                                </div>
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
