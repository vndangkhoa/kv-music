import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayer } from '../context/PlayerContext';
import { Play, Shuffle, Heart, Clock, ListPlus, Download } from 'lucide-react';
import { Track } from '../types';

export default function Album() {
    const { id } = useParams();
    const { playTrack, toggleLike, likedTracks } = usePlayer();
    const [tracks, setTracks] = useState<Track[]>([]);
    const [albumInfo, setAlbumInfo] = useState<{ title: string, artist: string, cover?: string, year?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        // If ID is from YTM, ideally we fetch album.
        // If logic is "Search Album", we do that.

        const fetchAlbum = async () => {
            // For now, assume ID is search query or we query "Album"
            // In this reskin, we usually pass Name as ID due to router setup in Home.

            const query = decodeURIComponent(id);
            try {
                const results = await libraryService.search(query);
                if (results.length > 0) {
                    setTracks(results);
                    setAlbumInfo({
                        title: query.replace(/^search-|^album-/, '').replace(/-/g, ' '), // Clean up slug
                        artist: results[0].artist,
                        cover: results[0].cover_url,
                        year: '2024' // Mock or fetch
                    });
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchAlbum();
    }, [id]);

    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div></div>;
    if (!albumInfo) return <div>Album not found</div>;

    const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const formattedDuration = `${Math.floor(totalDuration / 60)} minutes`;

    return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#2e2e2e] to-black pb-32">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 p-4 md:p-12 items-center md:items-end bg-gradient-to-b from-black/20 to-black/60 pt-16 md:pt-12">
                {/* Cover */}
                <div className="w-40 h-40 md:w-64 md:h-64 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden shrink-0">
                    <img src={albumInfo.cover} alt={albumInfo.title} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-4 flex-1">
                    <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-white/70">Album</span>
                    <h1 className="text-2xl md:text-6xl font-black text-white leading-tight">{albumInfo.title}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 text-white/80 font-medium text-sm md:text-base">
                        <img src={albumInfo.cover} className="w-6 h-6 rounded-full" />
                        <span className="hover:underline cursor-pointer">{albumInfo.artist}</span>
                        <span>•</span>
                        <span>{albumInfo.year}</span>
                        <span>•</span>
                        <span>{tracks.length} songs, {formattedDuration}</span>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-4 py-3 flex items-center justify-center gap-6 bg-black/20 backdrop-blur-sm sticky top-0 z-10 md:px-8">
                <button
                    onClick={() => tracks.length > 0 && playTrack(tracks[0])} // Should play all
                    className="bg-white text-black px-8 py-2 rounded-full font-bold text-sm hover:scale-105 transition flex items-center gap-2 shadow-lg hover:shadow-xl hover:bg-neutral-200"
                >
                    <Play fill="currentColor" size={18} />
                    Play
                </button>
                <div className="flex items-center gap-4">
                    <button className="p-2 text-neutral-400 hover:text-white transition border border-white/10 rounded-full hover:bg-white/10 hover:border-white">
                        <Shuffle size={20} />
                    </button>
                    <button className="p-2 text-neutral-400 hover:text-white transition border border-white/10 rounded-full hover:bg-white/10 hover:border-white">
                        <ListPlus size={20} />
                    </button>
                    <button className="p-2 text-neutral-400 hover:text-white transition border border-white/10 rounded-full hover:bg-white/10 hover:border-white">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Tracklist */}
            <div className="p-4 md:p-8">
                {/* Header Row */}
                <div className="flex items-center text-sm text-neutral-400 border-b border-white/10 pb-2 mb-4 px-4 sticky top-20 bg-[#121212] z-10">
                    <span className="w-10 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <span className="hidden md:block w-12 text-right"><Clock size={16} /></span>
                </div>

                <div className="flex flex-col">
                    {tracks.map((track, i) => (
                        <div
                            key={track.id}
                            className="group flex items-center p-3 rounded-md hover:bg-white/10 transition cursor-pointer"
                            onClick={() => playTrack(track, tracks)}
                        >
                            <span className="w-10 text-center text-neutral-500 font-medium group-hover:hidden">{i + 1}</span>
                            <Play size={16} className="w-10 hidden group-hover:block fill-white pl-2" />

                            <div className="flex-1 min-w-0 pr-4">
                                <div className="font-medium text-white truncate text-base">{track.title}</div>
                                <div className="text-sm text-neutral-400 truncate group-hover:text-white/70">{track.artist}</div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                className={`mr-6 ${likedTracks.has(track.id) ? 'text-green-500 opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100'} hover:scale-110 transition`}
                            >
                                <Heart size={18} fill={likedTracks.has(track.id) ? "currentColor" : "none"} />
                            </button>

                            <span className="text-neutral-500 text-sm hidden md:block w-12 text-right font-mono">
                                {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
