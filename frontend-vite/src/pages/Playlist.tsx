import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Clock, Heart, PlusCircle, Shuffle, Trash2, ArrowLeft } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { dbService, Playlist as PlaylistType } from '../services/db';
import { libraryService } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import Skeleton from '../components/Skeleton';
import { GENERATED_CONTENT } from '../data/seed_data';

type PlaylistData = PlaylistType | StaticPlaylist;

export default function Playlist() {
    const { id: playlistId } = useParams<{ id: string }>();
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true); // Full page loading
    const [loadingTracks, setLoadingTracks] = useState(false); // background track loading
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [isUserPlaylist, setIsUserPlaylist] = useState(false);

    const { playTrack, currentTrack, isPlaying, togglePlay, likedTracks, toggleLike } = usePlayer();
    const { libraryItems, userPlaylists, refreshLibrary } = useLibrary();

    useEffect(() => {
        if (!playlistId) return;

        const loadPlaylist = async () => {
            console.log("Loading playlist...", playlistId);

            // 1. FAST PATH: Check user playlists
            const userPlaylist = userPlaylists.find(p => p.id === playlistId);
            if (userPlaylist) {
                setPlaylist(userPlaylist);
                setIsUserPlaylist(true);
                setLoading(false);
                return;
            }

            // 2. FAST PATH: Check Seed/Library Data (Metadata Only)
            // Even if tracks are empty, show the header!
            const seedItem = Object.values(GENERATED_CONTENT).find(p => p.id === playlistId);
            if (seedItem) {
                setPlaylist({
                    id: seedItem.id,
                    title: seedItem.title,
                    description: seedItem.description,
                    cover_url: seedItem.cover_url,
                    tracks: seedItem.tracks || [], // Might be empty initially
                    type: 'Playlist'
                } as StaticPlaylist);
                setLoading(false); // Show header immediately

                // If populated, we are good. If not, trigger hydration.
                if (seedItem.tracks && seedItem.tracks.length > 0) {
                    return;
                }

                // Need to hydrate tracks
                setLoadingTracks(true);
            } else {
                // Not found in seed, maybe keep full loading true?
                setLoading(true);
            }

            // 3. SLOW PATH: DB or API Fetch
            try {
                // Check DB
                const dbPlaylist = await dbService.getPlaylist(playlistId);
                if (dbPlaylist) {
                    setPlaylist(dbPlaylist);
                    setIsUserPlaylist(true);
                    setLoading(false);
                    setLoadingTracks(false);
                } else {
                    // Check API / Library Service (Hydration happens here)
                    console.log("Fetching from Library Service (Hydrating)...");
                    const apiPlaylist = await libraryService.getPlaylist(playlistId);
                    if (apiPlaylist) {
                        setPlaylist(apiPlaylist);
                        setIsUserPlaylist(false);
                    }
                    setLoading(false);
                    setLoadingTracks(false);
                }
            } catch (e) {
                console.error("Error loading playlist", e);
                setLoading(false);
                setLoadingTracks(false);
            }
        };

        loadPlaylist();
    }, [playlistId, userPlaylists, libraryItems]);

    const handlePlayAll = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    const handleRemoveTrack = async (trackId: string) => {
        if (!playlist || !isUserPlaylist) return;
        await dbService.removeFromPlaylist(playlist.id, trackId);
        await refreshLibrary();
        setPlaylist(prev => prev ? { ...prev, tracks: prev.tracks.filter(t => t.id !== trackId) } : null);
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const totalDuration = playlist?.tracks.reduce((acc, t) => acc + (t.duration || 0), 0) || 0;

    // FULL PAGE SPINNER (Only if we have NO metadata at all)
    if (loading) {
        return (
            <div className="h-full overflow-y-auto no-scrollbar pb-24 animate-pulse">
                <div className="h-80 bg-gradient-to-b from-[#3a3a3a] to-[#121212] p-8 flex items-end">
                    <Skeleton className="w-48 h-48 rounded-md shadow-2xl mr-8" />
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">Playlist not found</h2>
                    <Link to="/" className="text-[#1DB954] hover:underline">Go back home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto no-scrollbar pb-24">
            {/* Hero Header (Always visible if playlist exists) */}
            <div className="h-auto md:h-80 bg-gradient-to-b from-[#535353] to-[#121212] p-4 md:p-8 flex flex-col md:flex-row items-center md:items-end animate-in fade-in duration-500 relative">
                <Link to="/library" className="absolute top-4 left-4 md:hidden">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <CoverImage
                    src={playlist.cover_url ?? undefined}
                    alt={playlist.title}
                    className="w-40 h-40 md:w-56 md:h-56 rounded-md shadow-2xl mb-4 md:mb-0 md:mr-8 mt-8 md:mt-0"
                    fallbackText={playlist.title.substring(0, 2).toUpperCase()}
                />
                <div className="text-center md:text-left">
                    <p className="text-xs font-bold uppercase tracking-wider mb-1">Playlist</p>
                    <h1 className="text-2xl md:text-6xl font-black mb-2 md:mb-4 line-clamp-2 leading-tight">{playlist.title}</h1>
                    {'description' in playlist && playlist.description && (
                        <p className="text-sm text-neutral-300 mb-2 line-clamp-2">{playlist.description}</p>
                    )}
                    <p className="text-sm text-neutral-400">
                        {/* Show 'Loading...' if caching tracks, otherwise count */}
                        {loadingTracks ? 'Updating...' : `${playlist.tracks.length} songs`}
                        {totalDuration > 0 && ` • ${Math.floor(totalDuration / 60)} min`}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-center gap-6">
                <button
                    onClick={handlePlayAll}
                    disabled={loadingTracks || playlist.tracks.length === 0}
                    className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1ed760]"
                >
                    <Play className="w-6 h-6 text-black fill-black ml-1" />
                </button>
                <button className="text-neutral-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                    <Shuffle className="w-6 h-6" />
                </button>
            </div>

            {/* Track List */}
            <div className="px-6">
                {/* Header */}
                <div className="hidden md:grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 text-sm text-neutral-400 border-b border-white/10 mb-2">
                    <span>#</span>
                    <span>TITLE</span>
                    <span>ALBUM</span>
                    <span className="flex justify-end"><Clock className="w-4 h-4" /></span>
                </div>

                {/* Loading Skeletons for Tracks */}
                {loadingTracks && playlist.tracks.length === 0 && (
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center p-2 gap-4 animate-pulse">
                                <Skeleton className="w-4 h-4" />
                                <Skeleton className="w-10 h-10 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loadingTracks && playlist.tracks.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-neutral-400 mb-4">This playlist is empty.</p>
                        <Link to="/search" className="text-[#1DB954] hover:underline">Search for music to add</Link>
                    </div>
                ) : (
                    playlist.tracks.map((track, index) => {
                        const isCurrentTrack = currentTrack?.id === track.id;
                        return (
                            <div
                                key={`${track.id}-${index}`}
                                onClick={() => playTrack(track, playlist.tracks)}
                                style={{ animationDelay: `${index * 50}ms` }} // STAGGER EFFECT
                                className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 rounded-md hover:bg-white/10 transition group cursor-pointer animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards ${isCurrentTrack ? 'bg-white/10' : ''}`}
                            >
                                {/* Track Number / Playing indicator */}
                                <div className="flex items-center">
                                    <span className={`text-sm ${isCurrentTrack ? 'text-[#1DB954]' : 'text-neutral-400'} group-hover:hidden`}>
                                        {isCurrentTrack && isPlaying ? (
                                            <div className="flex items-end gap-[2px] h-4">
                                                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-1" />
                                                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-2" />
                                                <div className="w-[3px] bg-[#1DB954] rounded-full animate-soundwave-3" />
                                            </div>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); isCurrentTrack ? togglePlay() : playTrack(track, playlist.tracks); }}
                                        className="hidden group-hover:block text-white"
                                    >
                                        {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                    </button>
                                </div>

                                {/* Cover + Info */}
                                <div className="flex items-center gap-4 min-w-0">
                                    <CoverImage
                                        src={track.cover_url}
                                        alt={track.title}
                                        className="w-10 h-10 rounded flex-shrink-0"
                                        fallbackText="♪"
                                    />
                                    <div className="min-w-0">
                                        <p className={`font-medium truncate ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                                    </div>
                                </div>

                                {/* Album */}
                                <p className="hidden md:flex items-center text-sm text-neutral-400 truncate">{track.album}</p>

                                {/* Actions + Duration */}
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                        className={`opacity-0 group-hover:opacity-100 transition ${likedTracks.has(track.id) ? 'text-[#1DB954] opacity-100' : 'text-neutral-400 hover:text-white'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedTrack(track); }}
                                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                    </button>
                                    {isUserPlaylist && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <span className="text-sm text-neutral-400 w-12 text-right">
                                        {formatDuration(track.duration)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add to Playlist Modal */}
            {selectedTrack && (
                <AddToPlaylistModal
                    track={selectedTrack}
                    isOpen={true}
                    onClose={() => setSelectedTrack(null)}
                />
            )}
        </div>
    );
}
