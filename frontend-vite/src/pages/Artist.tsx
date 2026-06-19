import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { libraryService } from '../services/library';
import { usePlayer } from '../context/PlayerContext';
import { Play, Shuffle, Heart, Disc, Music } from 'lucide-react';
import { Track } from '../types';
import Recommendations from '../components/Recommendations';
import { GENERATED_CONTENT } from '../data/seed_data';

interface ArtistData {
    name: string;
    photo?: string;
    topSongs: Track[];
    albums: any[]; // Extended type needed
    singles: any[];
}

export default function Artist() {
    const { id } = useParams(); // Start with name or id
    const navigate = useNavigate();
    const { playTrack, toggleLike, likedTracks, setIsFullScreenOpen, shuffle, toggleShuffle } = usePlayer();

    const [artist, setArtist] = useState<ArtistData | null>(null);
    const [loading, setLoading] = useState(true);
    const [songsLoading, setSongsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    const artistName = decodeURIComponent(id || '');

    useEffect(() => {
        if (!artistName) return;
        const liked = JSON.parse(localStorage.getItem('likedArtists') || '[]');
        setIsLiked(liked.includes(artistName));
    }, [artistName]);

    const toggleLikeArtist = () => {
        const liked = JSON.parse(localStorage.getItem('likedArtists') || '[]');
        let updated: string[];
        if (liked.includes(artistName)) {
            updated = liked.filter((name: string) => name !== artistName);
            setIsLiked(false);
        } else {
            updated = [...liked, artistName];
            setIsLiked(true);
        }
        localStorage.setItem('likedArtists', JSON.stringify(updated));
    };

    useEffect(() => {
        if (!artistName) return;

        // OPTIMISTIC LOADING START
        // 1. Try to find in Seed Data first for instant header
        // Seed data keys are names, but IDs are "artist-Name"
        const seedArtist = Object.values(GENERATED_CONTENT).find(
            item => item.id === id || item.title === artistName || item.id === `artist-${artistName.replace(/ /g, '-')}`
        );

        if (seedArtist) {
            setArtist({
                name: seedArtist.title,
                photo: seedArtist.cover_url,
                topSongs: [], // Will load
                albums: [],
                singles: []
            });
            setLoading(false); // Show UI immediately!
        } else {
            setLoading(true); // Only blocking load if we have ZERO data
        }

        const fetchData = async () => {
            setSongsLoading(true);
            // Fetch info (Background)
            // If we already have photo from seed, maybe skip or update?
            // libraryService.getArtistInfo might find a better photo or same.

            // Parallel Fetch for speed
            const [info, songs] = await Promise.allSettled([
                !seedArtist?.cover_url ? libraryService.getArtistInfo(artistName) : Promise.resolve({ photo: seedArtist.cover_url }),
                libraryService.search(artistName)
            ]);

            setSongsLoading(false);

            const finalPhoto = (info.status === 'fulfilled' && info.value?.photo) ? info.value.photo : seedArtist?.cover_url;
            
            // Ensure we always have a photo - if somehow still empty, use UI-Avatars
            const safePhoto = finalPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=random&color=fff&size=200&rounded=true&bold=true&font-size=0.33`;
            let topSongs = (songs.status === 'fulfilled') ? songs.value : [];

            if (topSongs.length > 20) topSongs = topSongs.slice(0, 20);

            setArtist({
                name: artistName,
                photo: safePhoto,
                topSongs,
                albums: [],
                singles: []
            });
            setLoading(false);
        };

        fetchData();
    }, [artistName, id]);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
        </div>
    );

    if (!artist) return <div>Artist not found</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-black pb-32">
            {/* Header / Banner */}
            <div className="relative h-[40vh] min-h-[300px] w-full group">
                {artist.photo && (
                    <div className="absolute inset-0">
                        <img src={artist.photo} alt={artist.name} className="w-full h-full object-cover opacity-60 mask-gradient-b" />
                        <div className="absolute inset-0 bg-black/40" />
                    </div>
                )}

                <div className="absolute bottom-0 left-0 p-4 md:p-8 w-full">
                    <h1 className="text-3xl md:text-7xl font-bold mb-4 md:mb-6 tracking-tight text-white drop-shadow-lg">{artist.name}</h1>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    playTrack(artist.topSongs[0], artist.topSongs);
                                }
                            }}
                            className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition flex items-center gap-2"
                        >
                            <Play fill="currentColor" size={20} />
                            Play
                        </button>
                        <button
                            onClick={() => {
                                if (artist.topSongs.length > 0) {
                                    if (!shuffle) toggleShuffle();
                                    const randomIndex = Math.floor(Math.random() * artist.topSongs.length);
                                    playTrack(artist.topSongs[randomIndex], artist.topSongs);
                                }
                            }}
                            className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-lg hover:bg-white/20 transition border border-white/20 flex items-center gap-2"
                        >
                            <Shuffle size={20} className={shuffle ? "text-red-500" : ""} />
                            Shuffle
                        </button>
                        <button
                            onClick={toggleLikeArtist}
                            className={`p-3 rounded-full transition border flex items-center justify-center ${
                                isLiked
                                    ? 'bg-[#FF0000] border-[#FF0000] text-white hover:bg-[#CC0000]'
                                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                            }`}
                        >
                            <Heart size={24} className={isLiked ? 'fill-current text-white' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-8 space-y-8 md:space-y-12 max-w-7xl mx-auto">
                {/* Top Songs */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Top Songs</h2>
                    <div className="flex flex-col gap-2">
                        {songsLoading ? (
                            // Skeleton Loading for Songs
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center p-3 gap-4 animate-pulse">
                                    <div className="w-8 h-4 bg-white/10 rounded" />
                                    <div className="w-12 h-12 bg-white/10 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-1/3 h-4 bg-white/10 rounded" />
                                        <div className="w-1/4 h-3 bg-white/10 rounded" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            artist.topSongs.map((track, i) => (
                                <div
                                    key={track.id}
                                    className="group flex items-center p-3 rounded-md hover:bg-white/10 transition cursor-pointer"
                                    onClick={() => playTrack(track, artist.topSongs)}
                                >
                                    <span className="w-8 text-center text-neutral-500 font-medium group-hover:hidden">{i + 1}</span>
                                    <Play size={16} className="w-8 hidden group-hover:block fill-white" />

                                    <img src={track.cover_url} alt="Cover" className="w-12 h-12 rounded-lg mx-4 object-cover" />

                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{track.title}</div>
                                        <div className="text-sm text-neutral-400 truncate">{track.artist} • {track.album || 'Single'}</div>
                                    </div>

                                    <span className="text-neutral-500 text-sm hidden md:block mr-8">
                                        {Math.floor((track.duration || 0) / 60)}:{((track.duration || 0) % 60).toString().padStart(2, '0')}
                                    </span>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                        className={`${likedTracks.has(track.id) ? 'text-green-500 opacity-100' : 'text-neutral-400 opacity-0 group-hover:opacity-100'} hover:scale-110 transition`}
                                    >
                                        <Heart size={18} fill={likedTracks.has(track.id) ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            )))}
                    </div>
                </section>

                 {/* Albums (Mock UI for now as strict album search is hard with yt-dlp only) */}
                 <section>
                     <div className="flex items-center justify-between mb-6">
                         <h2 className="text-2xl font-bold">Albums</h2>
                         <button className="text-sm font-bold text-neutral-400 hover:text-white uppercase tracking-wider">See All</button>
                     </div>
                     {/* Placeholder Logic: Show top song covers as "Albums" for visual parity if no real albums */}
                     <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                        {artist.topSongs.slice(0, 5).map((track) => (
                            <div
                                key={track.id}
                                className="group cursor-pointer"
                                onClick={() => {
                                    playTrack(track, [track]);
                                }}
                            >
                                <div className="aspect-square bg-neutral-900 rounded-2xl overflow-hidden mb-3 relative">
                                    <img src={track.cover_url} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <div className="bg-white text-black p-3 rounded-full hover:scale-110 transition">
                                            <Play fill="currentColor" size={24} />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold truncate text-white">{track.album || track.title}</h3>
                                <div className="flex items-center gap-1 text-sm text-neutral-400">
                                    <Disc size={14} />
                                    <span>Album</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                 {/* Singles */}
                 <section>
                     <h2 className="text-2xl font-bold mb-6">Singles</h2>
                     <div className="grid grid-cols-3 fold:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                        {artist.topSongs.slice(0, 4).reverse().map((track) => (
                            <div
                                key={track.id}
                                className="group cursor-pointer"
                                onClick={() => {
                                    playTrack(track, [track]);
                                }}
                            >
                                <div className="aspect-square bg-neutral-900 rounded-2xl overflow-hidden mb-3 relative border-2 border-neutral-800">
                                    <img src={track.cover_url} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <div className="bg-white text-black p-3 rounded-full hover:scale-110 transition">
                                            <Play fill="currentColor" size={24} />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold truncate text-center text-white">{track.title}</h3>
                                <div className="flex items-center justify-center gap-1 text-sm text-neutral-400">
                                    <Music size={14} />
                                    <span>Single</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>


            </div>
        </div>
    );
}
