import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, Clock, Heart, PlusCircle, Shuffle, Trash2, ArrowLeft } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { dbService, Playlist as PlaylistType } from '../services/db';
import { libraryService, streamUrl } from '../services/library';
import { Track, StaticPlaylist } from '../types';
import CoverImage from '../components/CoverImage';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import DownloadMenu from '../components/DownloadMenu';
import Skeleton from '../components/Skeleton';
import Recommendations from '../components/Recommendations';
import { GENERATED_CONTENT } from '../data/seed_data';

type PlaylistData = PlaylistType | StaticPlaylist;

export default function Playlist() {
    const { id: playlistId } = useParams<{ id: string }>();
    const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
    const [loading, setLoading] = useState(true); // Full page loading
    const [loadingTracks, setLoadingTracks] = useState(false); // background track loading
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [isUserPlaylist, setIsUserPlaylist] = useState(false);
    const [moreLikeThis, setMoreLikeThis] = useState<Track[]>([]);

    const playTrack = usePlayerStore(s => s.playTrack);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const likedTracks = usePlayerStore(s => s.likedTracks);
    const toggleLike = usePlayerStore(s => s.toggleLike);
    const setIsFullScreenOpen = usePlayerStore(s => s.setIsFullScreenOpen);
    const shuffle = usePlayerStore(s => s.shuffle);
    const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
    const userPlaylists = useLibraryStore(s => s.userPlaylists);
    const refreshLibrary = useLibraryStore(s => s.refreshLibrary);

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
            await hydrateTracks(playlistId);
        };

        const hydrateTracks = async (id: string, attempt = 0) => {
            try {
                // Check DB
                const dbPlaylist = await dbService.getPlaylist(id);
                if (dbPlaylist) {
                    setPlaylist(dbPlaylist);
                    setIsUserPlaylist(true);
                    setLoading(false);
                    setLoadingTracks(false);
                    try {
                        const recs = await libraryService.search(dbPlaylist.title);
                        setMoreLikeThis(recs.slice(0, 10));
                    } catch (e) { }
                    return;
                }

                // Check API / Library Service (Hydration happens here)
                console.log("Fetching from Library Service (Hydrating)...");
                const apiPlaylist = await libraryService.getPlaylist(id);
                if (apiPlaylist && apiPlaylist.tracks.length > 0) {
                    // Normalize track IDs - extract YouTube video ID from discovery-* IDs
                    const normalizedTracks = apiPlaylist.tracks.map((track: Track) => {
                        let videoId = track.id;
                        if (track.id.includes('discovery-') || track.id.includes('artist-')) {
                            const parts = track.id.split('-');
                            for (const part of parts) {
                                if (part.length === 11 && /^[a-zA-Z0-9_-]+$/.test(part)) {
                                    videoId = part;
                                    break;
                                }
                            }
                        }
                        return { ...track, id: videoId, url: `${streamUrl(videoId)}` };
                    });
                    const normalizedPlaylist = { ...apiPlaylist, tracks: normalizedTracks };
                    setPlaylist(normalizedPlaylist);
                    setIsUserPlaylist(false);
                    setLoading(false);

                    try {
                        const query = apiPlaylist.title.replace(' Mix', '');
                        const recs = await libraryService.search(query);
                        const currentIds = new Set(normalizedTracks.map((t: Track) => t.id));
                        setMoreLikeThis(recs.filter(t => !currentIds.has(t.id)).slice(0, 10));
                    } catch (e) { }
                } else if (attempt < 3) {
                    // Retry with delay if no tracks found (browse data may need time)
                    console.log(`Hydration attempt ${attempt + 1} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1500));
                    await hydrateTracks(id, attempt + 1);
                } else {
                    // Final fallback: try searching by the title directly
                    const seedItem = Object.values(GENERATED_CONTENT).find(p => p.id === id);
                    const searchQuery = seedItem?.title || apiPlaylist?.title || id.replace(/^discovery-(playlist|album|artist)-/, '').replace(/-/g, ' ');
                    try {
                        const fallbackTracks = await libraryService.search(searchQuery);
                        if (fallbackTracks.length > 0) {
                            const normalizedTracks = fallbackTracks.map((track: Track) => ({
                                ...track,
                                id: track.id.replace(/^discovery-(playlist|album|artist)-/, ''),
                                url: `${streamUrl(track.id)}`
                            }));
                            setPlaylist({
                                id,
                                title: searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1).replace(/(.{40}).*/, '$1...'),
                                tracks: normalizedTracks,
                                cover_url: apiPlaylist?.cover_url || normalizedTracks[0]?.cover_url,
                                type: 'Playlist'
                            } as StaticPlaylist);
                        }
                    } catch (e) {}
                    setLoading(false);
                }
                setLoadingTracks(false);
            } catch (e) {
                console.error("Error loading playlist", e);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, 1500));
                    await hydrateTracks(id, attempt + 1);
                } else {
                    setLoading(false);
                    setLoadingTracks(false);
                }
            }
        };

        loadPlaylist();
    }, [playlistId, userPlaylists]);

    const handlePlayAll = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    const handleRemoveTrack = async (trackId: string) => {
        if (!playlist || !isUserPlaylist) return;
        await dbService.removeFromPlaylist(playlist.id, trackId);
        await refreshLibrary();
        setPlaylist((prev: PlaylistData | null) => prev ? { ...prev, tracks: prev.tracks.filter((t: Track) => t.id !== trackId) } : null);
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const totalDuration = playlist?.tracks.reduce((acc: number, t: Track) => acc + (t.duration || 0), 0) || 0;

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
                    <Link to="/" className="text-[#FF0000] hover:underline">Go back home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#030303] no-scrollbar pb-32 relative">
            {/* Banner Background */}
            {playlist.cover_url && (
                <div
                    className="absolute top-0 left-0 w-full h-[50vh] min-h-[400px] opacity-30 pointer-events-none"
                    style={{
                        backgroundImage: `url(${playlist.cover_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
                    }}
                />
            )}

            {/* Hero Header */}
            <div className="relative z-10 flex flex-col md:flex-row p-4 md:p-12 items-center md:items-end pt-16 md:pt-16 gap-6 md:gap-8">
                <Link to="/library" className="absolute top-4 left-4 md:hidden">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div
                    className="w-48 h-48 md:w-64 md:h-64 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden shrink-0 cursor-pointer group/cover relative"
                    onClick={() => {
                        if (playlist && playlist.tracks.length > 0) {
                            playTrack(playlist.tracks[0], playlist.tracks);
                            setIsFullScreenOpen(true);
                        }
                    }}
                >
                    <CoverImage
                        src={playlist.cover_url ?? undefined}
                        alt={playlist.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-110"
                        fallbackText={playlist.title.substring(0, 2).toUpperCase()}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/cover:opacity-100 transition flex items-center justify-center">
                        <Play fill="white" size={48} className="text-white drop-shadow-2xl" />
                    </div>
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 md:gap-3 flex-1">
                    <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-white/70">Playlist</span>
                    <h1 className="text-2xl md:text-6xl font-black text-white leading-tight line-clamp-2">{playlist.title}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 text-white/80 font-medium text-sm md:text-base mt-1 md:mt-2">
                        {'description' in playlist && playlist.description && (
                            <span className="text-neutral-300">{playlist.description}</span>
                        )}
                        <span className="text-white/40">•</span>
                        <span className="text-white/80">
                            {loadingTracks ? 'Updating...' : `${playlist.tracks.length} songs`}
                        </span>
                        {totalDuration > 0 && (
                            <>
                                <span className="text-white/40">•</span>
                                <span className="text-white/60">{Math.floor(totalDuration / 60)} min</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex items-center justify-center gap-6">
                <button
                    onClick={handlePlayAll}
                    disabled={loadingTracks || !playlist || playlist.tracks.length === 0}
                    className="w-14 h-14 bg-[#FF0000] text-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                </button>
                <button
                    onClick={() => {
                        if (playlist && playlist.tracks.length > 0) {
                            if (!shuffle) toggleShuffle();
                            const randomIndex = Math.floor(Math.random() * playlist.tracks.length);
                            playTrack(playlist.tracks[randomIndex], playlist.tracks);
                        }
                    }}
                    disabled={loadingTracks || !playlist || playlist.tracks.length === 0}
                    className={`transition p-2 hover:bg-white/10 rounded-full disabled:opacity-50 ${shuffle ? 'text-[#FF0000]' : 'text-neutral-400 hover:text-white'}`}
                    title="Shuffle"
                >
                    <Shuffle className="w-6 h-6" />
                </button>
                <DownloadMenu
                    tracks={playlist.tracks}
                    label="Download"
                    className="px-4 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition disabled:opacity-50 text-sm font-semibold"
                    iconClassName="w-4 h-4"
                />
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
                        <Link to="/search" className="text-[#FF0000] hover:underline">Search for music to add</Link>
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
                                    <span className={`text-sm ${isCurrentTrack ? 'text-[#FF0000]' : 'text-neutral-400'} group-hover:hidden`}>
                                        {isCurrentTrack && isPlaying ? (
                                            <div className="flex items-end gap-[2px] h-4">
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-1" />
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-2" />
                                                <div className="w-[3px] bg-[#FF0000] rounded-full animate-soundwave-3" />
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
                                        className="w-10 h-10 rounded-lg flex-shrink-0"
                                        fallbackText="♪"
                                    />
                                    <div className="min-w-0">
                                        <p className={`font-medium truncate ${isCurrentTrack ? 'text-[#FF0000]' : 'text-white'}`}>{track.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                                    </div>
                                </div>

                                {/* Album */}
                                <p className="hidden md:flex items-center text-sm text-neutral-400 truncate">{track.album}</p>

                                {/* Actions + Duration */}
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                                        className={`opacity-0 group-hover:opacity-100 transition ${likedTracks.has(track.id) ? 'text-[#FF0000] opacity-100' : 'text-neutral-400 hover:text-white'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${likedTracks.has(track.id) ? 'fill-[#FF0000]' : ''}`} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedTrack(track); }}
                                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                    </button>
                                    <DownloadMenu
                                        tracks={[track]}
                                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition"
                                        iconClassName="w-4 h-4"
                                    />
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

            {/* Suggestions / More like this */}
            {moreLikeThis.length > 0 && (
                <div className="p-4 md:p-8 mt-4 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold hover:underline cursor-pointer">More like this</h2>
                    </div>
                    <div className="grid grid-cols-2 fold:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-2">
                        {moreLikeThis.map((track) => (
                            <div
                                className="bg-[#1f1f1f]/30 p-3 rounded-2xl hover:bg-[#1f1f1f]/85 transition duration-300 group cursor-pointer relative flex flex-col border border-white/5"
                                key={track.id}
                                onClick={() => {
                                    playTrack(track, moreLikeThis);
                                }}
                            >
                                <div className="relative mb-3">
                                    <img src={track.cover_url} className="w-full aspect-square rounded-xl shadow-lg object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition active:scale-95">
                                            <Play className="fill-current text-black ml-0.5 w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                <h3 className="font-bold text-white text-sm mb-1 truncate">{track.title}</h3>
                                <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Related Content Recommendations */}
            {playlist && (
                <Recommendations
                    seed={playlist.title}
                    seedType="playlist"
                    limit={10}
                    title="Related Playlists & Songs"
                    showTracks={true}
                    showAlbums={true}
                    showPlaylists={true}
                />
            )}

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
